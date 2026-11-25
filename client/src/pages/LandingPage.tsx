import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Mic,
  Sparkles,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Mic,
    title: "AI Mock Interviews",
    text: "Real interview-style questions that adapt to how you answer. Speak or type, your choice.",
  },
  {
    icon: Users,
    title: "Group Discussions",
    text: "Debate with AI participants who talk back, interrupt politely and react to your points.",
  },
  {
    icon: Brain,
    title: "Instant AI Feedback",
    text: "Scores, strengths and concrete things to improve after every session.",
  },
  {
    icon: BarChart3,
    title: "Track Your Progress",
    text: "Score trends and topic breakdowns show exactly where to practice next.",
  },
];

const STEPS = [
  {
    title: "Pick a session",
    text: "Choose a mock interview topic or a group discussion theme.",
  },
  {
    title: "Practice out loud",
    text: "Answer by voice or text. AI participants respond in real time.",
  },
  {
    title: "Review the feedback",
    text: "Open any past session from your dashboard and see how you did.",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  // A logged-in user landing on "/" goes straight to the dashboard.
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate({ to: "/dashboard" });
    }
  }, [isLoading, isAuthenticated, navigate]);

  return (
    <div className="min-h-screen text-fg">
      <header className="sticky top-0 z-40 border-b border-slate-800/70 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo />
          <nav className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/login"
              className="hidden px-3 text-sm font-medium text-slate-400 transition hover:text-fg sm:block"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-700"
            >
              Sign Up
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-6 pt-20 pb-16 text-center md:pt-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-1.5 text-xs font-medium text-slate-400">
            <Sparkles size={14} className="text-blue-400" />
            Interviews and group discussions, practiced with AI
          </span>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight md:text-6xl">
            Walk into your next{" "}
            <span className="bg-linear-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">
              interview ready
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
            Practice mock interviews and live group discussions with AI that
            talks back, then get clear feedback on how to improve.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/signup"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700"
            >
              Get Started Free
              <ArrowRight size={17} />
            </Link>
            <Link
              to="/login"
              className="rounded-xl border border-slate-700 bg-slate-900 px-7 py-3.5 font-semibold text-fg transition hover:bg-slate-800"
            >
              I already have an account
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-600/10"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/10 text-blue-400">
                  <Icon size={20} />
                </span>
                <h3 className="mt-4 font-semibold text-fg">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            How it works
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <div
                key={step.title}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 font-semibold text-fg">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final call to action */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-blue-600 to-violet-600 px-8 py-14 text-center text-white shadow-xl shadow-blue-600/20">
            <div className="pointer-events-none absolute -top-16 -left-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <h2 className="relative text-3xl font-bold tracking-tight">
              Start practicing today
            </h2>
            <p className="relative mx-auto mt-3 max-w-lg text-white/80">
              Create a free account and run your first session in under a
              minute.
            </p>
            <Link
              to="/signup"
              className="relative mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 font-semibold text-blue-700 shadow transition hover:bg-white/90"
            >
              Create your account
              <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-500">
        PrepMentor. Practice more, worry less.
      </footer>
    </div>
  );
}
