import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Mic, History, BarChart3, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/interviews", label: "Interviews", icon: Mic },
  { to: "/dashboard/history", label: "History", icon: History },
  { to: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
] as const;

export default function Sidebar() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 p-6">
        <h1 className="text-2xl font-bold text-white">PrepMentor</h1>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === to : pathname.startsWith(to);
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-600/10 text-blue-400"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-slate-800 p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600/10 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-600 hover:text-white"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
