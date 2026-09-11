import { createFileRoute } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import NewInterviewPage from "@/pages/NewInterviewPage";

function NewInterviewRoute() {
  return (
    <ProtectedRoute>
      <NewInterviewPage />
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/interview/new")({
  component: NewInterviewRoute,
});
