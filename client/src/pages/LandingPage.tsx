import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

export default function LandingPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  // If a logged-in user lands on "/", send them straight to the dashboard
  // instead of showing them the marketing page again.
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate({ to: "/dashboard" });
    }
  }, [isLoading, isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <span className="text-xl font-bold">PrepMentor</span>
        <nav className="flex items-center gap-4">
          <button
            onClick={() => navigate({ to: "/login" })}
            className="text-sm font-medium text-slate-300 hover:text-white transition"
          >
            Login
          </button>
          <button
            onClick={() => navigate({ to: "/signup" })}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition"
          >
            Sign Up
          </button>
        </nav>
      </header>

      {/* Hero */}
      <div className="flex flex-col items-center justify-center px-6 pt-16 pb-12 text-center">
        <h1 className="text-4xl md:text-6xl font-bold">PrepMentor 🚀</h1>

        <p className="mt-4 text-slate-400 max-w-xl">
          Practice AI-powered mock interviews and improve your confidence with
          real-time feedback.
        </p>

        <div className="mt-8 flex gap-4">
          <button
            onClick={() => navigate({ to: "/signup" })}
            className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition"
          >
            Get Started
          </button>

          <button
            onClick={() => navigate({ to: "/login" })}
            className="px-6 py-2 border border-slate-600 rounded-lg hover:bg-slate-800 transition"
          >
            Login
          </button>
        </div>

        {/* Features */}
        <div className="mt-12 grid md:grid-cols-3 gap-6 max-w-4xl">
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
            <h3 className="text-lg font-semibold">Mock Interviews</h3>
            <p className="text-sm text-slate-400 mt-2">
              Practice real interview questions with adaptive difficulty.
            </p>
          </div>

          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
            <h3 className="text-lg font-semibold">AI Feedback</h3>
            <p className="text-sm text-slate-400 mt-2">
              Get instant evaluation and improve your answers.
            </p>
          </div>

          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
            <h3 className="text-lg font-semibold">Track Progress</h3>
            <p className="text-sm text-slate-400 mt-2">
              Monitor your interview performance over time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
