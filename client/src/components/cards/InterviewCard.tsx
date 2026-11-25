import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Mic } from "lucide-react";
import { getTopicLabel } from "@/constants/interview.constants";
import type {
  Difficulty,
  InterviewStatus,
  Topic,
} from "@/types/interview.types";
import { ScoreBadge, StatusBadge } from "./ScoreBadge";

interface InterviewCardProps {
  item: {
    interviewId: string;
    topic: Topic;
    difficulty: Difficulty;
    status: InterviewStatus;
    score: number;
    date: string;
  };
}

const cardClass =
  "group flex h-full flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm transition";

export default function InterviewCard({ item }: InterviewCardProps) {
  const completed = item.status === "COMPLETED";

  const body = (
    <>
      <div>
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
            <Mic size={18} />
          </span>
          <StatusBadge completed={completed} />
        </div>

        <h3 className="mt-4 font-semibold leading-snug text-fg">
          {getTopicLabel(item.topic)}
        </h3>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
          <span className="rounded-md bg-slate-800 px-2 py-0.5 font-medium">
            {item.difficulty}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays size={13} />
            {new Date(item.date).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
        {completed ? (
          <ScoreBadge score={item.score} />
        ) : (
          <span className="text-xs text-slate-500">Not finished</span>
        )}
        {completed && (
          <span className="flex items-center gap-1 text-sm font-medium text-blue-400 transition-all group-hover:gap-2">
            View feedback
            <ArrowRight size={14} />
          </span>
        )}
      </div>
    </>
  );

  // An unfinished interview has no feedback page to open.
  if (!completed) {
    return <div className={cardClass}>{body}</div>;
  }

  return (
    <Link
      to="/feedback/$interviewId"
      params={{ interviewId: item.interviewId }}
      className={`${cardClass} hover:-translate-y-0.5 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-600/10`}
    >
      {body}
    </Link>
  );
}
