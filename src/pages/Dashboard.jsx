import {
  CalendarDays,
  ClipboardList,
  FileSignature,
  FolderOpen,
  LayoutDashboard,
  Settings,
  UserRoundCog,
  Users,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";

const workspaceApps = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard, color: "odoo-icon-violet" },
  { label: "Staff Status Report", path: "/staff-status-report", icon: ClipboardList, color: "odoo-icon-cyan" },
  { label: "Interview Schedules", path: "/interview-schedules", icon: CalendarDays, color: "odoo-icon-orange" },
  { label: "Contract Generator", path: "/contract-generator", icon: FileSignature, color: "odoo-icon-emerald" },
  { label: "Staff Profiles", path: "/staff-profiles", icon: Users, color: "odoo-icon-pink" },
  { label: "Staff Roster", path: "/staff-roster", icon: UserRoundCog, color: "odoo-icon-blue" },
  { label: "Payroll", path: "/payroll", icon: Wallet, color: "odoo-icon-amber" },
  { label: "Admin Settings", path: "/settings", icon: Settings, color: "odoo-icon-purple" },
  { label: "Documents", path: "/documents", icon: FolderOpen, color: "odoo-icon-teal" },
];

export default function Dashboard() {
  return (
    <section className="odoo-launcher" aria-label="HR applications">
      <div className="odoo-launcher-pattern" />
      <div className="odoo-app-grid">
        {workspaceApps.map((app) => {
          const Icon = app.icon;
          return (
            <Link key={app.label} to={app.path} className="odoo-app group" aria-label={`Open ${app.label}`}>
              <span className={`odoo-app-icon ${app.color}`}>
                <Icon size={38} strokeWidth={2.15} />
              </span>
              <span className="odoo-app-label">{app.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
