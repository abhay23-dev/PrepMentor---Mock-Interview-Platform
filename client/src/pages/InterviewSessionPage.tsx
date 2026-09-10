import { useNavigate, useParams } from "@tanstack/react-router";
import axios from "axios";
import { useEffect, useState } from "react";
import { useInterviewStore } from "@/store/interviewStore";

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

  // Zustand state lives only in memory. If the store's interviewId doesn't
  // match the URL (e.g. the user refreshed mid-interview), we've lost the
  // in-progress question and can't safely continue.
  useEffect(() => {
    if (interviewId !== routeInterviewId) {
      setSessionLost(true);
    }
  }, [interviewId, routeInterviewId]);

  const handleSubmit = async () => {
    if (!answer.trim()) {
      alert("Please write an answer before submitting.");
      return;
    }

    try {
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

        <h1 className="text-xl font-semibold text-white mt-4">
          {currentQuestion?.questionText}
        </h1>

        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={8}
          placeholder="Type your answer here..."
          className="w-full mt-6 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500 resize-none"
        />

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="mt-6 w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Submitting..." : "Submit Answer"}
        </button>
      </div>
    </div>
  );
}
