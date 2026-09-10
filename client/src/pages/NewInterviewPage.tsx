import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import axios from "axios";
import { useInterviewStore } from "@/store/interviewStore";
import { DIFFICULTIES, TOPICS } from "@/constants/interview.constants";
import type { Topic, Difficulty } from "@/types/interview.types";

export default function NewInterviewPage() {
  const navigate = useNavigate();

  const startInterview = useInterviewStore((state) => state.startInterview);
  const isLoading = useInterviewStore((state) => state.isLoading);

  const [topic, setTopic] = useState<Topic | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);

  const handleStart = async () => {
    if (!topic || !difficulty) {
      alert("Please select a topic and difficulty.");
      return;
    }

    try {
      const interviewId = await startInterview(topic, difficulty);
      navigate({
        to: "/interview/$interviewId",
        params: { interviewId },
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.error ?? "Unable to start interview.");
      } else {
        alert("Something went wrong.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-lg rounded-xl bg-slate-900 p-8 shadow-xl border border-slate-800">
        <h1 className="text-3xl font-bold text-white text-center">
          Start a Mock Interview
        </h1>
        <p className="text-slate-400 text-center mt-2">
          Pick a topic and a difficulty to begin.
        </p>

        <div className="mt-8">
          <label className="block text-sm text-slate-300 mb-3">Topic</label>
          <div className="grid grid-cols-2 gap-3">
            {TOPICS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTopic(t.value)}
                className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
                  topic === t.value
                    ? "border-blue-500 bg-blue-500/10 text-blue-400"
                    : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm text-slate-300 mb-3">
            Difficulty
          </label>
          <div className="grid grid-cols-3 gap-3">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
                  difficulty === d
                    ? "border-blue-500 bg-blue-500/10 text-blue-400"
                    : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleStart}
          disabled={isLoading || !topic || !difficulty}
          className="mt-8 w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Starting..." : "Start Interview"}
        </button>
      </div>
    </div>
  );
}
