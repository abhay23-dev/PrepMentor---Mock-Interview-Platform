import { createFileRoute } from "@tanstack/react-router";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardLayout />
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});
