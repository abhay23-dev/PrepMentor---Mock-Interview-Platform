export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="p-6 bg-slate-900 rounded-xl border border-slate-800">
          <p className="text-slate-400 text-sm">Total Interviews</p>
          <h2 className="text-2xl font-bold mt-2">12</h2>
        </div>

        <div className="p-6 bg-slate-900 rounded-xl border border-slate-800">
          <p className="text-slate-400 text-sm">Avg Score</p>
          <h2 className="text-2xl font-bold mt-2">7.5</h2>
        </div>

        <div className="p-6 bg-slate-900 rounded-xl border border-slate-800">
          <p className="text-slate-400 text-sm">Completed</p>
          <h2 className="text-2xl font-bold mt-2">9</h2>
        </div>

      </div>
    </div>
  );
}