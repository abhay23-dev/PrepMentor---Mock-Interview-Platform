import { createFileRoute } from "@tanstack/react-router";
import InterviewHistoryPage from "@/pages/InterviewHistoryPage";

export const Route = createFileRoute("/dashboard/history")({
  component: InterviewHistoryPage,
});
