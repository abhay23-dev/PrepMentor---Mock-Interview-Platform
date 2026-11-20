import axios from "axios";
import { create } from "zustand";
import { gdService } from "@/services/gdService";
import type {
  GDMessageItem,
  GDStore,
  GDStoreState,
  NextTurnResponse,
  SendMessageResponse,
} from "@/types/gd.types";
import {
  cancelAllSpeech,
  isSTTSupported,
  listenForSpeech,
  loadVoices,
  sleep,
  speakCue,
  speakText,
} from "@/utils/speech";
import type { ListenHandle } from "@/utils/speech";

const WRAP_UP_SECONDS = 30;
const TYPED_TURN_TIMEOUT_MS = 60000; // how long we wait for a typed reply

const initialState: GDStoreState = {
  sessionId: null,
  topic: "",
  userName: "You",
  timerDuration: 0,
  personas: [],
  messages: [],
  feedback: null,

  phase: "IDLE",
  remainingSeconds: 0,
  wrapUpWarned: false,

  activeSpeakerId: null,
  isThinking: false,
  isUserTurn: false,
  isListening: false,
  interimText: "",
  micError: null,

  needsGesture: false,
  isStarting: false,
  error: null,
};

// ---------------------------------------------------------------------------
// Runtime handles. These are NOT React state: they are the live objects the
// discussion loop needs (timers, the mic, the current utterance). Keeping them
// at module level means they survive component re-renders and StrictMode's
// double-mount in development.
// ---------------------------------------------------------------------------
let runId = 0; // bumping this cancels whatever loop is currently running
let loopActive = false;
let endsAt = 0; // epoch ms when the timer hits zero (derived from the server)
let timerId: ReturnType<typeof setInterval> | null = null;
let typedTimeoutId: ReturnType<typeof setTimeout> | null = null;
let userTurn: { finish: (text?: string) => void } | null = null;
let activeListener: ListenHandle | null = null;
let cancelSpeech: (() => void) | null = null;
let loadingId: string | null = null;

const errorMessage = (error: unknown, fallback: string) =>
  axios.isAxiosError(error)
    ? (error.response?.data?.error ?? fallback)
    : fallback;

const isConflict = (error: unknown) =>
  axios.isAxiosError(error) && error.response?.status === 409;

const secondsLeft = () => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));

type LoopOutcome = "finished" | "error" | "cancelled";

