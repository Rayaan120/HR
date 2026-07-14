import { LoaderCircle } from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";
import useAuth from "./useAuth";

export default function ProtectedRoute({ children }) {
  const { loading, session } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        <LoaderCircle className="animate-spin" size={24} aria-label="Checking your session" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
