export function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) {
    return <span className="text-slate-500">—</span>;
  }

  const tone =
    score >= 8
      ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/25"
      : score >= 5
        ? "bg-amber-500/10 text-amber-400 ring-amber-500/25"
        : "bg-red-500/10 text-red-400 ring-red-500/25";

  return (
    <span
      className={`inline-flex items-baseline gap-0.5 rounded-full px-2.5 py-1 text-sm font-semibold ring-1 ring-inset ${tone}`}
    >
      {score}
      <span className="text-xs font-medium opacity-70">/10</span>
    </span>
  );
}

export function StatusBadge({ completed }: { completed: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        completed
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-amber-500/10 text-amber-400"
      }`}
    >
      {completed ? "Completed" : "In progress"}
    </span>
  );
}
