import { useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Grid3X3, LogOut, Save } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import useAuth from "../auth/useAuth";

export default function TopHeader({ isLauncher = false }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || "HR Staff";
  const initial = displayName.trim().charAt(0).toUpperCase() || "H";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const handleBackToApps = () => {
    if (location.pathname === "/contract-generator") {
      setShowDraftPrompt(true);
      return;
    }
    navigate("/");
  };

  const leaveContractGenerator = (saveDraft) => {
    if (saveDraft) {
      window.dispatchEvent(new CustomEvent("contract-generator-save-draft"));
    }
    setShowDraftPrompt(false);
    navigate("/");
  };

  return (
    <header className="odoo-topbar no-print">
      <div className="flex min-w-0 items-center">
        {isLauncher ? (
          <div className="odoo-brand">
            <Grid3X3 size={18} />
            <span>HR System</span>
          </div>
        ) : (
          <button type="button" onClick={handleBackToApps} className="odoo-back-button">
            <ArrowLeft size={17} />
            <span>Back to Apps</span>
          </button>
        )}
      </div>

      <div className="odoo-account-area">
        <span className="odoo-company-name">Greek Souvlaki</span>
        <span className="odoo-user-name">{displayName}</span>
        <span className="odoo-avatar" aria-hidden="true">{initial}</span>
        <button
          type="button"
          onClick={handleSignOut}
          className="odoo-logout"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut size={17} />
        </button>
      </div>

      {showDraftPrompt && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-[2px]">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-draft-title"
            className="w-full max-w-md rounded-2xl border border-white/70 bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Save size={23} />
            </div>
            <h2 id="save-draft-title" className="text-xl font-bold text-slate-900">Save this contract draft?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Save the information you entered before returning to the apps page.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => leaveContractGenerator(true)}
                className="rounded-xl bg-violet-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => leaveContractGenerator(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                No
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
