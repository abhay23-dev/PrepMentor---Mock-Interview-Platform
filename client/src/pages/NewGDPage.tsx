import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import axios from "axios";
import { ArrowLeft } from "lucide-react";
import { useGDStore } from "@/store/gdStore";
import { isSTTSupported } from "@/utils/speech";

const SUGGESTED_TOPICS = [
  "Is remote work better than working from the office?",
  "Should AI replace human jobs?",
  "Social media: boon or bane for students?",
  "Is a college degree still necessary for a successful career?",
  "Should coding be a compulsory subject in schools?",
  "Are electric vehicles the future of India's transport?",
];

const PARTICIPANT_OPTIONS = [2, 3, 4, 5];

const DURATION_OPTIONS = [
  { label: "3 min", seconds: 180 },
  { label: "5 min", seconds: 300 },
  { label: "8 min", seconds: 480 },
  { label: "10 min", seconds: 600 },
];

const optionClass = (selected: boolean) =>
  `rounded-lg border px-4 py-3 text-sm font-medium transition ${
    selected
      ? "border-blue-500 bg-blue-500/10 text-blue-400"
      : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
  }`;

export default function NewGDPage() {
  const navigate = useNavigate();

  const startSession = useGDStore((state) => state.startSession);
  const isStarting = useGDStore((state) => state.isStarting);

  const [topic, setTopic] = useState("");
  const [numParticipants, setNumParticipants] = useState(3);
  const [timerDuration, setTimerDuration] = useState(300);

  const trimmedTopic = topic.trim();
  const topicValid = trimmedTopic.length >= 5 && trimmedTopic.length <= 150;

  const handleStart = async () => {
    if (!topicValid) {
      alert("Please enter a topic (5 to 150 characters).");
      return;
    }

    try {
      const sessionId = await startSession(
        trimmedTopic,
        numParticipants,
        timerDuration,
      );
      navigate({ to: "/gd/$sessionId", params: { sessionId } });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.error ?? "Unable to start the discussion.");
      } else {
        alert("Something went wrong.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-xl rounded-xl bg-slate-900 p-8 shadow-xl border border-slate-800">
        <button
          type="button"
          onClick={() => navigate({ to: "/dashboard/discussions" })}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-fg transition"
        >
          <ArrowLeft size={16} />
          Group Discussions
        </button>

        <h1 className="mt-4 text-3xl font-bold text-fg text-center">
          Start a Group Discussion
        </h1>
        <p className="text-slate-400 text-center mt-2">
          Practice with AI participants who talk back. Speak or type your
          points when it's your turn.
        </p>

        <div className="mt-8">
          <label className="block text-sm text-slate-300 mb-3">Topic</label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={2}
            maxLength={150}
            placeholder="e.g. Is remote work better than working from the office?"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-fg outline-none focus:border-blue-500 resize-none"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTED_TOPICS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setTopic(suggestion)}
                className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:border-blue-500 hover:text-blue-400 transition"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm text-slate-300 mb-3">
            AI participants
          </label>
          <div className="grid grid-cols-4 gap-3">
            {PARTICIPANT_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNumParticipants(n)}
                className={optionClass(numParticipants === n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm text-slate-300 mb-3">Duration</label>
          <div className="grid grid-cols-4 gap-3">
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d.seconds}
                type="button"
                onClick={() => setTimerDuration(d.seconds)}
                className={optionClass(timerDuration === d.seconds)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {!isSTTSupported() && (
          <p className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            Voice input isn't supported in this browser, so you'll type your
            replies. Use Chrome or Edge to speak instead.
          </p>
        )}

        <button
          type="button"
          onClick={handleStart}
          disabled={isStarting || !topicValid}
          className="mt-8 w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isStarting ? "Inviting participants..." : "Start Discussion"}
        </button>
      </div>
    </div>
  );
}
