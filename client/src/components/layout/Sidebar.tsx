import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import Logo from "@/components/Logo";
import { NAV_ITEMS, isNavItemActive } from "./navItems";
import type { NavItem } from "./navItems";

// One sidebar entry. Hovering (or keyboard-focusing) it shows a small card
// explaining the feature. The card is `position: fixed`, positioned from the
// item's bounding box, so it can never be clipped by the sidebar's edges.
function SidebarItem({ item, active }: { item: NavItem; active: boolean }) {
  const itemRef = useRef<HTMLLIElement>(null);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(
    null,
  );
  const Icon = item.icon;

  const open = () => {
    const rect = itemRef.current?.getBoundingClientRect();
    if (rect) setAnchor({ top: rect.top + rect.height / 2, left: rect.right + 14 });
  };
  const close = () => setAnchor(null);

  return (
    <li
      ref={itemRef}
      onMouseEnter={open}
      onMouseLeave={close}
      onFocus={open}
      onBlur={close}
    >
      <Link
        to={item.to}
        className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
          active
            ? "bg-blue-600/10 text-blue-400"
            : "text-slate-400 hover:bg-slate-800 hover:text-fg"
        }`}
      >
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
            active
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
              : "bg-slate-800 text-slate-400 group-hover:text-blue-400"
          }`}
        >
          <Icon size={17} />
        </span>
        {item.label}
      </Link>

      {anchor && (
        <div
          role="tooltip"
          style={{ top: anchor.top, left: anchor.left }}
          className="hovercard-enter pointer-events-none fixed z-[60] w-64"
        >
          <div className="relative rounded-xl border border-slate-700 bg-slate-900 p-3.5 shadow-xl shadow-black/10">
            <span className="absolute top-1/2 -left-[7px] h-3 w-3 -translate-y-1/2 rotate-45 border-b border-l border-slate-700 bg-slate-900" />
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/10 text-blue-400">
                <Icon size={15} />
              </span>
              <p className="text-sm font-semibold text-fg">{item.label}</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {item.description}
            </p>
          </div>
        </div>
      )}
    </li>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  const initial = (user?.name ?? "?").charAt(0).toUpperCase();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900 md:flex">
      <div className="flex h-16 items-center border-b border-slate-800 px-5">
        <Logo />
      </div>

      <nav className="flex-1 px-3 py-5">
        <p className="mb-3 px-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Menu
        </p>
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <SidebarItem
              key={item.to}
              item={item}
              active={isNavItemActive(item, pathname)}
            />
          ))}
        </ul>
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-800 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-violet-500 text-sm font-bold text-white">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fg">
              {user?.name ?? "Guest"}
            </p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600/10 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-600 hover:text-white"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
