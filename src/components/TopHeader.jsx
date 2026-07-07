import { Bell, Search, UserCircle } from "lucide-react";

export default function TopHeader() {
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
      <div className="flex items-center gap-6">
        <button className="relative text-gray-500 hover:text-[var(--color-navy)] transition-colors">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[var(--color-emerald)] rounded-full border-2 border-white"></span>
        </button>
        <div className="flex items-center gap-3 pl-6 border-l border-[var(--color-border-grey)]">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-[var(--color-navy)]">HR Admin</p>
            <p className="text-xs text-gray-500">Human Resources</p>
          </div>
          <UserCircle size={36} className="text-[var(--color-navy-light)]" />
        </div>
      </div>
    </header>
  );
}
