// Plain (non-React) wrappers around the browser's speech APIs, used by the
// group discussion loop. They live outside React because the loop runs in the
// Zustand store and needs promises it can `await` ("speak this line and tell
// me when it's finished").
//
// The existing useSpeechRecognition / useTextToSpeech hooks are untouched.

export const GD_STT_LANG = "en-IN";

export const isTTSSupported = () =>
  typeof window !== "undefined" && "speechSynthesis" in window;

export const isSTTSupported = () =>
  typeof window !== "undefined" &&
  !!(window.SpeechRecognition || window.webkitSpeechRecognition);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export { sleep };

// ---------------------------------------------------------------------------
// Text-to-speech
// ---------------------------------------------------------------------------

let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

// getVoices() is empty on first call in Chrome; wait for "voiceschanged".
export const loadVoices = (): Promise<SpeechSynthesisVoice[]> => {
  if (!isTTSSupported()) return Promise.resolve([]);
  if (voicesPromise) return voicesPromise;

  const synth = window.speechSynthesis;
  voicesPromise = new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const existing = synth.getVoices();
    if (existing.length) {
      resolve(existing);
      return;
    }

    const finish = () => {
      synth.removeEventListener("voiceschanged", finish);
      const voices = synth.getVoices();
      // Don't cache an empty result forever; allow a later retry.
      if (!voices.length) voicesPromise = null;
      resolve(voices);
    };
    synth.addEventListener("voiceschanged", finish);
    setTimeout(finish, 1500);
  });

  return voicesPromise;
};

const voiceRank = (voice: SpeechSynthesisVoice) => {
  const lang = voice.lang.toLowerCase().replace("_", "-");
  if (lang === "en-in") return 0;
  if (lang === "en-gb") return 1;
  if (lang === "en-us") return 2;
  if (lang.startsWith("en")) return 3;
  return 4;
};

// English voices first (Indian, British, American, other), de-duplicated.
const rankVoices = (voices: SpeechSynthesisVoice[]) => {
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const pool = english.length ? english : voices;
  const seen = new Set<string>();
  return [...pool]
    .sort((a, b) => voiceRank(a) - voiceRank(b))
    .filter((v) => {
      if (seen.has(v.name)) return false;
      seen.add(v.name);
      return true;
    });
};

// Pitch/rate variation so personas still sound different when the device
// only ships one or two voices.
const PITCHES = [1, 0.8, 1.2, 0.9, 1.1, 0.95];
const RATES = [1, 0.97, 1.04, 1, 0.95, 1.03];

export interface SpeechHandle {
  promise: Promise<void>; // resolves when finished OR cancelled
  cancel: () => void;
}

export const speakText = (
  text: string,
  options: { voiceIndex?: number } = {},
): SpeechHandle => {
  const words = text.split(/\s+/).filter(Boolean).length;
  const estimateMs = Math.max(1500, words * 380);

  let settled = false;
  let cancelled = false;
  let safetyTimer: ReturnType<typeof setTimeout> | undefined;
  let resolvePromise!: () => void;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });

  const settle = () => {
    if (settled) return;
    settled = true;
    if (safetyTimer) clearTimeout(safetyTimer);
    resolvePromise();
  };

  // No TTS available: just wait roughly as long as reading would take, so the
  // discussion pace still feels natural.
  if (!isTTSSupported() || !text.trim()) {
    safetyTimer = setTimeout(settle, isTTSSupported() ? 0 : estimateMs);
    return { promise, cancel: settle };
  }

  const synth = window.speechSynthesis;
  const index = options.voiceIndex ?? 0;

  loadVoices().then((voices) => {
    if (cancelled || settled) return;

    const utterance = new SpeechSynthesisUtterance(text);
    const pool = rankVoices(voices);
    if (pool.length) utterance.voice = pool[index % pool.length];
    utterance.pitch = PITCHES[index % PITCHES.length];
    utterance.rate = RATES[index % RATES.length];
    utterance.onend = settle;
    utterance.onerror = settle;

    // Chrome occasionally never fires onend; don't let the loop hang forever.
    safetyTimer = setTimeout(settle, estimateMs * 1.8 + 6000);
    synth.speak(utterance);
  });

  return {
    promise,
    cancel: () => {
      cancelled = true;
      if (isTTSSupported()) synth.cancel();
      settle();
    },
  };
};

