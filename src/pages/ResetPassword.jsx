import { useState } from "react";
import { Eye, EyeOff, KeyRound, LoaderCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../auth/AuthShell";
import useAuth from "../auth/useAuth";
import { supabase } from "../lib/supabase";

export default function ResetPassword() {
  const { session, loading, isConfigured } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (password.length < 10) {
      setError("Choose a password with at least 10 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setSubmitting(false);
      setError("This reset link is invalid or has expired. Request a new link and try again.");
      return;
    }

    await supabase.auth.signOut({ scope: "local" });
    navigate("/login", {
      replace: true,
      state: { message: "Your password has been updated. Sign in with your new password." },
    });
  };

  if (!loading && (!isConfigured || !session)) {
    return (
      <AuthShell footer="Password reset links can only be used once.">
        <KeyRound className="mb-5 text-slate-400" size={36} strokeWidth={1.8} />
        <h2 className="text-3xl font-bold text-slate-950">Reset link unavailable</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">This link is invalid or has expired. Request a fresh password reset email.</p>
        <Link to="/forgot-password" className="btn-primary mt-7 inline-flex h-10 items-center">
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell footer="Use a password that is unique to this HR account.">
      <p className="mb-2 text-xs font-bold uppercase text-emerald-600">Secure account recovery</p>
      <h2 className="text-3xl font-bold text-slate-950">Create a new password</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">Your new password must contain at least 10 characters.</p>

      {error && (
        <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        <div>
          <label htmlFor="new-password" className="label">New password</label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input-field auth-input-leading-trailing h-11"
              minLength={10}
              required
              autoFocus
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

        <div>
          <label htmlFor="confirm-password" className="label">Confirm new password</label>
          <input
            id="confirm-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="input-field h-11"
            minLength={10}
            required
          />
        </div>

        <button type="submit" disabled={submitting || loading} className="btn-primary flex h-11 w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60">
          {(submitting || loading) && <LoaderCircle className="animate-spin" size={18} />}
          {submitting ? "Updating password..." : "Update password"}
        </button>
      </form>
    </AuthShell>
  );
}
