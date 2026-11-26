import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Clock, Mic, MicOff, Send, SkipForward } from "lucide-react";
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
  wants = false,
  label,
}: {
  name: string;
  colorClass: string;
  active: boolean; // currently speaking
  wants?: boolean; // trying to get a word in
  label?: string;
}) {
  return (
    <div className="flex w-24 flex-col items-center gap-2">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white transition ${colorClass} ${
          active
            ? "ring-4 ring-blue-400/80 animate-pulse scale-110"
            : wants
              ? "ring-4 ring-amber-400/80 animate-pulse"
              : "opacity-80"
        }`}
      >
        {name.charAt(0).toUpperCase()}
      </div>
      <p className="max-w-full truncate text-sm font-medium text-fg">{name}</p>
      {label && (
        <p
          className={`max-w-full truncate text-xs ${
            wants ? "font-medium text-amber-400" : "text-slate-500"
          }`}
        >
          {label}
        </p>
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
  onDiscussions,
  onDashboard,
  onNew,
}: {
  feedback: GDFeedback;
  onDiscussions: () => void;
  onDashboard: () => void;
  onNew: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center">
        <h2 className="text-2xl font-bold text-fg">Discussion Complete</h2>
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
        <h3 className="font-semibold text-fg">Summary</h3>
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
          onClick={onDiscussions}
          className="flex-1 rounded-lg border border-slate-700 py-3 font-semibold text-slate-200 transition hover:bg-slate-800"
        >
          All Discussions
        </button>
        <button
          onClick={onDashboard}
          className="flex-1 rounded-lg border border-slate-700 py-3 font-semibold text-slate-200 transition hover:bg-slate-800"
        >
          Dashboard
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
    wantsToSpeakId,
    isThinking,
    userSpeaking,
    talkingOver,
    invitingUser,
    isListening,
    interimText,
    micError,
    bargeInEnabled,
    needsGesture,
    error,
    loadSession,
    begin,
    sendNow,
    skipSpeech,
    submitTyped,
    setBargeIn,
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

  const goToDashboard = () => {
    reset();
    navigate({ to: "/dashboard" });
  };

  const startAnother = () => {
    reset();
    navigate({ to: "/gd/new" });
  };

  const goToDiscussions = () => {
    reset();
    navigate({ to: "/dashboard/discussions" });
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
          <h1 className="text-2xl font-bold text-fg">Couldn't open this discussion</h1>
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

  const speakingPersona = activeSpeakerId
    ? personas.find((p) => p.id === activeSpeakerId)
    : undefined;
  const wantingPersona = wantsToSpeakId
    ? personas.find((p) => p.id === wantsToSpeakId)
    : undefined;

  let statusText = "";
  if (phase === "RUNNING") {
    if (userSpeaking && talkingOver && speakingPersona) {
      statusText = `You're talking over ${speakingPersona.name}`;
    } else if (userSpeaking) {
      statusText = "You're speaking...";
    } else if (speakingPersona && wantingPersona) {
      statusText = `${speakingPersona.name} is speaking. ${wantingPersona.name} wants to speak.`;
    } else if (speakingPersona) {
      statusText = `${speakingPersona.name} is speaking...`;
    } else if (invitingUser) {
      statusText = "They're waiting for your reply...";
    } else if (isThinking) {
      statusText = "Waiting for the next participant...";
    }
  }

  const micLabel = !sttSupported
    ? "Typing mode"
    : micError
      ? "Microphone unavailable"
      : isListening
        ? userSpeaking
          ? "You're speaking"
          : "Mic is on"
        : "Starting microphone...";

  const lowTime = remainingSeconds <= 30;

  const transcriptCard = (
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
                    ? "bg-blue-600/15 text-fg"
                    : "bg-slate-800 text-slate-200"
                }`}
              >
                <p className="text-xs font-semibold opacity-70">
                  {isUser ? "You" : message.speakerName}
                </p>
                <p className="mt-0.5 text-sm">
                  {message.text}
                  {message.interrupted && (
                    <span className="ml-2 text-[10px] font-semibold tracking-wide text-amber-400 uppercase">
                      interrupted
                    </span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={transcriptEndRef} />
      </div>
    </div>
  );


  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6">
      <div className="mx-auto max-w-4xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Group Discussion
            </p>
            <h1 className="truncate text-lg font-semibold text-fg">{topic}</h1>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {phase !== "FINISHED" && (
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
            )}
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
          <>
            <ResultsView
              feedback={feedback}
              onDiscussions={goToDiscussions}
              onDashboard={goToDashboard}
              onNew={startAnother}
            />
            {transcriptCard}
          </>
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
                    wants={wantsToSpeakId === persona.id}
                    label={
                      wantsToSpeakId === persona.id
                        ? "wants to speak"
                        : persona.stance
                    }
                  />
                ))}
                <Avatar
                  name={userName}
                  colorClass="bg-slate-500"
                  active={userSpeaking}
                  label="You"
                />
              </div>

              <div className="mt-5 flex min-h-8 items-center justify-center gap-3">
                <p className="text-sm text-slate-300">{statusText}</p>
                {phase === "RUNNING" && speakingPersona && (
                  <button
                    onClick={skipSpeech}
                    className="flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-fg"
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

            {/* Connection problem while the discussion keeps running */}
            {phase === "RUNNING" && error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </p>
            )}

            {/* Always-on voice bar: there are no turns, jump in any time */}
            {phase === "RUNNING" && (
              <div
                className={`rounded-xl border p-5 transition ${
                  userSpeaking
                    ? "border-blue-500/50 bg-blue-500/5"
                    : "border-slate-800 bg-slate-900"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full ${
                        isListening
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      {isListening ? (
                        <Mic
                          size={17}
                          className={userSpeaking ? "animate-pulse" : ""}
                        />
                      ) : (
                        <MicOff size={17} />
                      )}
                    </span>
                    <p className="text-sm font-semibold text-fg">{micLabel}</p>
                  </div>

                  {sttSupported && (
                    <label
                      className="flex cursor-pointer items-center gap-2 text-sm text-slate-400"
                      title="Turn this off if you are not using headphones: the microphone will ignore the AI voices while they speak."
                    >
                      <input
                        type="checkbox"
                        checked={bargeInEnabled}
                        onChange={(e) => setBargeIn(e.target.checked)}
                        className="h-4 w-4 accent-blue-600"
                      />
                      Allow interruptions
                      <span className="text-xs text-slate-500">
                        (headphones recommended)
                      </span>
                    </label>
                  )}
                </div>

                {micError && (
                  <p className="mt-3 text-sm text-amber-400">{micError}</p>
                )}

                {sttSupported && !micError && (
                  <p className="mt-3 min-h-6 text-slate-300 italic">
                    {interimText ||
                      "Speak any time. Jump in when there's a gap, or cut in if you disagree."}
                  </p>
                )}

                <div className="mt-4 flex gap-2">
                  <input
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendTyped();
                    }}
                    placeholder="Or type your point and press Enter"
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-fg outline-none focus:border-blue-500"
                  />
                  {userSpeaking && (
                    <button
                      onClick={sendNow}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                    >
                      Send now
                    </button>
                  )}
                  <button
                    onClick={handleSendTyped}
                    disabled={!typed.trim()}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={16} />
                    Send
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

            {transcriptCard}
          </>
        )}
      </div>
    </div>
  );
}
