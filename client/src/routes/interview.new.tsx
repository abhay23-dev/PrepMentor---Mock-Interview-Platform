import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuthStore } from "@/store/authStore";
import NewInterviewPage from "@/pages/NewInterviewPage";

export const Route = createFileRoute("/interview/new")({
  beforeLoad: () => {
    return ;
    // NOTE: match this to whatever guard pattern your dashboard.tsx route
    // already uses, so both routes behave consistently.
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
  component: NewInterviewPage,
});
