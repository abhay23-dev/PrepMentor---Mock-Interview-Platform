import { createFileRoute } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import NewGDPage from "@/pages/NewGDPage";

function NewGDRoute() {
  return (
    <ProtectedRoute>
      <NewGDPage />
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/gd/new")({
  component: NewGDRoute,
});
