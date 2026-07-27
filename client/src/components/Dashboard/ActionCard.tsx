import { Link } from "@tanstack/react-router";
import { ArrowRight} from "lucide-react";
import type { ReactNode } from "react";

interface ActionCardProps {
    title: string;
    description: string;
    icon: ReactNode;
    to: string
}

export default function ActionCard({title, description, icon, to}: ActionCardProps) {
  return (
    <Link
        to={to}
        className="flex flex-col border border-slate-800 bg-slate-900 p-6 transtition-all hover:-translate-y-1 hover:border-blue-500 hover:shadow-xl"
    >
        <div className="mb-5 text-blue-500">
            {icon}
        </div>

        <h3 className="text-lg font-semibold text-white">
            {title} 
        </h3>

        <p className="mt-2 text-sm text-slate-400">
            {description}
        </p>

        <div className="mt-auto flex justify-end pt-6">
            <ArrowRight className="text-blue-500" size={22} />
        </div>
    </Link>
  )
}
