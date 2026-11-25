import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { gdService } from "@/services/gdService";
import GDSessionCard from "@/components/cards/GDSessionCard";
import type { GDHistoryItem } from "@/types/gd.types";

type Filter = "ALL" | "COMPLETED" | "ONGOING";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ONGOING", label: "In progress" },
];

export default function DiscussionsPage() {
  const [items, setItems] = useState<GDHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setItems(await gdService.getHistory());
    } catch {
      setError("Couldn't load your group discussions.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => items.filter((i) => filter === "ALL" || i.status === filter),
    [items, filter],
  );

  const completed = items.filter((i) => i.status === "COMPLETED");
  const scores = completed
    .map((i) => i.score)
    .filter((s): s is number => s !== null);
  const average =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-6 rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">Group Discussions</h1>
          <p className="mt-2 max-w-xl text-slate-400">
            Practice with AI participants who talk back. Each past session is a
            card below. Open it to read your feedback and the full transcript.
          </p>
          {!isLoading && !error && items.length > 0 && (
            <p className="mt-3 text-sm text-slate-500">
              {items.length} session{items.length === 1 ? "" : "s"}
              {average !== null && ` · average score ${average}/10`}
            </p>
          )}
        </div>

        <Link
          to="/gd/new"
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700"
        >
          <Users size={18} />
          Start Discussion
        </Link>
      </section>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filter === f.value
                ? "bg-blue-600 text-white"
                : "border border-slate-700 bg-slate-900 text-slate-400 hover:text-fg"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-2xl border border-slate-800 bg-slate-900"
            />
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-4">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => void load()}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-800"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-400">
            <Users size={22} />
          </span>
          <p className="text-slate-400">
            No group discussions yet. Start one and your feedback will appear
            here.
          </p>
        </div>
      )}

      {!isLoading && !error && items.length > 0 && filtered.length === 0 && (
        <p className="text-slate-400">No discussions match this filter.</p>
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <GDSessionCard key={item.sessionId} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
