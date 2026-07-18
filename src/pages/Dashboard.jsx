import {
  CalendarDays,
  ClipboardList,
  DoorOpen,
  FileSignature,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Network,
  Settings,
  ShieldCheck,
  UserRoundCog,
  Users,
  UserX,
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
  { label: "Social Insurance", path: "/social-insurance", icon: ShieldCheck, color: "odoo-icon-emerald" },
  { label: "Chats & Announcements", path: "/chats", icon: MessageSquare, color: "odoo-icon-blue" },
  { label: "Exit Interviews", path: "/exit-interviews", icon: DoorOpen, color: "odoo-icon-orange" },
  { label: "Terminations", path: "/terminations", icon: UserX, color: "odoo-icon-pink" },
  { label: "Trainings", path: "/trainings", icon: GraduationCap, color: "odoo-icon-cyan" },
  { label: "Org Chart", path: "/org-chart", icon: Network, color: "odoo-icon-purple" },
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