// Queued (does not interrupt whatever is currently being spoken).
export const speakCue = (text: string) => {
  if (!isTTSSupported()) return;
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
};

export const cancelAllSpeech = () => {
  if (isTTSSupported()) window.speechSynthesis.cancel();
};

// ---------------------------------------------------------------------------
// Speech-to-text
// ---------------------------------------------------------------------------

export type ListenEndReason =
  | "silence"
  | "no-speech"
  | "max"
  | "stopped"
  | "ended"
  | "error";

export interface ListenOptions {
  lang?: string;
  noSpeechMs?: number; // give up if nothing is heard at all
  silenceMs?: number; // finish this long after the last words
  maxMs?: number; // hard cap on one turn
  onStart?: () => void;
  onInterim?: (text: string) => void;
  onError?: (code: string) => void;
  onEnd: (text: string, reason: ListenEndReason) => void;
}

export interface ListenHandle {
  getText: () => string;
  stop: () => void; // graceful: lets the recognizer flush its last words
  abort: () => void; // immediate, no onEnd callback
}

export const listenForSpeech = (options: ListenOptions): ListenHandle => {
  const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;

  if (!Ctor) {
    queueMicrotask(() => options.onEnd("", "error"));
    return { getText: () => "", stop: () => {}, abort: () => {} };
  }

  const recognition = new Ctor();
  recognition.lang = options.lang ?? GD_STT_LANG;
  recognition.continuous = true;
  recognition.interimResults = true;

  let finalText = "";
  let interimText = "";
  let ended = false;
  let heardAnything = false;
  let silenceTimer: ReturnType<typeof setTimeout> | undefined;
  let noSpeechTimer: ReturnType<typeof setTimeout> | undefined;
  let maxTimer: ReturnType<typeof setTimeout> | undefined;
  let stopTimer: ReturnType<typeof setTimeout> | undefined;

  const getText = () => `${finalText} ${interimText}`.trim();

  const clearTimers = () => {
    if (silenceTimer) clearTimeout(silenceTimer);
    if (noSpeechTimer) clearTimeout(noSpeechTimer);
    if (maxTimer) clearTimeout(maxTimer);
    if (stopTimer) clearTimeout(stopTimer);
  };

  const detach = () => {
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    recognition.onstart = null;
  };

  const end = (reason: ListenEndReason) => {
    if (ended) return;
    ended = true;
    clearTimers();
    detach();
    try {
      recognition.abort();
    } catch {
      // already stopped
    }
    options.onEnd(getText(), reason);
  };

  recognition.onstart = () => options.onStart?.();

  recognition.onresult = (event) => {
    heardAnything = true;
    if (noSpeechTimer) clearTimeout(noSpeechTimer);

    let nextInterim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0]?.transcript ?? "";
      if (result.isFinal) {
        finalText = `${finalText} ${transcript}`.trim();
      } else {
        nextInterim += transcript;
      }
    }
    interimText = nextInterim;
    options.onInterim?.(getText());

    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => end("silence"), options.silenceMs ?? 2500);
  };

  recognition.onerror = (event) => {
    // These fire routinely and are handled by the timers / onend below.
    if (event.error === "no-speech" || event.error === "aborted") return;
    options.onError?.(event.error);
    end("error");
  };

  recognition.onend = () => end(heardAnything ? "ended" : "no-speech");

  noSpeechTimer = setTimeout(() => end("no-speech"), options.noSpeechMs ?? 12000);
  maxTimer = setTimeout(() => end("max"), options.maxMs ?? 60000);

  try {
    recognition.start();
  } catch {
    options.onError?.("start-failed");
    end("error");
  }

  return {
    getText,
    stop: () => {
      if (ended) return;
      try {
        recognition.stop(); // onend fires after final results are delivered
      } catch {
        end("stopped");
        return;
      }
      // Safety net in case onend never arrives.
      stopTimer = setTimeout(() => end("stopped"), 900);
    },
    abort: () => {
      if (ended) return;
      ended = true;
      clearTimers();
      detach();
      try {
        recognition.abort();
      } catch {
        // already stopped
      }
    },
  };
};