export const useGDStore = create<GDStore>((set, get) => {
  const appendMessage = (message: GDMessageItem) =>
    set((state) => ({ messages: [...state.messages, message] }));

  const clearTimer = () => {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  };

  // Stops everything that could still be running: loop, timer, speech, mic.
  const teardownRuntime = () => {
    runId += 1; // invalidates the running loop
    loopActive = false;
    clearTimer();

    if (typedTimeoutId) {
      clearTimeout(typedTimeoutId);
      typedTimeoutId = null;
    }

    cancelAllSpeech();
    cancelSpeech?.();
    cancelSpeech = null;

    activeListener?.abort();
    activeListener = null;

    // Resolve a pending user turn so the (now cancelled) loop can unwind.
    const pendingTurn = userTurn;
    userTurn = null;
    pendingTurn?.finish("");
  };

  const onTimeUp = () => {
    // Cut off the AI line being spoken and flush whatever the user has said.
    cancelSpeech?.();
    if (userTurn) {
      if (activeListener) activeListener.stop();
      else userTurn.finish();
    }
  };

  const startTimer = (myRun: number) => {
    clearTimer();
    timerId = setInterval(() => {
      if (runId !== myRun) return;

      const remaining = secondsLeft();
      set({ remainingSeconds: remaining });

      if (remaining <= WRAP_UP_SECONDS && remaining > 0 && !get().wrapUpWarned) {
        set({ wrapUpWarned: true });
        speakCue("Thirty seconds left. Please start wrapping up.");
      }

      if (remaining <= 0) {
        clearTimer();
        onTimeUp();
      }
    }, 1000);
  };

  // Resolves with the user's text ("" means they skipped / said nothing).
  const runUserTurn = (myRun: number): Promise<string> =>
    new Promise<string>((resolve) => {
      let done = false;
      let listener: ListenHandle | null = null;
      let listenerFailed = false;

      const finish = (text?: string) => {
        if (done) return;
        done = true;

        if (typedTimeoutId) {
          clearTimeout(typedTimeoutId);
          typedTimeoutId = null;
        }

        const finalText = (text ?? listener?.getText() ?? "").trim();
        listener?.abort();
        listener = null;
        activeListener = null;
        userTurn = null;

        if (runId === myRun) {
          set({
            isUserTurn: false,
            isListening: false,
            interimText: "",
            activeSpeakerId: null,
          });
        }
        resolve(finalText);
      };

      const waitForTypedReply = () => {
        if (typedTimeoutId) clearTimeout(typedTimeoutId);
        typedTimeoutId = setTimeout(() => finish(""), TYPED_TURN_TIMEOUT_MS);
      };

      userTurn = { finish };
      set({
        isUserTurn: true,
        activeSpeakerId: "user",
        interimText: "",
        micError: null,
      });

      if (!isSTTSupported()) {
        waitForTypedReply();
        return;
      }

      listener = listenForSpeech({
        onStart: () => set({ isListening: true }),
        onInterim: (text) => set({ interimText: text }),
        onError: (code) =>
          set({
            micError:
              code === "not-allowed" || code === "service-not-allowed"
                ? "Microphone access is blocked. Allow it in your browser, or type your reply."
                : "Voice input isn't working right now. You can type your reply instead.",
          }),
        onEnd: (text, reason) => {
          if (done) return;
          if (reason === "error") {
            // Mic unusable: keep the turn open for a typed reply.
            listenerFailed = true;
            listener = null;
            activeListener = null;
            set({ isListening: false });
            waitForTypedReply();
            return;
          }
          finish(text);
        },
      });

      if (listenerFailed) {
        listener = null;
      } else {
        activeListener = listener;
      }
    });

  const runLoop = async (myRun: number): Promise<LoopOutcome> => {
    const alive = () => runId === myRun;
    const sessionId = get().sessionId;
    if (!sessionId) return "error";

    // The next turn is requested while the current AI line is still being
    // spoken, so by the time the audio ends the next line is usually ready.
    let pending: Promise<NextTurnResponse> | null = null;
    let failures = 0;

    while (alive()) {
      if (secondsLeft() <= 0) return "finished";

      // ---- 1. get the next turn ----
      let turn: NextTurnResponse;
      try {
        set({ isThinking: true });
        const source: Promise<NextTurnResponse> =
          pending ?? gdService.nextTurn(sessionId);
        pending = null;
        turn = await source;
      } catch (error) {
        pending = null;
        if (!alive()) return "cancelled";
        if (isConflict(error)) {
          await sleep(500);
          continue;
        }
        failures += 1;
        if (failures > 2) {
          set({
            isThinking: false,
            error: errorMessage(
              error,
              "Lost connection to the discussion. Check your internet and resume.",
            ),
          });
          return "error";
        }
        await sleep(800 * failures);
        continue;
      }

      failures = 0;
      set({ isThinking: false });
      if (!alive()) return "cancelled";
      if (turn.finished || secondsLeft() <= 0) return "finished";

      // ---- 2a. the user's turn ----
      if (turn.speaker === "user") {
        const text = await runUserTurn(myRun);
        if (!alive()) return "cancelled";
        if (!text && secondsLeft() <= 0) return "finished";

        if (text) {
          appendMessage({
            id: `local-${Date.now()}`,
            speaker: "user",
            speakerName: get().userName,
            text,
            timestamp: new Date().toISOString(),
          });
        }

        let response: SendMessageResponse | null = null;
        let lastError: unknown = null;
        for (let attempt = 0; attempt < 3 && alive() && !response; attempt++) {
          try {
            response = await gdService.sendMessage(
              sessionId,
              text ? { text } : { skipped: true },
            );
          } catch (error) {
            lastError = error;
            await sleep(600 * (attempt + 1));
          }
        }
        if (!alive()) return "cancelled";
        if (!response) {
          set({
            error: errorMessage(
              lastError,
              "Couldn't send your reply. Check your connection and resume.",
            ),
          });
          return "error";
        }

        // sendMessage already returned the next turn: no extra round trip.
        pending = response.nextTurn ? Promise.resolve(response.nextTurn) : null;
        continue;
      }

      // ---- 2b. an AI participant's turn ----
      const persona = get().personas.find((p) => p.id === turn.speaker);
      const lineText = turn.text ?? "";

      appendMessage({
        id: turn.messageId ?? `ai-${Date.now()}`,
        speaker: turn.speaker ?? "",
        speakerName: turn.speakerName ?? persona?.name ?? "Participant",
        text: lineText,
        timestamp: new Date().toISOString(),
      });
      set({ activeSpeakerId: turn.speaker ?? null });

      // Prefetch the following turn while this one is being spoken.
      const prefetch = gdService.nextTurn(sessionId);
      prefetch.catch(() => undefined); // real handling happens when awaited
      pending = prefetch;

      const speech = speakText(lineText, {
        voiceIndex: persona?.voiceIndex ?? 0,
      });
      cancelSpeech = speech.cancel;
      await speech.promise;
      cancelSpeech = null;

      if (alive()) set({ activeSpeakerId: null });
    }

    return "cancelled";
  };

  const runLoopSafely = async (myRun: number) => {
    let outcome: LoopOutcome;
    try {
      outcome = await runLoop(myRun);
    } catch (error) {
      console.error("Group discussion loop crashed:", error);
      if (runId === myRun) {
        set({ error: "Something went wrong during the discussion." });
      }
      outcome = "error";
    }

    if (runId !== myRun) return; // someone else took over (or we were stopped)

    if (outcome === "finished") {
      await get().endSession();
    } else if (outcome === "error") {
      teardownRuntime();
      set({
        phase: "READY",
        needsGesture: true,
        isThinking: false,
        isUserTurn: false,
        isListening: false,
        activeSpeakerId: null,
        interimText: "",
      });
    }
  };

  return {
    ...initialState,

    startSession: async (topic, numParticipants, timerDuration) => {
      teardownRuntime();
      set({ ...initialState, isStarting: true });

      try {
        const data = await gdService.startSession({
          topic,
          numParticipants,
          timerDuration,
        });

        endsAt = Date.now() + data.remainingSeconds * 1000;
        set({
          sessionId: data.sessionId,
          topic: data.topic,
          userName: data.userName,
          timerDuration: data.timerDuration,
          personas: data.personas,
          messages: [],
          feedback: null,
          phase: "READY",
          remainingSeconds: data.remainingSeconds,
          wrapUpWarned: false,
          // The user just clicked "Start", so audio is already allowed.
          needsGesture: false,
        });
        void loadVoices();
        return data.sessionId;
      } catch (error) {
        set({
          error: errorMessage(error, "Failed to start the group discussion."),
        });
        throw error;
      } finally {
        set({ isStarting: false });
      }
    },

    loadSession: async (sessionId) => {
      if (loadingId === sessionId) return;
      loadingId = sessionId;

      teardownRuntime();
      set({ ...initialState, phase: "LOADING" });

      try {
        const data = await gdService.getSession(sessionId);
        const finished = data.status === "COMPLETED";

        endsAt = Date.now() + data.remainingSeconds * 1000;
        set({
          sessionId: data.id,
          topic: data.topic,
          userName: data.userName,
          timerDuration: data.timerDuration,
          personas: data.personas,
          messages: data.messages,
          feedback: data.feedback,
          phase: finished ? "FINISHED" : "READY",
          remainingSeconds: finished ? 0 : data.remainingSeconds,
          wrapUpWarned: data.remainingSeconds <= WRAP_UP_SECONDS,
          // After a reload the browser needs a click before audio / mic work.
          needsGesture: true,
        });
        if (!finished) void loadVoices();
      } catch (error) {
        set({
          phase: "IDLE",
          error: errorMessage(error, "Couldn't load this group discussion."),
        });
      } finally {
        loadingId = null;
      }
    },

    // Safe to call repeatedly (e.g. StrictMode double effects): it no-ops if
    // the loop is already running.
    begin: () => {
      const { sessionId, phase } = get();
      if (
        !sessionId ||
        loopActive ||
        phase === "FINISHED" ||
        phase === "ENDING" ||
        phase === "LOADING"
      ) {
        return;
      }

      loopActive = true;
      const myRun = ++runId;

      set({
        phase: "RUNNING",
        needsGesture: false,
        error: null,
        remainingSeconds: secondsLeft(),
      });
      void loadVoices();
      startTimer(myRun);
      void runLoopSafely(myRun);
    },

    // Called when the session page unmounts: stop audio, mic and the loop.
    stopLoop: () => {
      teardownRuntime();
      set((state) => ({
        activeSpeakerId: null,
        isThinking: false,
        isUserTurn: false,
        isListening: false,
        interimText: "",
        phase: state.phase === "RUNNING" ? "READY" : state.phase,
        needsGesture: state.phase === "RUNNING" ? true : state.needsGesture,
      }));
    },

    // "Done speaking" button.
    finishSpeaking: () => {
      if (activeListener) activeListener.stop();
      else userTurn?.finish();
    },

    skipTurn: () => {
      userTurn?.finish("");
    },

    skipSpeech: () => {
      cancelSpeech?.();
    },

    submitTyped: (text) => {
      const trimmed = text.trim();
      if (trimmed) userTurn?.finish(trimmed);
    },

    endSession: async () => {
      const { sessionId, phase } = get();
      if (!sessionId || phase === "FINISHED") return;

      teardownRuntime();
      set({
        phase: "ENDING",
        error: null,
        isThinking: false,
        isUserTurn: false,
        isListening: false,
        activeSpeakerId: null,
        interimText: "",
      });

      try {
        const feedback = await gdService.endSession(sessionId);
        set({ feedback, phase: "FINISHED" });
      } catch (error) {
        // Stay in ENDING with `error` set; the page offers a retry button.
        set({
          error: errorMessage(
            error,
            "Couldn't generate your feedback. Please retry.",
          ),
        });
      }
    },

    reset: () => {
      teardownRuntime();
      set({ ...initialState });
    },
  };
});
