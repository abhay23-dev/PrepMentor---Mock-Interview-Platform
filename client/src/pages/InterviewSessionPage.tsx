import { useNavigate, useParams } from "@tanstack/react-router";
import axios from "axios";
import { useEffect, useState } from "react";
import { Keyboard, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useInterviewStore } from "@/store/interviewStore";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

type InputMode = "text" | "voice";

export default function InterviewSessionPage() {
  const { interviewId: routeInterviewId } = useParams({
    from: "/interview/$interviewId",
  });
  const navigate = useNavigate();

  const {
    interviewId,
    currentQuestion,
    questionsAsked,
    maxQuestions,
    status,
    lastScore,
    overallScore,
    isLoading,
    submitAnswer,
    endInterview,
    reset,
  } = useInterviewStore();

  const [answer, setAnswer] = useState("");
  const [sessionLost, setSessionLost] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("text");

  // Speech-to-text: append each finalized chunk the browser recognizes onto
  // whatever is already in the answer box, so switching in and out of voice
  // mode (or mixing typing + speaking) never loses text.
  const {
    isSupported: sttSupported,
    isListening,
    interimTranscript,
    error: sttError,
    toggle: toggleListening,
    stop: stopListening,
  } = useSpeechRecognition({
    onFinalResult: (text) => {
      setAnswer((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
    },
  });

  // Text-to-speech: reads the current question aloud on demand.
  const {
    isSupported: ttsSupported,
    isSpeaking,
    speak,
    stop: stopSpeaking,
  } = useTextToSpeech();

  // Zustand state lives only in memory. If the store's interviewId doesn't
  // match the URL (e.g. the user refreshed mid-interview), we've lost the
  // in-progress question and can't safely continue.
  useEffect(() => {
    if (interviewId !== routeInterviewId) {
      setSessionLost(true);
    }
  }, [interviewId, routeInterviewId]);

  // Whenever a new question comes in, stop any in-flight mic recording or
  // question read-aloud from the previous question so they don't bleed into
  // the next one.
  useEffect(() => {
    stopListening();
    stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.questionId]);

  const handleSubmit = async () => {
    if (!answer.trim()) {
      alert("Please write an answer before submitting.");
      return;
    }

    try {
      stopListening();
      const { completed } = await submitAnswer(answer);
      setAnswer("");

      if (completed) {
        // submitAnswer marks status COMPLETED but doesn't compute overallScore.
        // endInterview does that by averaging saved Answer scores.
        await endInterview();
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.error ?? "Unable to submit answer.");
      } else {
        alert("Something went wrong.");
      }
    }
  };

  const handleFinish = () => {
    reset();
    navigate({ to: "/dashboard" });
  };

  const handleToggleReadAloud = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else if (currentQuestion?.questionText) {
      speak(currentQuestion.questionText);
    }
  };

  if (sessionLost) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md rounded-xl bg-slate-900 p-8 shadow-xl border border-slate-800 text-center">
          <h1 className="text-2xl font-bold text-white">
            Interview session lost
          </h1>
          <p className="text-slate-400 mt-2">
            It looks like this page was reloaded, so we lost track of your
            in-progress question. Please start a new interview.
          </p>
          <button
            onClick={() => navigate({ to: "/interview/new" })}
            className="mt-6 w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Start New Interview
          </button>
        </div>
      </div>
    );
  }

  if (status === "COMPLETED") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md rounded-xl bg-slate-900 p-8 shadow-xl border border-slate-800 text-center">
          <h1 className="text-2xl font-bold text-white">
            Interview Complete
          </h1>
          <p className="text-slate-400 mt-2">
            You answered {questionsAsked} question
            {questionsAsked === 1 ? "" : "s"}.
          </p>

          <div className="mt-6 rounded-lg bg-slate-800 py-6">
            <p className="text-sm text-slate-400">Overall Score</p>
            <p className="text-4xl font-bold text-blue-400 mt-1">
              {overallScore !== null ? overallScore : "..."}
              <span className="text-lg text-slate-500">/10</span>
            </p>
          </div>

          <button
            onClick={handleFinish}
            className="mt-6 w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-2xl rounded-xl bg-slate-900 p-8 shadow-xl border border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">
            Question {questionsAsked + 1} of {maxQuestions}
          </span>
          {lastScore !== null && (
            <span className="text-sm text-emerald-400">
              Last score: {lastScore}/10
            </span>
          )}
        </div>

        <div className="flex items-start justify-between gap-3 mt-4">
          <h1 className="text-xl font-semibold text-white">
            {currentQuestion?.questionText}
          </h1>

          {ttsSupported && (
            <button
              type="button"
              onClick={handleToggleReadAloud}
              title={isSpeaking ? "Stop reading" : "Read question aloud"}
              className={`shrink-0 rounded-full p-2 transition ${
                isSpeaking
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          )}
        </div>

        {/* Input mode toggle: let the user pick typing or speaking, freely */}
        <div className="mt-6 inline-flex rounded-lg border border-slate-700 bg-slate-800 p-1">
          <button
            type="button"
            onClick={() => setInputMode("text")}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              inputMode === "text"
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Keyboard size={16} />
            Type
          </button>
          <button
            type="button"
            onClick={() => setInputMode("voice")}
            disabled={!sttSupported}
            title={
              sttSupported
                ? undefined
                : "Speech recognition isn't supported in this browser — try Chrome or Edge."
            }
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              inputMode === "voice"
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white"
            } ${!sttSupported ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            <Mic size={16} />
            Speak
          </button>
        </div>

        {inputMode === "voice" && sttSupported && (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/60 p-6">
            <button
              type="button"
              onClick={toggleListening}
              className={`flex h-16 w-16 items-center justify-center rounded-full transition ${
                isListening
                  ? "bg-red-600 text-white animate-pulse"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {isListening ? <MicOff size={26} /> : <Mic size={26} />}
            </button>
            <p className="text-sm text-slate-400">
              {isListening
                ? "Listening... tap to stop"
                : "Tap the mic and start speaking your answer"}
            </p>
            {interimTranscript && (
              <p className="text-sm italic text-slate-500 text-center">
                "{interimTranscript}"
              </p>
            )}
            {sttError && (
              <p className="text-sm text-red-400">
                Mic error: {sttError}. You can still type your answer below.
              </p>
            )}
          </div>
        )}

        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={8}
          placeholder={
            inputMode === "voice"
              ? "Your spoken answer will appear here — feel free to edit it too."
              : "Type your answer here..."
          }
          className="w-full mt-4 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500 resize-none"
        />

        <button
          onClick={handleSubmit}
          disabled={isLoading || isListening}
          title={isListening ? "Stop recording before submitting" : undefined}
          className="mt-6 w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading
            ? "Submitting..."
            : isListening
              ? "Stop recording to submit"
              : "Submit Answer"}
        </button>
      </div>
    </div>
  );
}