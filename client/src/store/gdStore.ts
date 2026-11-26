import axios from "axios";
import { create } from "zustand";
import { gdService } from "@/services/gdService";
import type {
  GDMessageItem,
  GDPersona,
  GDStore,
  GDStoreState,
  InterruptedInfo,
  NextTurnResponse,
  SendMessageResponse,
} from "@/types/gd.types";
import {
  cancelAllSpeech,
  createContinuousListener,
  echoOverlap,
  isSTTSupported,
  loadVoices,
  sleep,
  speakCue,
  speakSequence,
  splitSentences,
} from "@/utils/speech";
import type { ContinuousListener, SequenceHandle } from "@/utils/speech";

const WRAP_UP_SECONDS = 30;

// ---------------------------------------------------------------------------
// Tuning. Everything that shapes how interruptions *feel* lives here.
// ---------------------------------------------------------------------------
export const gdTuning = {
  silenceCommitMs: 1600, // a pause this long ends the user's turn
  minBargeInWords: 3, // words before speech counts as an interruption (filters coughs / echo bits)
  reactionMinMs: 200, // a yielding AI stops this long after being interrupted...
  reactionMaxMs: 450, // ...(random in this range, so it doesn't feel robotic)
  holdGraceMs: 1800, // an AI that holds the floor gives way after this much continued user speech
  holdHardCutMs: 3500, // and is cut off outright after this much
  pauseMinMs: 350, // natural gap between two AI lines
  pauseMaxMs: 900,
  inviteWaitMs: 6000, // how long an AI waits after asking the user a direct question
  echoThreshold: 0.6, // share of heard words that match the AI's own line => treat as echo
  echoWindowMs: 3000, // an AI's voice can still be "heard" this long after it stops
};

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
  wantsToSpeakId: null,
  isThinking: false,
  userSpeaking: false,
  talkingOver: false,
  invitingUser: false,
  isListening: false,
  interimText: "",
  micError: null,
  bargeInEnabled: true,

  needsGesture: false,
  isStarting: false,
  error: null,
};

// ---------------------------------------------------------------------------
// Runtime state. NOT React state: the live objects the discussion needs
// (timers, mic, the line being spoken). Module level so it survives re-renders
// and StrictMode's double mount in development.
// ---------------------------------------------------------------------------

interface ActiveLine {
  turn: NextTurnResponse;
  persona: GDPersona | undefined;
  text: string;
  seq: SequenceHandle;
  finished: Promise<void>; // resolves once the line's bookkeeping is done
  pendingCut: "user" | "ai" | null; // who asked for the line to stop early
  bargeIn: boolean; // the user has already tried to talk over this line
  timers: ReturnType<typeof setTimeout>[];
}

let runId = 0; // bumping this cancels whatever loop is currently running
let loopActive = false;
let endsAt = 0; // epoch ms when the timer hits zero (derived from the server)
let timerId: ReturnType<typeof setInterval> | null = null;
let loadingId: string | null = null;

let currentLine: ActiveLine | null = null; // the AI line being spoken right now
let lastLineText = "";
let lastLineEndedAt = 0;
let userSpeechSince: number | null = null; // when the user started talking
let commitsInFlight = 0; // user messages being sent to the server
let commitChain: Promise<void> = Promise.resolve();
let pending: Promise<NextTurnResponse> | null = null; // prefetched next AI line
let unspokenIds: string[] = []; // generated lines that were never spoken
let carriedInterrupt: InterruptedInfo | null = null; // "this much was actually heard"
let skipPause = false; // next line enters immediately (it cut in / was waiting)
let listener: ContinuousListener | null = null;

const userBusy = () => userSpeechSince !== null || commitsInFlight > 0;

const errorMessage = (error: unknown, fallback: string) =>
  axios.isAxiosError(error)
    ? (error.response?.data?.error ?? fallback)
    : fallback;

const isConflict = (error: unknown) =>
  axios.isAxiosError(error) && error.response?.status === 409;

const secondsLeft = () => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const randBetween = (min: number, max: number) =>
  min + Math.random() * (max - min);

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

