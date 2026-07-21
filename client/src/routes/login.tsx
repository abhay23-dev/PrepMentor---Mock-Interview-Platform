import LoginPage from "@/pages/LoginPage.tsx";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});