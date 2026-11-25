import {
  BarChart3,
  History,
  LayoutDashboard,
  Mic,
  Users,
} from "lucide-react";

// Every item has the same shape (including `exact`) so TypeScript infers one
// consistent type for the whole array.
export const NAV_ITEMS = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
    description:
      "Your home base: stats, recent interviews and group discussions at a glance.",
  },
  {
    to: "/dashboard/interviews",
    label: "Mock Interviews",
    icon: Mic,
    exact: false,
    description:
      "Start an AI interview on a topic you choose. Answer by voice or text and get scored.",
  },
  {
    to: "/dashboard/discussions",
    label: "Group Discussion",
    icon: Users,
    exact: false,
    description:
      "Join a live discussion with AI participants. Every past session is a card with its feedback.",
  },
  {
    to: "/dashboard/history",
    label: "History",
    icon: History,
    exact: false,
    description:
      "Browse and filter every past interview, and open its detailed feedback.",
  },
  {
    to: "/dashboard/analytics",
    label: "Analytics",
    icon: BarChart3,
    exact: false,
    description:
      "See score trends and which topics and difficulty levels need more practice.",
  },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];

export const isNavItemActive = (item: NavItem, pathname: string) => {
  const path = pathname.replace(/\/+$/, "") || "/";
  return item.exact
    ? path === item.to
    : path === item.to || path.startsWith(`${item.to}/`);
};
