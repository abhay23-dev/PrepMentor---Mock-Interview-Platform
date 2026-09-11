import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Line,
  LineChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { analyticsService } from "@/services/analyticsService";
import { getTopicLabel } from "@/constants/interview.constants";
import type { AnalyticsResponse } from "@/types/analytics.types";

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: "#34d399",
  Medium: "#fbbf24",
  Hard: "#f87171",
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-6 bg-slate-900 rounded-xl border border-slate-800">
      <p className="text-slate-400 text-sm">{label}</p>
      <h2 className="text-2xl font-bold mt-2 text-white">{value}</h2>
    </div>
  );
}

function TallyList({
  title,
  items,
  emptyText,
  dotClassName,
}: {
  title: string;
  items: { text: string; count: number }[];
  emptyText: string;
  dotClassName: string;
}) {
  return (
    <div className="p-6 bg-slate-900 rounded-xl border border-slate-800">
      <h3 className="text-white font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.text} className="flex items-start gap-2 text-sm">
              <span
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotClassName}`}
              />
              <span className="text-slate-300">{item.text}</span>
              <span className="ml-auto shrink-0 text-slate-500">
                ×{item.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const navigate = useNavigate();
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
        if (!cancelled) setError("Couldn't load your analytics.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return <p className="text-slate-400">Loading analytics...</p>;
  }

  if (error || !data) {
    return <p className="text-red-400">{error ?? "Something went wrong."}</p>;
  }

  if (data.overview.totalInterviews === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="mt-1 text-slate-400">
            Your interview performance over time.
          </p>
        </div>
        <div className="p-10 bg-slate-900 rounded-xl border border-slate-800 text-center">
          <p className="text-white font-semibold">No data yet</p>
          <p className="mt-2 text-sm text-slate-400">
            Complete a mock interview and your scores, topic breakdown, and
            feedback trends will show up here.
          </p>
          <button
            onClick={() => navigate({ to: "/interview/new" })}
            className="mt-6 px-5 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition text-white font-medium"
          >
            Start an interview
          </button>
        </div>
      </div>
    );
  }

  const trendData = data.scoreTrend.map((point, index) => ({
    ...point,
    label: `#${index + 1}`,
    dateLabel: new Date(point.date).toLocaleDateString(),
  }));

  const topicData = data.topicBreakdown.map((t) => ({
    ...t,
    label: getTopicLabel(t.topic),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="mt-1 text-slate-400">
          Your interview performance over time.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Total Interviews" value={data.overview.totalInterviews} />
        <StatCard label="Completed" value={data.overview.totalCompleted} />
        <StatCard label="Average Score" value={`${data.overview.averageScore}/10`} />
        <StatCard
          label="Questions Answered"
          value={data.overview.totalQuestionsAnswered}
        />
      </div>

      {/* Score trend */}
      <div className="p-6 bg-slate-900 rounded-xl border border-slate-800">
        <h3 className="text-white font-semibold mb-4">Score trend</h3>
        {trendData.length === 0 ? (
          <p className="text-sm text-slate-500">
            Finish an interview to start seeing your score trend.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
              <YAxis domain={[0, 10]} stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: 8,
                  color: "#e2e8f0",
                }}
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.dateLabel ?? ""
                }
                formatter={(value: number, _name, item: any) => [
                  `${value}/10`,
                  getTopicLabel(item.payload.topic),
                ]}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Topic breakdown */}
        <div className="p-6 bg-slate-900 rounded-xl border border-slate-800">
          <h3 className="text-white font-semibold mb-4">
            Average score by topic
          </h3>
          {topicData.length === 0 ? (
            <p className="text-sm text-slate-500">No completed interviews yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topicData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                <YAxis domain={[0, 10]} stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: 8,
                    color: "#e2e8f0",
                  }}
                  formatter={(value: number) => [`${value}/10`, "Avg score"]}
                />
                <Bar dataKey="averageScore" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Difficulty breakdown */}
        <div className="p-6 bg-slate-900 rounded-xl border border-slate-800">
          <h3 className="text-white font-semibold mb-4">
            Average score by difficulty
          </h3>
          {data.difficultyBreakdown.length === 0 ? (
            <p className="text-sm text-slate-500">No completed interviews yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.difficultyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="difficulty" stroke="#64748b" fontSize={12} />
                <YAxis domain={[0, 10]} stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: 8,
                    color: "#e2e8f0",
                  }}
                  formatter={(value: number) => [`${value}/10`, "Avg score"]}
                />
                <Bar dataKey="averageScore" radius={[6, 6, 0, 0]}>
                  {data.difficultyBreakdown.map((entry) => (
                    <Cell
                      key={entry.difficulty}
                      fill={DIFFICULTY_COLOR[entry.difficulty] ?? "#3b82f6"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Feedback signal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TallyList
          title="Recurring strengths"
          items={data.topStrengths}
          emptyText="Nothing tallied yet."
          dotClassName="bg-emerald-400"
        />
        <TallyList
          title="Recurring weaknesses"
          items={data.topWeaknesses}
          emptyText="Nothing tallied yet."
          dotClassName="bg-amber-400"
        />
        <TallyList
          title="Suggestions to focus on"
          items={data.topSuggestions}
          emptyText="Nothing tallied yet."
          dotClassName="bg-blue-400"
        />
      </div>
    </div>
  );
}
