import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { feedbackService } from "@/services/feedbackService";
import type { InterviewFeedbackResponse } from "@/types/interview.types";

// Purely a display threshold — doesn't affect the stored score. 7+/10 reads
// as a solid answer; anything below draws a bit more visual attention to
// the ideal-answer comparison.
const isStrongScore = (score: number) => score >= 7;

function ScoreBadge({ score }: { score: number }) {
  const strong = isStrongScore(score);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold shrink-0 ${
        strong
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-amber-500/10 text-amber-400"
      }`}
    >
      {strong ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
      {score}/10
    </span>
  );
}

function QuestionFeedbackCard({
  q,
}: {
  q: InterviewFeedbackResponse["questions"][number];
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="mt-0.5 shrink-0 rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-slate-400">
            Q{q.questionNumber}
          </span>
          <h3 className="font-medium text-fg">{q.questionText}</h3>
        </div>
        <ScoreBadge score={q.score} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Your Answer
          </p>
          <p className="text-sm text-slate-300 whitespace-pre-wrap">
            {q.userAnswer || "No answer recorded."}
          </p>
        </div>
        <div className="rounded-lg border border-blue-900/40 bg-blue-950/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-400 mb-2">
            Ideal Answer
          </p>
          <p className="text-sm text-slate-300">{q.idealAnswer}</p>
        </div>
      </div>
    </div>
  );
}

export default function InterviewFeedbackPage() {
  const { interviewId } = useParams({
    from: "/feedback/$interviewId",
  });
  const navigate = useNavigate();

  const [feedback, setFeedback] = useState<InterviewFeedbackResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    feedbackService
      .getFeedback(interviewId)
      .then((data) => {
        if (!cancelled) setFeedback(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load feedback for this interview.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [interviewId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Loading feedback...
      </div>
    );
  }

  if (error || !feedback) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md rounded-xl bg-slate-900 p-8 shadow-xl border border-slate-800 text-center">
          <h1 className="text-xl font-bold text-fg">
            {error ?? "No feedback found."}
          </h1>
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="mt-6 w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Overview */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
          <p className="text-sm uppercase tracking-wide text-slate-500">
            {feedback.topic} · {feedback.difficulty}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-fg">
            Interview Feedback
          </h1>

          <div className="mt-6 inline-flex flex-col items-center rounded-lg bg-slate-800 px-10 py-5">
            <span className="text-sm text-slate-400">Overall Score</span>
            <span className="mt-1 text-4xl font-bold text-blue-400">
              {feedback.overallScore}
              <span className="text-lg text-slate-500">/10</span>
            </span>
          </div>

          {feedback.overallSummary && (
            <p className="mt-6 text-sm text-slate-300 max-w-xl mx-auto">
              {feedback.overallSummary}
            </p>
          )}
        </div>

        {/* Every question, the candidate's answer, and the ideal answer */}
        <div>
          <h2 className="text-lg font-semibold text-fg mb-4">
            Question-by-Question Review
          </h2>
          <div className="space-y-4">
            {feedback.questions.map((q) => (
              <QuestionFeedbackCard key={q.questionNumber} q={q} />
            ))}
          </div>
        </div>

        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
