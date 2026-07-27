import { Link } from "@tanstack/react-router";
import { BarChart3, History, Home, Mic, Settings, User } from "lucide-react";

const menuItems = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: Home,
  },
  {
    label: "Mock Interviews",
    to: "/dashboard/interviews",
    icon: Mic,
  },
  {
    label: "Analytics",
    to: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    label: "Interview History",
    to: "/dashboard/history",
    icon: History,
  },
  {
    label: "Profile",
    to: "/dashboard/profile",
    icon: User,
  },
  {
    label: "Settings",
    to: "/dashboard/settings",
    icon: Settings,
  },
];


export default function Sidebar() {
  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900">
      <nav className="flex flex-col p-4">
        {
          menuItems.map((item) => {
            const Icon = item.icon;
            
            return (
              <Link
                key={item.to}
                to = {item.to}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            )
          })
        }
      </nav>
    </aside>
  )
}
