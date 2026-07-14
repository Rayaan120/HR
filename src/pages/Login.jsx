import { useState } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import AuthShell from "../auth/AuthShell";
import useAuth from "../auth/useAuth";
import { supabase } from "../lib/supabase";

export default function Login() {
  const { session, loading, isConfigured } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!loading && session) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!isConfigured) {
      setError("Authentication is not configured yet. Add the Supabase environment variables to continue.");
      return;
    }

    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSubmitting(false);

    if (signInError) {
      setError("The email or password is incorrect, or this account is not authorized.");
      return;
    }

    const destination = location.state?.from?.pathname || "/";
    navigate(destination, { replace: true });
  };

  return (
    <AuthShell footer="Access is limited to accounts approved by your administrator.">
      <div className="mb-8">
        <p className="mb-2 text-xs font-bold uppercase text-emerald-600">Internal staff portal</p>
        <h2 className="text-3xl font-bold text-slate-950">Sign in to your account</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">Use your work email address and password.</p>
      </div>

      {!isConfigured && (
        <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900" role="status">
          Auth setup is required. Add the values from <code className="font-semibold">.env.example</code> to your local environment.
        </div>
      )}

      {location.state?.message && (
        <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          {location.state.message}
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="login-email" className="label">Work email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input-field auth-input-leading h-11"
              placeholder="name@company.com"
              required
              autoFocus
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-4">
            <label htmlFor="login-password" className="label mb-0">Password</label>
            <Link to="/forgot-password" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input-field auth-input-leading-trailing h-11"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary flex h-11 w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60">
          {submitting && <LoaderCircle className="animate-spin" size={18} />}
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}
