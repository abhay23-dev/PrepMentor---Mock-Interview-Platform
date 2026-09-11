import { createFileRoute, redirect } from "@tanstack/react-router";
import { useAuthStore } from "@/store/authStore";
import NewInterviewPage from "@/pages/NewInterviewPage";

export const Route = createFileRoute("/interview/new")({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
  component: NewInterviewPage,
});
