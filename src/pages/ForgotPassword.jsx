import { useState } from "react";
import { ArrowLeft, CheckCircle2, LoaderCircle, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import AuthShell from "../auth/AuthShell";
import useAuth from "../auth/useAuth";
import { supabase } from "../lib/supabase";

export default function ForgotPassword() {
  const { isConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!isConfigured) {
      setError("Authentication is not configured yet. Contact your administrator.");
      return;
    }

    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);

    if (resetError) {
      setError("We could not send a reset email right now. Please wait a moment and try again.");
      return;
    }

    setSent(true);
  };

  if (sent) {
    return (
      <AuthShell footer="For security, reset links expire after a limited time.">
        <CheckCircle2 className="mb-5 text-emerald-600" size={36} strokeWidth={1.8} />
        <h2 className="text-3xl font-bold text-slate-950">Check your email</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          If an approved staff account exists for <strong>{email}</strong>, a password reset link is on its way.
        </p>
        <Link to="/login" className="btn-secondary mt-7 inline-flex h-10 items-center gap-2">
          <ArrowLeft size={17} />
          Back to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell footer="Only approved staff email addresses can receive a reset link.">
      <Link to="/login" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
        <ArrowLeft size={17} />
        Back to sign in
      </Link>

      <h2 className="text-3xl font-bold text-slate-950">Reset your password</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">Enter your work email and we'll send you a secure reset link.</p>

      {error && (
        <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        <div>
          <label htmlFor="reset-email" className="label">Work email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input-field auth-input-leading h-11"
              placeholder="name@company.com"
              required
              autoFocus
            />
          </div>
        </div>
        <button type="submit" disabled={submitting} className="btn-primary flex h-11 w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60">
          {submitting && <LoaderCircle className="animate-spin" size={18} />}
          {submitting ? "Sending link..." : "Send reset link"}
        </button>
      </form>
    </AuthShell>
  );
}
