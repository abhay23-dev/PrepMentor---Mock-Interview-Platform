import { createFileRoute } from "@tanstack/react-router";
import DashboardPage from "@/pages/DashboardPage";
import ProtectedRoute from "@/components/ProtectedRoute";

function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});