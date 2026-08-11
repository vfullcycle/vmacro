import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth-context";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="loading">กำลังโหลด...</p>;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return <>{children}</>;
}
