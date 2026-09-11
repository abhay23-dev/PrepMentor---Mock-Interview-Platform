import { useCallback, useEffect, useRef, useState } from "react";

type UseSpeechRecognitionOptions = {
  // Called with the final (committed) transcript chunk each time the
  // browser is confident a phrase is finished. Append this to your own
  // text state — this hook doesn't hold the full accumulated answer itself,
  // since the caller usually wants it merged into an editable textarea.
  onFinalResult?: (text: string) => void;
  lang?: string;
};

export function useSpeechRecognition({
  onFinalResult,
  lang = "en-US",
}: UseSpeechRecognitionOptions = {}) {
  const [isSupported] = useState(
    () =>
      typeof window !== "undefined" &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  );
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Kept in a ref so the effect below doesn't need to re-run (and tear down
  // the recognition instance) every time the caller passes a new inline
  // callback.
  const onFinalResultRef = useRef(onFinalResult);
  onFinalResultRef.current = onFinalResult;

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognitionCtor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition!;
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          const trimmed = text.trim();
          if (trimmed) onFinalResultRef.current?.(trimmed);
          setInterimTranscript("");
        } else {
          interim += text;
        }
      }
      if (interim) setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      // "no-speech" and "aborted" fire routinely (e.g. brief silence, or we
      // called stop() ourselves) — not worth surfacing as an error.
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(event.error || "Speech recognition error");
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [isSupported, lang]);

  const start = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    setError(null);
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      // start() throws InvalidStateError if it's already running — safe to
      // ignore, our state already reflects "listening" in that case.
    }
  }, [isListening]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (isListening) stop();
    else start();
  }, [isListening, start, stop]);

  return {
    isSupported,
    isListening,
    interimTranscript,
    error,
    start,
    stop,
    toggle,
  };
}