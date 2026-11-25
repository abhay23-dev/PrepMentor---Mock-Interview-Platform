import { createFileRoute } from "@tanstack/react-router";
import DiscussionsPage from "@/pages/DiscussionsPage";

export const Route = createFileRoute("/dashboard/discussions")({
  component: DiscussionsPage,
});