// Resolves when `condition` is true or `timeoutMs` has passed, whichever is first.
const waitFor = (condition: () => boolean, timeoutMs = 60000) =>
  new Promise<void>((resolve) => {
    if (condition()) {
      resolve();
      return;
    }
    const start = Date.now();
    const id = setInterval(() => {
      if (condition() || Date.now() - start >= timeoutMs) {
        clearInterval(id);
        resolve();
      }
    }, 40);
  });

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

  // ---- interruptions: what the user hears --------------------------------

  // Marks an AI line as cut off: the transcript shows only what was said.
  const recordInterruption = (turn: NextTurnResponse, spokenText: string) => {
    if (!turn.messageId) return;
    const id = turn.messageId;
    const heardSomething = spokenText.trim().length >= 2;

    set((state) => ({
      messages: heardSomething
        ? state.messages.map((m) =>
            m.id === id
              ? { ...m, text: `${spokenText.trim()} \u2014`, interrupted: true }
              : m,
          )
        : state.messages.filter((m) => m.id !== id), // never really said
    }));

    // Sent to the server with the next request so later context is accurate.
    carriedInterrupt = { messageId: id, spokenText: spokenText.trim() };
  };

  const requestNextTurn = (sessionId: string) => {
    const interrupted = carriedInterrupt;
    carriedInterrupt = null;
    const request = gdService.nextTurn(sessionId, interrupted ?? undefined);
    // If the request fails, keep the correction for the next attempt.
    request.catch(() => {
      if (interrupted && !carriedInterrupt) carriedInterrupt = interrupted;
    });
    return request;
  };

  const cutLine = (line: ActiveLine, by: "user" | "ai") => {
    if (currentLine !== line) return;
    line.pendingCut = by;
    line.seq.stopNow();
  };

  // The user started talking over an AI. Does the AI yield or hold the floor?
  //  - polite personas usually stop (after a short, human reaction time);
  //  - assertive personas often keep going, BUT never indefinitely: if the user
  //    keeps talking they give way at the next sentence, and are cut off
  //    outright shortly after that.
  const startBargeIn = (line: ActiveLine) => {
    if (line.bargeIn) return;
    line.bargeIn = true;

    const assertiveness = line.persona?.assertiveness ?? 0.5;
    const yields = Math.random() < clamp(0.9 - 0.7 * assertiveness, 0.15, 0.9);

    if (yields) {
      const delay = randBetween(gdTuning.reactionMinMs, gdTuning.reactionMaxMs);
      line.timers.push(setTimeout(() => cutLine(line, "user"), delay));
      return;
    }

    set({ talkingOver: true });
    line.timers.push(
      setTimeout(() => {
        if (currentLine !== line || userSpeechSince === null) return;
        line.pendingCut = "user";
        line.seq.stopAfterSentence(line.seq.getSpoken().sentencesDone + 1);
        line.timers.push(
          setTimeout(
            () => cutLine(line, "user"),
            Math.max(0, gdTuning.holdHardCutMs - gdTuning.holdGraceMs),
          ),
        );
      }, gdTuning.holdGraceMs),
    );
  };

  // The server planned how the NEXT line enters while this one is still playing.
  const applyPlan = (line: ActiveLine, next: NextTurnResponse) => {
    if (currentLine !== line || next.finished || !next.plan?.interrupt) return;
    if (userBusy()) return; // the user has the floor; this line will be replaced

    if (next.plan.succeeds) {
      // The speaker yields at a sentence boundary and the interrupter starts at once.
      const done = line.seq.getSpoken().sentencesDone;
      const cutAfter = Math.max(next.plan.atSentence, done + 1);
      if (cutAfter >= line.seq.sentenceCount) return; // nothing left to cut
      line.pendingCut = "ai";
      line.seq.stopAfterSentence(cutAfter);
      skipPause = true;
    } else {
      // The speaker holds the floor. The interrupter visibly waits (hand raised)
      // and speaks the moment the line ends.
      set({ wantsToSpeakId: next.speaker ?? null });
      skipPause = true;
    }
  };

  // Speaks one AI line sentence by sentence and returns how it ended.
  const playLine = async (
    sessionId: string,
    turn: NextTurnResponse,
    myRun: number,
  ): Promise<{ completed: boolean }> => {
    const persona = get().personas.find((p) => p.id === turn.speaker);
    const text = turn.text ?? "";

    unspokenIds = unspokenIds.filter((id) => id !== turn.messageId);

    appendMessage({
      id: turn.messageId ?? `ai-${Date.now()}`,
      speaker: turn.speaker ?? "",
      speakerName: turn.speakerName ?? persona?.name ?? "Participant",
      text,
      timestamp: new Date().toISOString(),
      interrupted: false,
    });
    set({ activeSpeakerId: turn.speaker ?? null, wantsToSpeakId: null });

    const seq = speakSequence(splitSentences(text), {
      voiceIndex: persona?.voiceIndex ?? 0,
    });
    let release!: () => void;
    const finished = new Promise<void>((resolve) => {
      release = resolve;
    });
    const line: ActiveLine = {
      turn,
      persona,
      text,
      seq,
      finished,
      pendingCut: null,
      bargeIn: false,
      timers: [],
    };
    currentLine = line;

    // Request the next line now, while this one is being spoken.
    const next = requestNextTurn(sessionId);
    pending = next;
    next.catch(() => undefined); // handled when the loop awaits it
    void next.then((nt) => applyPlan(line, nt)).catch(() => undefined);

    const result = await seq.done;

    line.timers.forEach(clearTimeout);
    currentLine = null;
    lastLineText = text;
    lastLineEndedAt = Date.now();
    set({ activeSpeakerId: null, wantsToSpeakId: null, talkingOver: false });

    if (!result.completed && runId === myRun) {
      recordInterruption(turn, result.spokenText);
    }
    // Without headphones the mic hears the speakers: forget what it heard.
    if (!get().bargeInEnabled) listener?.discard();

    release();
    return { completed: result.completed };
  };

  // ---- the user's microphone ---------------------------------------------

  const echoReference = () =>
    currentLine
      ? currentLine.text
      : Date.now() - lastLineEndedAt < gdTuning.echoWindowMs
        ? lastLineText
        : "";

  const isEcho = (heard: string) => {
    const reference = echoReference();
    return (
      reference !== "" &&
      wordCount(heard) >= 2 &&
      echoOverlap(heard, reference) >= gdTuning.echoThreshold
    );
  };

  const onListenerInterim = (text: string) => {
    // No headphones: ignore the mic while an AI is talking (it would hear it).
    if (!get().bargeInEnabled && currentLine) return;

    if (isEcho(text)) {
      listener?.discard();
      return;
    }

    set({ interimText: text });

    if (userSpeechSince === null) {
      // Talking over an AI needs a few words (filters noise); filling a
      // silence counts immediately.
      const needed = currentLine ? gdTuning.minBargeInWords : 1;
      if (wordCount(text) < needed) return;

      userSpeechSince = Date.now();
      set({ userSpeaking: true });
      if (currentLine) startBargeIn(currentLine);
    }
  };

  // Sends the user's words and gets the AI's reply back in the same request.
  const commitUserMessage = (text: string) => {
    const sessionId = get().sessionId;
    if (!sessionId) return Promise.resolve();

    const myRun = runId;
    commitsInFlight += 1; // synchronous, so the loop never sees a gap

    const previous = commitChain;
    const job = (async () => {
      await previous;

      appendMessage({
        id: `local-${Date.now()}`,
        speaker: "user",
        speakerName: get().userName,
        text,
        timestamp: new Date().toISOString(),
      });

      // An AI that held the floor finishes its line first; the reply follows it.
      if (currentLine) await currentLine.finished;

      // A prefetched line was written without hearing the user: discard it.
      const stale = pending;
      pending = null;
      if (stale) {
        try {
          const turn = await stale;
          if (turn.messageId && !unspokenIds.includes(turn.messageId)) {
            unspokenIds.push(turn.messageId);
          }
        } catch {
          // it failed, so there is nothing to discard
        }
      }

      const interrupted = carriedInterrupt;
      carriedInterrupt = null;
      const discard = unspokenIds.splice(0);

      let response: SendMessageResponse | null = null;
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 3 && !response; attempt++) {
        try {
          response = await gdService.sendMessage(sessionId, {
            text,
            ...(interrupted ? { interrupted } : {}),
            ...(discard.length ? { discard } : {}),
          });
        } catch (error) {
          lastError = error;
          await sleep(600 * (attempt + 1));
        }
      }

      if (!response) {
        // Keep the corrections for the next request.
        carriedInterrupt = carriedInterrupt ?? interrupted;
        set({
          error: errorMessage(
            lastError,
            "Couldn't send your reply. Check your connection.",
          ),
        });
        return;
      }

      if (runId === myRun) {
        set({ error: null });
        pending = response.nextTurn ? Promise.resolve(response.nextTurn) : null;
      }
    })();

    const tracked = job
      .catch((error) => console.error("Sending a message failed:", error))
      .then(() => {
        commitsInFlight = Math.max(0, commitsInFlight - 1);
      });
    commitChain = tracked;
    return tracked;
  };

  const onListenerCommit = (text: string) => {
    const heard = text.trim();
    const spokeUp = userSpeechSince !== null;

    const reset = () => {
      userSpeechSince = null;
      set({ userSpeaking: false, interimText: "", talkingOver: false });
    };

    // Not real speech: noise, echo, or a fragment caught while an AI was talking.
    if (
      !heard ||
      isEcho(heard) ||
      (!spokeUp && currentLine && wordCount(heard) < gdTuning.minBargeInWords)
    ) {
      reset();
      return;
    }

    void commitUserMessage(heard); // raises commitsInFlight synchronously
    reset();
  };

  const startListening = () => {
    if (!isSTTSupported()) return;
    listener?.stop();
    listener = createContinuousListener({
      silenceMs: gdTuning.silenceCommitMs,
      onState: (on) => set({ isListening: on }),
      onInterim: onListenerInterim,
      onCommit: onListenerCommit,
      onError: (code) =>
        set({
          isListening: false,
          micError:
            code === "not-allowed" || code === "service-not-allowed"
              ? "Microphone access is blocked. Allow it in your browser, or type your replies."
              : "Voice input isn't working right now. You can type your replies instead.",
        }),
    });
    set({ micError: null });
    listener.start();
  };

  // ---- teardown / timer ---------------------------------------------------

  // Stops everything that could still be running: loop, timer, speech, mic.
  const teardownRuntime = () => {
    runId += 1; // invalidates the running loop
    loopActive = false;
    clearTimer();

    listener?.stop();
    listener = null;

    currentLine?.timers.forEach(clearTimeout);
    currentLine?.seq.stopNow();
    currentLine = null;
    cancelAllSpeech();

    userSpeechSince = null;
    pending = null;
    unspokenIds = [];
    carriedInterrupt = null;
    skipPause = false;
  };

  const onTimeUp = () => {
    currentLine?.seq.stopNow(); // cut off whoever is talking
    listener?.commitNow(); // and keep whatever the user was in the middle of saying
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

  // ---- the discussion loop -------------------------------------------------

  const runLoop = async (myRun: number): Promise<LoopOutcome> => {
    const alive = () => runId === myRun;
    const sessionId = get().sessionId;
    if (!sessionId) return "error";

    let failures = 0;

    while (alive()) {
      if (secondsLeft() <= 0) return "finished";

      // The user has the floor: stay quiet until they finish and the reply is back.
      if (userBusy()) {
        await waitFor(() => !userBusy() || !alive());
        skipPause = false;
        continue;
      }

      // ---- 1. the next AI line (prefetched, or requested now) ----
      let turn: NextTurnResponse;
      try {
        set({ isThinking: true });
        const source: Promise<NextTurnResponse> =
          pending ?? requestNextTurn(sessionId);
        pending = null;
        turn = await source;
      } catch (error) {
        pending = null;
        set({ isThinking: false });
        if (!alive()) return "cancelled";
        if (isConflict(error)) {
          await sleep(500);
          continue;
        }
        failures += 1;
        if (failures > 2) {
          set({
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

      // Until it is actually spoken, this line may still be discarded.
      if (turn.messageId) unspokenIds.push(turn.messageId);

      // The user started talking while this line was being written: it is stale.
      if (userBusy()) continue;

      // ---- 2. a natural pause (skipped when this speaker cut in / was waiting) ----
      if (skipPause) {
        skipPause = false;
      } else {
        await waitFor(
          () => userBusy() || !alive(),
          randBetween(gdTuning.pauseMinMs, gdTuning.pauseMaxMs),
        );
        if (userBusy()) continue; // someone filled the gap: the user
      }
      if (!alive()) return "cancelled";

      // ---- 3. speak it ----
      const result = await playLine(sessionId, turn, myRun);
      if (!alive()) return "cancelled";

      // ---- 4. a direct question to the user: leave room to answer ----
      if (turn.invitesUser && result.completed) {
        set({ invitingUser: true });
        await waitFor(() => userBusy() || !alive(), gdTuning.inviteWaitMs);
        set({ invitingUser: false });
      }
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
        isListening: false,
        userSpeaking: false,
        talkingOver: false,
        invitingUser: false,
        activeSpeakerId: null,
        wantsToSpeakId: null,
        interimText: "",
      });
    }
  };

  const idleUi = {
    activeSpeakerId: null,
    wantsToSpeakId: null,
    isThinking: false,
    userSpeaking: false,
    talkingOver: false,
    invitingUser: false,
    isListening: false,
    interimText: "",
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
      startListening(); // the mic stays open for the whole discussion
      startTimer(myRun);
      void runLoopSafely(myRun);
    },

    // Called when the session page unmounts: stop audio, mic and the loop.
    stopLoop: () => {
      teardownRuntime();
      set((state) => ({
        ...idleUi,
        phase: state.phase === "RUNNING" ? "READY" : state.phase,
        needsGesture: state.phase === "RUNNING" ? true : state.needsGesture,
      }));
    },

    // "Send now": finish what the user is saying without waiting for a pause.
    sendNow: () => {
      listener?.commitNow();
    },

    skipSpeech: () => {
      if (currentLine) cutLine(currentLine, "user");
    },

    // Typed replies work any time (and are the fallback when voice isn't available).
    submitTyped: (text) => {
      const trimmed = text.trim();
      if (trimmed && get().phase === "RUNNING") void commitUserMessage(trimmed);
    },

    setBargeIn: (enabled) => {
      set({ bargeInEnabled: enabled });
      listener?.discard();
    },

    endSession: async () => {
      const { sessionId, phase } = get();
      if (!sessionId || phase === "FINISHED") return;

      teardownRuntime();
      set({ ...idleUi, phase: "ENDING", error: null });

      // Make sure the user's last words reached the server before evaluating.
      await Promise.race([commitChain, sleep(6000)]);

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
