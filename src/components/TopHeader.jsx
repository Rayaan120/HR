import { Bell, LogOut, Search, UserCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useAuth from "../auth/useAuth";

export default function TopHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || "HR Staff";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <header className="bg-white border-b border-[var(--color-border-grey)] h-16 flex items-center justify-between px-8 no-print sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search staff, contracts..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-[var(--color-border-grey)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald)]/20 transition-all"
          />
        </div>
      </div>
      <div className="flex items-center gap-3 sm:gap-6">
        <button type="button" className="relative text-gray-500 hover:text-[var(--color-navy)] transition-colors" aria-label="Notifications" title="Notifications">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[var(--color-emerald)] rounded-full border-2 border-white"></span>
        </button>
        <div className="flex items-center gap-3 pl-6 border-l border-[var(--color-border-grey)]">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-[var(--color-navy)]">{displayName}</p>
            <p className="max-w-48 truncate text-xs text-gray-500">{user?.email}</p>
          </div>
          <UserCircle size={36} className="text-[var(--color-navy-light)]" />
          <button
            type="button"
            onClick={handleSignOut}
            className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-950"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
