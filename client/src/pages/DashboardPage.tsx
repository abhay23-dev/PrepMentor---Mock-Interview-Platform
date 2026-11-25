import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Mic,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { analyticsService } from "@/services/analyticsService";
import { gdService } from "@/services/gdService";
import { useAuthStore } from "@/store/authStore";
import GDSessionCard from "@/components/cards/GDSessionCard";
import InterviewCard from "@/components/cards/InterviewCard";
import type { AnalyticsResponse } from "@/types/analytics.types";
import type { GDHistoryItem } from "@/types/gd.types";

const round1 = (n: number) => Math.round(n * 10) / 10;

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-400">
          <Icon size={17} />
        </span>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-fg">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  to,
  linkLabel,
}: {
  title: string;
  subtitle: string;
  to: "/dashboard/discussions" | "/dashboard/history";
  linkLabel: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold text-fg">{title}</h2>
        <p className="text-sm text-slate-400">{subtitle}</p>
      </div>
      <Link
        to={to}
        className="flex shrink-0 items-center gap-1 text-sm font-medium text-blue-400 hover:underline"
      >
        {linkLabel} <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function SkeletonCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-44 animate-pulse rounded-2xl border border-slate-800 bg-slate-900"
        />
      ))}
    </div>
  );
}

function EmptyCard({
  text,
  to,
  cta,
}: {
  text: string;
  to: "/interview/new" | "/gd/new";
  cta: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-10 text-center">
      <p className="text-slate-400">{text}</p>
      <Link
        to={to}
        className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        {cta}
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [gdHistory, setGdHistory] = useState<GDHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsFailed, setAnalyticsFailed] = useState(false);
  const [gdFailed, setGdFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // Independent requests: one failing must not blank the other section.
      const [analyticsResult, gdResult] = await Promise.allSettled([
        analyticsService.getAnalytics(),
        gdService.getHistory(),
      ]);
      if (cancelled) return;

      if (analyticsResult.status === "fulfilled") {
        setAnalytics(analyticsResult.value);
      } else {
        setAnalyticsFailed(true);
      }

      if (gdResult.status === "fulfilled") {
        setGdHistory(gdResult.value);
      } else {
        setGdFailed(true);
      }

      setIsLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = user?.name?.trim().split(/\s+/)[0];

  const completedGds = gdHistory.filter((g) => g.status === "COMPLETED");
  const gdScores = completedGds
    .map((g) => g.score)
    .filter((s): s is number => s !== null);
  const avgGdScore =
    gdScores.length > 0
      ? round1(gdScores.reduce((sum, s) => sum + s, 0) / gdScores.length)
      : null;

  const recentInterviews = analytics?.recentInterviews.slice(0, 3) ?? [];
  const recentGds = gdHistory.slice(0, 3);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-blue-600 to-violet-600 p-8 text-white shadow-xl shadow-blue-600/20 md:p-10">
        <div className="pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

        <div className="relative">
          <p className="text-sm font-medium text-white/80">Welcome back</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">
            {firstName ? `Hi, ${firstName}.` : "Hi there."} Ready to practice?
          </h1>
          <p className="mt-3 max-w-xl text-white/80">
            Run an AI mock interview or jump into a live group discussion. Your
            feedback from every session shows up right here.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/interview/new"
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 shadow transition hover:bg-white/90"
            >
              <Mic size={17} />
              Start Interview
            </Link>
            <Link
              to="/gd/new"
              className="flex items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25"
            >
              <Users size={17} />
              Start Group Discussion
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Interviews"
          value={isLoading ? "…" : (analytics?.overview.totalInterviews ?? 0)}
          hint={
            analytics
              ? `${analytics.overview.totalCompleted} completed`
              : undefined
          }
          icon={Mic}
        />
        <StatCard
          label="Avg interview score"
          value={
            isLoading
              ? "…"
              : analytics && analytics.overview.totalCompleted > 0
                ? `${analytics.overview.averageScore}/10`
                : "—"
          }
          icon={Target}
        />
        <StatCard
          label="Group discussions"
          value={isLoading ? "…" : completedGds.length}
          hint={
            gdHistory.length > completedGds.length
              ? `${gdHistory.length - completedGds.length} unfinished`
              : "completed"
          }
          icon={CheckCircle2}
        />
        <StatCard
          label="Avg GD score"
          value={
            isLoading ? "…" : avgGdScore !== null ? `${avgGdScore}/10` : "—"
          }
          icon={TrendingUp}
        />
      </section>

      {/* Group discussions */}
      <section>
        <SectionHeader
          title="Group discussions"
          subtitle="Your latest sessions. Open one to read the feedback."
          to="/dashboard/discussions"
          linkLabel="View all"
        />
        {isLoading ? (
          <SkeletonCards />
        ) : gdFailed ? (
          <p className="text-red-400">Couldn't load your group discussions.</p>
        ) : recentGds.length === 0 ? (
          <EmptyCard
            text="You haven't joined a group discussion yet."
            to="/gd/new"
            cta="Start your first discussion"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {recentGds.map((item) => (
              <GDSessionCard key={item.sessionId} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* Interviews */}
      <section>
        <SectionHeader
          title="Mock interviews"
          subtitle="Your latest interviews. Open one to see question-by-question feedback."
          to="/dashboard/history"
          linkLabel="View all"
        />
        {isLoading ? (
          <SkeletonCards />
        ) : analyticsFailed ? (
          <p className="text-red-400">Couldn't load your interviews.</p>
        ) : recentInterviews.length === 0 ? (
          <EmptyCard
            text="You haven't taken any interviews yet."
            to="/interview/new"
            cta="Start your first interview"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {recentInterviews.map((item) => (
              <InterviewCard key={item.interviewId} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
