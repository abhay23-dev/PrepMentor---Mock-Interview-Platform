import { Navigate } from "@tanstack/react-router";
import { useAuthStore } from "@/store/authStore";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export default function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore(
    (state) => state.isAuthenticated
  );

  const isLoading = useAuthStore(
    (state) => state.isLoading
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
}