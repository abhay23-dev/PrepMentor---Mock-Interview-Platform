import { createRootRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import ThemeToggle from "@/components/ThemeToggle";

function RootLayout() {
  const initializeAuth = useAuthStore(
    (state) => state.initializeAuth
  );
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // The dashboard has the toggle in its top bar and the landing page in its
  // nav. Every other full-screen page gets a small floating one.
  const showFloatingToggle = pathname !== "/" && !pathname.startsWith("/dashboard");

  return (
    <>
      <Outlet />
      {showFloatingToggle && (
        <div className="fixed right-5 bottom-5 z-50">
          <ThemeToggle />
        </div>
      )}
    </>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});
