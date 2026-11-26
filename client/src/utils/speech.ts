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

// ---------------------------------------------------------------------------
// Sentence helpers
// ---------------------------------------------------------------------------

// IMPORTANT: identical to splitSentences() in the server's gdOrchestrator.ts.
// The server tells the client "cut the current line after sentence N", so both
// sides must split text the same way.
export const splitSentences = (text: string): string[] => {
  const parts =
    text.replace(/\s+/g, " ").trim().match(/[^.!?]+(?:[.!?]+["')\]]*|$)/g) ?? [];
  return parts.map((p) => p.trim()).filter(Boolean);
};

const toWords = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .filter(Boolean);

// Fraction (0..1) of the heard words that also appear in the reference text.
// Used to tell "the mic is picking up the AI's own voice" from real speech.
export const echoOverlap = (heard: string, reference: string): number => {
  const heardWords = toWords(heard);
  if (heardWords.length === 0) return 0;
  const referenceWords = new Set(toWords(reference));
  return (
    heardWords.filter((word) => referenceWords.has(word)).length /
    heardWords.length
  );
};

// ---------------------------------------------------------------------------
// Speaking a line sentence by sentence
//
// Sentences are spoken as separate utterances so a line can be stopped at a
// clean boundary (browsers give no reliable way to stop "at the end of the
// current word"), and so we always know exactly how much was actually said.
// ---------------------------------------------------------------------------

const WORD_MS = 380; // rough speaking speed, only used to estimate a cut-off point

export interface SequenceResult {
  completed: boolean; // every sentence was spoken
  spokenText: string; // what was actually said (a cut sentence is estimated)
  sentencesDone: number;
}

export interface SequenceHandle {
  done: Promise<SequenceResult>;
  sentenceCount: number;
  getSpoken: () => { text: string; sentencesDone: number };
  stopNow: () => void; // cut the audio immediately
  stopAfterSentence: (count: number) => void; // stop once `count` sentences are done
}

export const speakSequence = (
  sentences: string[],
  options: { voiceIndex?: number } = {},
): SequenceHandle => {
  let doneCount = 0;
  let stopped = false;
  let stopAt = Infinity;
  let current: SpeechHandle | null = null;
  let currentIndex = -1;
  let currentStart = 0;
  let partialAtStop = "";

  const partialOfCurrent = () => {
    if (currentIndex < 0) return "";
    const words = sentences[currentIndex].split(/\s+/).filter(Boolean);
    const elapsed = Date.now() - currentStart;
    // never claim the whole sentence was said if it was cut
    const spokenWords = Math.min(words.length - 1, Math.floor(elapsed / WORD_MS));
    return spokenWords >= 2 ? words.slice(0, spokenWords).join(" ") : "";
  };

  const spokenText = () =>
    [sentences.slice(0, doneCount).join(" "), partialAtStop]
      .filter(Boolean)
      .join(" ")
      .trim();

  const done = (async (): Promise<SequenceResult> => {
    for (let i = 0; i < sentences.length; i++) {
      if (stopped || doneCount >= stopAt) break;
      currentIndex = i;
      currentStart = Date.now();
      current = speakText(sentences[i], { voiceIndex: options.voiceIndex });
      await current.promise;
      if (stopped) break;
      doneCount += 1;
    }
    current = null;
    currentIndex = -1;
    return {
      completed: !stopped && doneCount >= sentences.length,
      spokenText: spokenText(),
      sentencesDone: doneCount,
    };
  })();

  return {
    done,
    sentenceCount: sentences.length,
    getSpoken: () => ({ text: spokenText(), sentencesDone: doneCount }),
    stopNow: () => {
      if (stopped) return;
      partialAtStop = partialOfCurrent();
      stopped = true;
      current?.cancel();
    },
    stopAfterSentence: (count) => {
      stopAt = Math.min(stopAt, count);
    },
  };
};

// ---------------------------------------------------------------------------
// Always-on microphone
//
// Unlike listenForSpeech (one answer per call), this keeps the mic open for the
// whole discussion, restarts itself when the browser ends a session, and
// reports each finished utterance after a pause in speech.
// ---------------------------------------------------------------------------

export interface ContinuousListenerOptions {
  lang?: string;
  silenceMs?: number; // a pause this long ends the utterance
  onState?: (listening: boolean) => void;
  // Called on every recognition result with the utterance heard so far.
  onInterim: (text: string, startsNewUtterance: boolean) => void;
  onCommit: (text: string) => void; // a finished utterance
  onError?: (code: string) => void; // mic unusable
}

export interface ContinuousListener {
  start: () => void;
  stop: () => void;
  commitNow: () => void; // finish the current utterance immediately
  discard: () => void; // throw away what was heard so far (e.g. echo)
}

export const createContinuousListener = (
  options: ContinuousListenerOptions,
): ContinuousListener => {
  const Ctor =
    typeof window === "undefined"
      ? undefined
      : (window.SpeechRecognition ?? window.webkitSpeechRecognition);

  let recognition: SpeechRecognition | null = null;
  let active = false;
  let finalText = "";
  let interimText = "";
  let utteranceOpen = false;
  let consecutiveErrors = 0;
  let silenceTimer: ReturnType<typeof setTimeout> | undefined;
  let restartTimer: ReturnType<typeof setTimeout> | undefined;

  const getText = () => `${finalText} ${interimText}`.trim();

  const clearSilence = () => {
    if (silenceTimer) clearTimeout(silenceTimer);
  };

  const resetBuffers = () => {
    clearSilence();
    finalText = "";
    interimText = "";
    utteranceOpen = false;
  };

  const detach = () => {
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    recognition.onstart = null;
  };

  const startRecognition = () => {
    if (!Ctor || !active) return;
    detach();

    const instance = new Ctor();
    recognition = instance;
    instance.lang = options.lang ?? GD_STT_LANG;
    instance.continuous = true;
    instance.interimResults = true;

    instance.onstart = () => {
      consecutiveErrors = 0;
      options.onState?.(true);
    };

    instance.onresult = (event) => {
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

      const startsNew = !utteranceOpen;
      utteranceOpen = true;
      options.onInterim(getText(), startsNew);

      clearSilence();
      silenceTimer = setTimeout(commit, options.silenceMs ?? 1600);
    };

    instance.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      consecutiveErrors += 1;
      const fatal =
        event.error === "not-allowed" ||
        event.error === "service-not-allowed" ||
        consecutiveErrors >= 3;
      if (fatal) {
        active = false;
        options.onState?.(false);
        options.onError?.(event.error);
      }
    };

    // Browsers end a session after a while (or after silence): start another.
    instance.onend = () => {
      options.onState?.(false);
      if (active) {
        restartTimer = setTimeout(startRecognition, 200);
      }
    };

    try {
      instance.start();
    } catch {
      // already started: harmless
    }
  };

  // Abort the current session so the browser's result buffer is cleared; the
  // onend handler then starts a fresh one.
  const restartFresh = () => {
    try {
      recognition?.abort();
    } catch {
      // already stopped
    }
  };

  function commit() {
    const text = getText();
    resetBuffers();
    restartFresh();
    if (text) options.onCommit(text);
  }

  return {
    start: () => {
      if (!Ctor) {
        options.onError?.("unsupported");
        return;
      }
      active = true;
      startRecognition();
    },
    stop: () => {
      active = false;
      if (restartTimer) clearTimeout(restartTimer);
      resetBuffers();
      detach();
      try {
        recognition?.abort();
      } catch {
        // already stopped
      }
      recognition = null;
      options.onState?.(false);
    },
    commitNow: () => {
      if (getText()) commit();
    },
    discard: () => {
      resetBuffers();
      restartFresh();
    },
  };
};
