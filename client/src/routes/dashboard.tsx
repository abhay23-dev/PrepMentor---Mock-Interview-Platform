import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { useAuthStore } from "@/store/authStore";

function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 p-4">
        <h2 className="text-xl font-bold mb-6">PrepMentor</h2>

        <nav className="flex flex-col gap-3">
          <Link to="/dashboard" className="hover:text-blue-400">Dashboard</Link>
          <Link to="/dashboard/interviews" className="hover:text-blue-400">Interviews</Link>
          <Link to="/dashboard/history" className="hover:text-blue-400">History</Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <Outlet />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/dashboard")({
  // The root route's beforeLoad has already awaited the auth check by the
  // time this runs, so isAuthenticated reflects the real, verified state
  // (not a default/loading value) — safe to redirect on here.
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
  component: DashboardLayout,
});
