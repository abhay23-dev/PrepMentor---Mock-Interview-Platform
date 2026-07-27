import PracticeSessionItem from "./PracticeSessionItem";

const sessions = [
    {
    title: "React Fundamentals",
    category: "Frontend",
    difficulty: "Medium",
    status: "Completed",
    score: 92,
    date: "Yesterday",
  },
  {
    title: "Node.js APIs",
    category: "Backend",
    difficulty: "Hard",
    status: "Completed",
    score: 84,
    date: "2 Days Ago",
  },
  {
    title: "Behavioral Interview",
    category: "HR",
    difficulty: "Easy",
    status: "Scheduled",
    date: "Tomorrow",
  },
];

export default function RecentPracticeSessions() {
  if(sessions.length === 0) {
    return (
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-8">
            <h2 className="text-xl font-semibold text-white">
                Recent Practice Sessions
            </h2>
            <p className="mt-4 text-slate-400">
                You haven't completed your practice sessions yet.
            </p>
        </section>
    );
  }

  return (
    <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-white">Recent Practice Sessions</h2>
        <div className="space-y-4">
            {sessions.map((session) => (
                <PracticeSessionItem
                    key={session.title}
                    title = {session.title}
                    category={session.category}
                    difficulty={session.difficulty}
                    status={session.status}
                    score={session.score}
                    date={session.date}
                 />
            ))}
        </div>
    </section>
  )
}
