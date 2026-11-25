import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Clock, Users } from "lucide-react";
import type { GDHistoryItem } from "@/types/gd.types";
import { ScoreBadge, StatusBadge } from "./ScoreBadge";

export default function GDSessionCard({ item }: { item: GDHistoryItem }) {
  const completed = item.status === "COMPLETED";

  return (
    <Link
      to="/gd/$sessionId"
      params={{ sessionId: item.sessionId }}
      className="group flex h-full flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-600/10"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-blue-400">
            <Users size={18} />
          </span>
          <StatusBadge completed={completed} />
        </div>

        <h3 className="mt-4 line-clamp-2 font-semibold leading-snug text-fg">
          {item.topic}
        </h3>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={13} />
            {new Date(item.date).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
          <span className="flex items-center gap-1.5">
            <Users size={13} />
            {item.numParticipants} AI + you
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={13} />
            {Math.round(item.timerDuration / 60)} min
          </span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
        {completed ? (
          <ScoreBadge score={item.score} />
        ) : (
          <span className="text-xs text-slate-500">Not finished</span>
        )}
        <span className="flex items-center gap-1 text-sm font-medium text-blue-400 transition-all group-hover:gap-2">
          {completed ? "View feedback" : "Open"}
          <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  );
}
