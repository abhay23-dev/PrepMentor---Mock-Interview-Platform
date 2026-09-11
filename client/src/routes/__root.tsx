import { createRootRoute, Outlet } from "@tanstack/react-router";
import { ensureAuthInitialized } from "@/store/authStore";

function RootLayout() {
  return <Outlet />;
}

export const Route = createRootRoute({
  // Runs once, before any route (including protected ones) resolves.
  // Every route's own beforeLoad executes after its parent's, so by the
  // time dashboard/interview routes check isAuthenticated, the token has
  // already been verified against the backend — no more racing an effect.
  beforeLoad: async () => {
    await ensureAuthInitialized();
  },
  component: RootLayout,
  pendingComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      Loading...
    </div>
  ),
});
