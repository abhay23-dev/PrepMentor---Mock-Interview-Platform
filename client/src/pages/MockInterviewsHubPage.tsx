import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mic, ArrowRight } from "lucide-react";
import { interviewService } from "@/services/interviewService";
import { getTopicLabel } from "@/constants/interview.constants";
import type { InterviewHistoryItem } from "@/types/interview.types";

export default function MockInterviewsHubPage() {
  const [recent, setRecent] = useState<InterviewHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const history = await interviewService.getHistory();
        if (!cancelled) {
          setRecent(history.slice(0, 5));
        }
      } catch {
        if (!cancelled) {
          setError("Couldn't load your recent interviews.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Mock Interviews</h1>
          <p className="mt-2 text-slate-400">
            Start a new AI-driven interview session, or pick up where you left
            off below.
          </p>
        </div>

        <Link
          to="/interview/new"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 whitespace-nowrap"
        >
          <Mic size={18} />
          Start New Interview
        </Link>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">
            Recent Interviews
          </h2>
          <Link
            to="/dashboard/history"
            className="text-sm text-blue-400 hover:underline flex items-center gap-1"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {isLoading && <p className="text-slate-400">Loading...</p>}
        {error && <p className="text-red-400">{error}</p>}

        {!isLoading && !error && recent.length === 0 && (
          <p className="text-slate-400">
            You haven't taken any interviews yet. Start your first one above.
          </p>
        )}

        <div className="space-y-3">
          {recent.map((item) => (
            <div
              key={item.interviewId}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-5 py-4"
            >
              <div>
                <p className="font-medium text-white">
                  {getTopicLabel(item.topic)}{" "}
                  <span className="text-slate-500 font-normal">
                    · {item.difficulty}
                  </span>
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  {new Date(item.date).toLocaleDateString()} ·{" "}
                  {item.questionsAnswered} question
                  {item.questionsAnswered === 1 ? "" : "s"}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    item.status === "COMPLETED"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {item.status}
                </span>
                <span className="text-white font-semibold w-12 text-right">
                  {item.status === "COMPLETED" ? `${item.score}/10` : "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
