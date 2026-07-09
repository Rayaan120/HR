import { NavLink } from "react-router-dom";
import {
  CalendarDays,
  FileSignature,
  FolderOpen,
  LayoutDashboard,
  Settings,
  Users,
  UserRoundCog,
  Wallet,
  ClipboardList,
} from "lucide-react";

const navItems = [
  { path: "/", icon: <LayoutDashboard size={17} />, label: "Dashboard" },
  { icon: <ClipboardList size={17} />, label: "Staff Status Report", disabled: true },
  { icon: <CalendarDays size={17} />, label: "Interview Schedules", disabled: true },
  { path: "/contract-generator", icon: <FileSignature size={17} />, label: "Contract Generator" },
  { path: "/staff-profiles", icon: <Users size={17} />, label: "Staff Profiles" },
  { icon: <UserRoundCog size={17} />, label: "Staff Roaster", disabled: true },
  { icon: <Wallet size={17} />, label: "Payroll", disabled: true },
  { path: "/settings", icon: <Settings size={17} />, label: "Admin Settings" },
  { path: "/documents", icon: <FolderOpen size={17} />, label: "Documents" },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-[var(--color-border-grey)] h-screen flex flex-col no-print fixed left-0 top-0 shadow-sm">
      <div className="px-5 py-4 border-b border-[var(--color-border-grey)]">
        <h1 className="text-base font-bold text-[var(--color-navy)] leading-tight">HR System</h1>
        <p className="text-xs text-gray-500 mt-1">Contract & Staff Management</p>
      </div>
      <nav className="flex-1 px-3 py-3 flex flex-col gap-1">
        {navItems.map((item) =>
          item.disabled ? (
            <button
              key={item.label}
              type="button"
              className="sidebar-link sidebar-link-disabled"
              disabled
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ) : (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </NavLink>
          )
        )}
      </nav>
      <div className="p-4 border-t border-[var(--color-border-grey)] text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} HR System
      </div>
    </aside>
  );
}
