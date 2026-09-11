import { createFileRoute, Outlet } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";

function DashboardLayout() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});