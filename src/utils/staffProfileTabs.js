import {
  BriefcaseBusiness,
  CalendarDays,
  Files,
  LayoutDashboard,
  TrendingUp,
  WalletCards,
} from "lucide-react";

export const STAFF_PROFILE_TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "employment", label: "Employment", icon: BriefcaseBusiness },
  { id: "financial", label: "Financial", icon: WalletCards },
  { id: "performance", label: "Performance", icon: TrendingUp },
  { id: "roster", label: "Work Roster", icon: CalendarDays },
  { id: "documents", label: "Documents", icon: Files },
];
