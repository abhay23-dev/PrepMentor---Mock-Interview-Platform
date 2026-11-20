import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Clock, Mic, Send, SkipForward } from "lucide-react";
import { useGDStore } from "@/store/gdStore";
import { isSTTSupported } from "@/utils/speech";
import type { GDFeedback } from "@/types/gd.types";

// Used to defer stopLoop() by one tick on unmount. React StrictMode (dev)
// mounts, unmounts and re-mounts every component; without this the fake
// unmount would kill a discussion that is about to continue.
let pendingStop: ReturnType<typeof setTimeout> | null = null;

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-purple-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-cyan-500",
];

const formatTime = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

function Avatar({
  name,
  colorClass,
  active,
  label,
}: {
  name: string;
  colorClass: string;
  active: boolean;
  label?: string;
}) {
  return (
    <div className="flex w-24 flex-col items-center gap-2">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white transition ${colorClass} ${
          active ? "ring-4 ring-blue-400/80 animate-pulse scale-110" : "opacity-80"
        }`}
      >
        {name.charAt(0).toUpperCase()}
      </div>
      <p className="max-w-full truncate text-sm font-medium text-white">{name}</p>
      {label && (
        <p className="max-w-full truncate text-xs text-slate-500">{label}</p>
      )}
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-800 py-4 text-center">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-blue-400">
        {value}
        <span className="text-sm text-slate-500">/10</span>
      </p>
    </div>
  );
}

function ResultsView({
  feedback,
  onBack,
  onNew,
}: {
  feedback: GDFeedback;
  onBack: () => void;
  onNew: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center">
        <h2 className="text-2xl font-bold text-white">Discussion Complete</h2>
        <p className="mt-4 text-sm text-slate-400">Overall Score</p>
        <p className="mt-1 text-5xl font-bold text-blue-400">
          {feedback.overallScore}
          <span className="text-xl text-slate-500">/10</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <ScoreCard label="Clarity" value={feedback.clarity} />
        <ScoreCard label="Relevance" value={feedback.relevance} />
        <ScoreCard label="Engagement" value={feedback.engagement} />
        <ScoreCard label="Initiative" value={feedback.initiative} />
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h3 className="font-semibold text-white">Summary</h3>
        <p className="mt-2 text-slate-300">{feedback.summary}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="font-semibold text-emerald-400">Strengths</h3>
          {feedback.strengths.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Nothing to highlight yet.</p>
          ) : (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
              {feedback.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="font-semibold text-amber-400">To improve</h3>
          {feedback.improvements.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No suggestions.</p>
          ) : (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
              {feedback.improvements.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onNew}
          className="flex-1 rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Start Another Discussion
        </button>
        <button
          onClick={onBack}
          className="flex-1 rounded-lg border border-slate-700 py-3 font-semibold text-slate-200 transition hover:bg-slate-800"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

export default function GDSessionPage() {
  const { sessionId: routeSessionId } = useParams({ from: "/gd/$sessionId" });
  const navigate = useNavigate();

  const {
    sessionId,
    topic,
    userName,
    personas,
    messages,
    feedback,
    phase,
    remainingSeconds,
    activeSpeakerId,
    isThinking,
    isUserTurn,
    isListening,
    interimText,
    micError,
    needsGesture,
    error,
    loadSession,
    begin,
    finishSpeaking,
    skipTurn,
    skipSpeech,
    submitTyped,
    endSession,
    reset,
  } = useGDStore();

  const [typed, setTyped] = useState("");
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const sttSupported = isSTTSupported();

  // Stop audio, mic and the loop when leaving the page.
  useEffect(() => {
    if (pendingStop) {
      clearTimeout(pendingStop);
      pendingStop = null;
    }
    return () => {
      pendingStop = setTimeout(() => {
        useGDStore.getState().stopLoop();
        pendingStop = null;
      }, 0);
    };
  }, []);

  // Load from the server when the store doesn't hold this session
  // (page reload, or opening the link directly).
  useEffect(() => {
    if (useGDStore.getState().sessionId !== routeSessionId) {
      void loadSession(routeSessionId);
    }
  }, [routeSessionId, loadSession]);

  // Right after "Start" on the setup page, begin automatically.
  useEffect(() => {
    if (sessionId === routeSessionId && phase === "READY" && !needsGesture) {
      begin();
    }
  }, [sessionId, routeSessionId, phase, needsGesture, begin]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!isUserTurn) setTyped("");
  }, [isUserTurn]);

  const goToDashboard = () => {
    reset();
    navigate({ to: "/dashboard" });
  };

  const startAnother = () => {
    reset();
    navigate({ to: "/gd/new" });
  };

  const handleEnd = () => {
    if (window.confirm("End the discussion now and get your feedback?")) {
      void endSession();
    }
  };

  const handleSendTyped = () => {
    if (typed.trim()) {
      submitTyped(typed);
      setTyped("");
    }
  };

  // ---- load failure ----
  if (phase === "IDLE" && error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md rounded-xl bg-slate-900 p-8 shadow-xl border border-slate-800 text-center">
          <h1 className="text-2xl font-bold text-white">Couldn't open this discussion</h1>
          <p className="mt-2 text-slate-400">{error}</p>
          <button
            onClick={goToDashboard}
            className="mt-6 w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (phase === "IDLE" || phase === "LOADING" || sessionId !== routeSessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Loading discussion...
      </div>
    );
  }

  const speakingPersona =
    activeSpeakerId && activeSpeakerId !== "user"
      ? personas.find((p) => p.id === activeSpeakerId)
      : null;

  let statusText = "";
  if (phase === "RUNNING") {
    if (isUserTurn) {
      statusText = isListening
        ? "Your turn. Speak now, I'm listening."
        : "Your turn. Speak or type your reply.";
    } else if (speakingPersona) {
      statusText = `${speakingPersona.name} is speaking...`;
    } else if (isThinking) {
      statusText = "Waiting for the next participant...";
    }
  }

  const lowTime = remainingSeconds <= 30;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6">
      <div className="mx-auto max-w-4xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Group Discussion
            </p>
            <h1 className="truncate text-lg font-semibold text-white">{topic}</h1>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
                lowTime && phase === "RUNNING"
                  ? "border-red-500/50 bg-red-500/10 text-red-400"
                  : "border-slate-700 bg-slate-900 text-slate-200"
              }`}
            >
              <Clock size={16} />
              {formatTime(remainingSeconds)}
            </div>
            {phase === "RUNNING" && (
              <button
                onClick={handleEnd}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
              >
                End
              </button>
            )}
          </div>
        </div>

        {phase === "FINISHED" && feedback ? (
          <ResultsView
            feedback={feedback}
            onBack={goToDashboard}
            onNew={startAnother}
          />
        ) : (
          <>
            {!sttSupported && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                Voice input isn't supported in this browser (use Chrome or
                Edge). You can type your replies instead.
              </p>
            )}

            {/* Participants */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex flex-wrap justify-center gap-6">
                {personas.map((persona, index) => (
                  <Avatar
                    key={persona.id}
                    name={persona.name}
                    colorClass={AVATAR_COLORS[index % AVATAR_COLORS.length]}
                    active={activeSpeakerId === persona.id}
                    label={persona.stance}
                  />
                ))}
                <Avatar
                  name={userName}
                  colorClass="bg-slate-600"
                  active={activeSpeakerId === "user"}
                  label="You"
                />
              </div>

              <div className="mt-5 flex min-h-8 items-center justify-center gap-3">
                <p className="text-sm text-slate-300">{statusText}</p>
                {phase === "RUNNING" && speakingPersona && (
                  <button
                    onClick={skipSpeech}
                    className="flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-white"
                  >
                    <SkipForward size={12} />
                    Skip
                  </button>
                )}
              </div>

              {phase === "RUNNING" && lowTime && (
                <p className="mt-2 text-center text-sm font-medium text-red-400">
                  Wrap up your points. Time is almost over.
                </p>
              )}
            </div>

            {/* User's turn */}
            {phase === "RUNNING" && isUserTurn && (
              <div className="rounded-xl border border-blue-500/40 bg-blue-500/5 p-5">
                <p className="text-sm font-semibold text-blue-300">Your turn</p>

                {micError && (
                  <p className="mt-2 text-sm text-amber-400">{micError}</p>
                )}

                {sttSupported && !micError && (
                  <div className="mt-3 flex items-start gap-3">
                    <Mic
                      size={18}
                      className={`mt-0.5 shrink-0 ${
                        isListening ? "animate-pulse text-red-400" : "text-slate-500"
                      }`}
                    />
                    <p className="min-h-6 text-slate-300 italic">
                      {interimText ||
                        (isListening ? "Listening..." : "Starting microphone...")}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <input
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendTyped();
                    }}
                    placeholder="Or type your reply and press Enter"
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleSendTyped}
                    disabled={!typed.trim()}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={16} />
                    Send
                  </button>
                </div>

                <div className="mt-3 flex gap-3">
                  {sttSupported && !micError && (
                    <button
                      onClick={finishSpeaking}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                    >
                      Done speaking
                    </button>
                  )}
                  <button
                    onClick={skipTurn}
                    className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
                  >
                    Skip my turn
                  </button>
                </div>
              </div>
            )}

            {/* Ending / retry */}
            {phase === "ENDING" && (
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center">
                {error ? (
                  <>
                    <p className="text-red-400">{error}</p>
                    <button
                      onClick={() => void endSession()}
                      className="mt-4 rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition hover:bg-blue-700"
                    >
                      Retry
                    </button>
                  </>
                ) : (
                  <p className="text-slate-300">Evaluating your performance...</p>
                )}
              </div>
            )}

            {/* Resume overlay (after reload / error / leaving the page) */}
            {phase === "READY" && needsGesture && (
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center">
                {error && <p className="mb-3 text-red-400">{error}</p>}
                {remainingSeconds > 0 ? (
                  <>
                    <p className="text-slate-300">
                      Your discussion is paused. Browsers need a click before
                      audio and the microphone can start.
                    </p>
                    <div className="mt-4 flex justify-center gap-3">
                      <button
                        onClick={begin}
                        className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition hover:bg-blue-700"
                      >
                        Resume discussion
                      </button>
                      <button
                        onClick={handleEnd}
                        className="rounded-lg border border-slate-700 px-6 py-2 font-semibold text-slate-300 transition hover:bg-slate-800"
                      >
                        End & get feedback
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-slate-300">Time's up for this discussion.</p>
                    <button
                      onClick={() => void endSession()}
                      className="mt-4 rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition hover:bg-blue-700"
                    >
                      Get my feedback
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Transcript */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-sm font-semibold text-slate-400">Transcript</h2>
              <div className="mt-3 max-h-80 space-y-3 overflow-y-auto pr-1">
                {messages.length === 0 && (
                  <p className="text-sm text-slate-500">
                    The discussion will appear here.
                  </p>
                )}
                {messages.map((message) => {
                  const isUser = message.speaker === "user";
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          isUser
                            ? "bg-blue-600/20 text-blue-100"
                            : "bg-slate-800 text-slate-200"
                        }`}
                      >
                        <p className="text-xs font-semibold opacity-70">
                          {isUser ? "You" : message.speakerName}
                        </p>
                        <p className="mt-0.5 text-sm">{message.text}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={transcriptEndRef} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
