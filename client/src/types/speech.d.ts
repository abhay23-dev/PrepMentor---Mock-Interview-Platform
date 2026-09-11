// Minimal ambient declarations for the Web Speech API's SpeechRecognition
// interface. TypeScript's built-in DOM lib does not ship types for this yet,
// so we declare just enough of the shape we actually use.
// (SpeechSynthesis / SpeechSynthesisUtterance ARE already in lib.dom, so
// those need no declarations here.)
//
// Everything must live inside `declare global` — the `export {}` below makes
// this file a module, and in a module, top-level interfaces are scoped to
// the module itself rather than being globally visible. Without
// `declare global`, other files (like useSpeechRecognition.ts) can't see
// these types at all, which is exactly the "Cannot find name" error this
// caused.

export {};

declare global {
  interface SpeechRecognitionResultItem {
    transcript: string;
    confidence: number;
  }

  interface SpeechRecognitionResult {
    readonly length: number;
    isFinal: boolean;
    [index: number]: SpeechRecognitionResultItem;
  }

  interface SpeechRecognitionResultList {
    readonly length: number;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
  }

  interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onresult:
      | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void)
      | null;
    onerror:
      | ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void)
      | null;
    onend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  }

  interface SpeechRecognitionConstructor {
    new (): SpeechRecognition;
  }

  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}