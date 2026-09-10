// import { createFileRoute } from "@tanstack/react-router";
// import DashboardPage from "@/pages/DashboardPage";
// import ProtectedRoute from "@/components/ProtectedRoute";

// function Dashboard() {
//   return (
//     //<ProtectedRoute>
//       <DashboardPage />
//     //</ProtectedRoute>
//   );
// }

// export const Route = createFileRoute("/dashboard")({
//   component: Dashboard,
// });

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuthStore } from "@/store/authStore";

function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 p-4">
        <h2 className="text-xl font-bold mb-6">PrepMentor</h2>

        <nav className="flex flex-col gap-3">
          <a href="/dashboard" className="hover:text-blue-400">Dashboard</a>
          <a href="/dashboard/interviews" className="hover:text-blue-400">Interviews</a>
          <a href="/dashboard/history" className="hover:text-blue-400">History</a>
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
  beforeLoad: () => {
    return;
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
  component: DashboardLayout,
});