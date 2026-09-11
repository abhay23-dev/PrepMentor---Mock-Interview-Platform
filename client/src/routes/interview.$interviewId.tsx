import { createFileRoute } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import InterviewSessionPage from "@/pages/InterviewSessionPage";

function InterviewSessionRoute() {
  return (
    <ProtectedRoute>
      <InterviewSessionPage />
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/interview/$interviewId")({
  component: InterviewSessionRoute,
});
