import type { ReactNode } from "react";

interface StatCardProps {
    title: string;
    value: string;
    icon: ReactNode;
}

export default function StatCard({title, value, icon}: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg transition hover:border-blue-500">
        <div className="mb-4 text-blue-400">
            {icon}
        </div>
        <h3 className="text-sm font-medium text-slate-400">
            {title}
        </h3>
        <p className="mt-2 text-3xl font-bold text-white">
            {value}
        </p>
    </div>
  )
}
