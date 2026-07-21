import LandingPage from "@/pages/LandingPage.tsx";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: LandingPage,
});
