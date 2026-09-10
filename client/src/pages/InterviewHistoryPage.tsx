import { useEffect, useMemo, useState } from "react";
import { interviewService } from "@/services/interviewService";
import { getTopicLabel, TOPICS, DIFFICULTIES } from "@/constants/interview.constants";
import type {
  Difficulty,
  InterviewHistoryItem,
  InterviewStatus,
  Topic,
} from "@/types/interview.types";

type StatusFilter = "ALL" | InterviewStatus;

export default function InterviewHistoryPage() {
  const [history, setHistory] = useState<InterviewHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [topicFilter, setTopicFilter] = useState<Topic | "ALL">("ALL");
  const [difficultyFilter, setDifficultyFilter] = useState<
    Difficulty | "ALL"
  >("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await interviewService.getHistory();
        if (!cancelled) setHistory(data);
      } catch {
        if (!cancelled) setError("Couldn't load interview history.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filtering happens client-side because the backend endpoint returns the
  // full list with no query params. Fine for now; if history grows large,
  // this filtering (and pagination) should move server-side instead.
  const filtered = useMemo(() => {
    return history.filter((item) => {
      if (topicFilter !== "ALL" && item.topic !== topicFilter) return false;
      if (difficultyFilter !== "ALL" && item.difficulty !== difficultyFilter)
        return false;
      if (statusFilter !== "ALL" && item.status !== statusFilter)
        return false;
      return true;
    });
  }, [history, topicFilter, difficultyFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Interview History</h1>
        <p className="mt-1 text-slate-400">
          {history.length} interview{history.length === 1 ? "" : "s"} total
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value as Topic | "ALL")}
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none focus:border-blue-500"
        >
          <option value="ALL">All Topics</option>
          {TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <select
          value={difficultyFilter}
          onChange={(e) =>
            setDifficultyFilter(e.target.value as Difficulty | "ALL")
          }
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none focus:border-blue-500"
        >
          <option value="ALL">All Difficulties</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none focus:border-blue-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="ONGOING">Ongoing</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {isLoading && <p className="text-slate-400">Loading...</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!isLoading && !error && (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-left">
            <thead className="bg-slate-900 text-slate-400 text-sm">
              <tr>
                <th className="px-5 py-3 font-medium">Topic</th>
                <th className="px-5 py-3 font-medium">Difficulty</th>
                <th className="px-5 py-3 font-medium">Questions</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Score</th>
                <th className="px-5 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.interviewId}
                  className="border-t border-slate-800 bg-slate-950 hover:bg-slate-900 transition"
                >
                  <td className="px-5 py-4 text-white">
                    {getTopicLabel(item.topic)}
                  </td>
                  <td className="px-5 py-4 text-slate-300">
                    {item.difficulty}
                  </td>
                  <td className="px-5 py-4 text-slate-300">
                    {item.questionsAnswered}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        item.status === "COMPLETED"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-white font-semibold">
                    {item.status === "COMPLETED" ? `${item.score}/10` : "—"}
                  </td>
                  <td className="px-5 py-4 text-slate-400">
                    {new Date(item.date).toLocaleDateString()}
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-slate-500"
                  >
                    No interviews match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
