import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

function RootLayout() {
  const initializeAuth = useAuthStore(
    (state) => state.initializeAuth
  );

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return <Outlet />;
}

export const Route = createRootRoute({
  component: RootLayout,
});