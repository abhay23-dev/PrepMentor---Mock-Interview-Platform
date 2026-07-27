import { BarChart3, Code2, FileText, Mic } from "lucide-react"
import ActionCard from "./ActionCard";

const actions = [
    {
        title: "Start Interview",
        description: "Begin an AI mock interview session",
        icon: Mic,
        to: "/interview/new"
    },
    {
        title: "Practice DSA",
        description: "Solve Coding Problems",
        icon: Code2,
        to: "/dashboard/practice"
    },
    {
        title: "Resume Review",
        description: "Get AI feedback on your resume",
        icon: FileText,
        to: "/dashboard/resume"
    },
    {
        title: "Analytics",
        description: "Track your interview progress",
        icon: BarChart3,
        to: "/dashboard/analytics"
    },
]

export default function QuickActions() {
  return (
    <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-white">
            Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {actions.map((action) => {
                const Icon = action.icon;

                return (
                    <ActionCard
                        key = {action.title}
                        title = {action.title}
                        description= {action.description}
                        icon = {<Icon size={28} />}
                        to = {action.to}
                    />
                )
            })}
        </div>
    </section>
  )
}
