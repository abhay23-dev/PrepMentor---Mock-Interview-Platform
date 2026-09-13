import { createFileRoute } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import InterviewFeedbackPage from "@/pages/InterviewFeedbackPage";

function FeedbackRoute() {
  return (
    <ProtectedRoute>
      <InterviewFeedbackPage />
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/feedback/$interviewId")({
  component: FeedbackRoute,
});
