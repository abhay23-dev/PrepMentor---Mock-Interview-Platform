import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Mic, ArrowRight } from "lucide-react";
import { analyticsService } from "@/services/analyticsService";
import { getTopicLabel } from "@/constants/interview.constants";
import { useAuthStore } from "@/store/authStore";
import type { AnalyticsResponse } from "@/types/analytics.types";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-6 bg-slate-900 rounded-xl border border-slate-800">
      <p className="text-slate-400 text-sm">{label}</p>
      <h2 className="text-2xl font-bold mt-2">{value}</h2>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const result = await analyticsService.getAnalytics();
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setError("Couldn't load your dashboard.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back{user?.name ? `, ${user.name}` : ""}
        </h1>
        <p className="mt-1 text-slate-400">
          Here's how your interview prep is going.
        </p>
      </div>

      {isLoading && <p className="text-slate-400">Loading...</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!isLoading && !error && data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard label="Total Interviews" value={data.overview.totalInterviews} />
            <StatCard label="Avg Score" value={`${data.overview.averageScore}/10`} />
            <StatCard label="Completed" value={data.overview.totalCompleted} />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Ready for another round?
              </h2>
              <p className="mt-1 text-slate-400">
                Start a new mock interview and keep your streak going.
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

            {data.recentInterviews.length === 0 ? (
              <p className="text-slate-400">
                You haven't taken any interviews yet. Start your first one
                above.
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentInterviews.map((item) => (
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
                        {new Date(item.date).toLocaleDateString()}
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
            )}
          </section>
        </>
      )}
    </div>
  );
}
