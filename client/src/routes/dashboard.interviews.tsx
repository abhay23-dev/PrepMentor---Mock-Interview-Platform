import { createFileRoute } from "@tanstack/react-router";
import MockInterviewsHubPage from "@/pages/MockInterviewsHubPage";

export const Route = createFileRoute("/dashboard/interviews")({
  component: MockInterviewsHubPage,
});
