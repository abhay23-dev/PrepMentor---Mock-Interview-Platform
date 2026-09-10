import { createFileRoute, redirect } from "@tanstack/react-router";
import { useAuthStore } from "@/store/authStore";
import InterviewSessionPage from "@/pages/InterviewSessionPage";

export const Route = createFileRoute("/interview/$interviewId")({
  beforeLoad: () => {
    return;
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
  component: InterviewSessionPage,
});
