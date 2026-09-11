import { useCallback, useEffect, useState } from "react";

export function useTextToSpeech() {
  const [isSupported] = useState(
    () => typeof window !== "undefined" && "speechSynthesis" in window,
  );
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Stop any speech in progress if the component using this unmounts
  // (e.g. the user navigates away mid-question).
  useEffect(() => {
    return () => {
      if (isSupported) window.speechSynthesis.cancel();
    };
  }, [isSupported]);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !text.trim()) return;

      // Cancel anything already queued/playing so overlapping calls
      // (e.g. clicking "read aloud" twice, or a new question loading)
      // don't stack utterances.
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [isSupported],
  );

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  return { isSupported, isSpeaking, speak, stop };
}