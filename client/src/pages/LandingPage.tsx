import { useNavigate } from "@tanstack/react-router";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-6">
      
      {/* Heading */}
      <h1 className="text-4xl md:text-6xl font-bold text-center">
        PrepMentor 🚀
      </h1>

      <p className="mt-4 text-slate-400 text-center max-w-xl">
        Practice AI-powered mock interviews and improve your confidence with
        real-time feedback.
      </p>

      {/* Buttons */}
      <div className="mt-8 flex gap-4">
        <button
          onClick={() => navigate({ to: "/login" })}
          className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition"
        >
          Get Started
        </button>

        <button
          onClick={() => navigate({ to: "/signup" })}
          className="px-6 py-2 border border-slate-600 rounded-lg hover:bg-slate-800 transition"
        >
          Sign Up
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
  );
}