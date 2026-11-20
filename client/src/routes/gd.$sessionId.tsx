import { createFileRoute } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import GDSessionPage from "@/pages/GDSessionPage";

function GDSessionRoute() {
  return (
    <ProtectedRoute>
      <GDSessionPage />
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/gd/$sessionId")({
  component: GDSessionRoute,
});
