export default function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-900">

      <div className="border-b border-slate-800 p-6">
        <h1 className="text-2xl font-bold text-white">
          PrepMentor
        </h1>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">

          <li>Dashboard</li>

          <li>New Interview</li>

          <li>History</li>

          <li>Analytics</li>

          <li>Profile</li>

        </ul>
      </nav>

      <div className="border-t border-slate-800 p-4">
        <button className="w-full rounded-lg bg-red-600 py-2 text-white">
          Logout
        </button>
      </div>

    </aside>
  );
}

