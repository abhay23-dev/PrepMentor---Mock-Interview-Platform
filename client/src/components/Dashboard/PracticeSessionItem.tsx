import { ArrowRight } from "lucide-react";

interface PracticeSessionItemProps {
    title: string;
    category: string;
    difficulty: "Easy" | "Medium" | "Hard";
    status: "Completed" | "Scheduled" | "InProgress";
    score? : number;
    date: string;
}

const statusClasses = {
    Completed: "bg-green-500/20 text-green-400",
    Scheduled: "bg-blue-500/20 text-blue-400",
    "In Progress": "bg-yellow-500/20 text-yellow-400"
};

const difficultyClasses = {
    Easy: "bg-emerald-500/20 text-emerald-400",
    Medium: "bg-yellow-500/20 text-yellow-400",
    Hard: "bg-red-500/20 text-red-400"
};


export default function PracticeSessionItem({
    title,
    category,
    difficulty,
    status,
    score,
    date
}: PracticeSessionItemProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-blue-500">
        <div className="space-y-3">
            <div>
                <h3 className="text-lg font-semibold text-white">
                    {title}
                </h3>
                <p className="text-sm text-slate-400">
                    {category}
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${difficultyClasses[difficulty]}`}>
                    {difficulty}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusClasses[status]}`}>
                    {status}
                </span>
            </div>

            {
                score !== undefined && (
                    <p className="text-white font-semibold">
                        Score: {score}%
                    </p>
                )
            }

            <p className="text-sm text-slate-500">
                {date}
            </p>
        </div>

        <ArrowRight 
            size={22}
            className="text-blue-500"
        />
    </div>
  )
}
