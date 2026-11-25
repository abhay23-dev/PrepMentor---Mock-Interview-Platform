import { Link, useRouterState } from "@tanstack/react-router";
import { useAuthStore } from "@/store/authStore";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { NAV_ITEMS, isNavItemActive } from "./navItems";

export default function TopBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = useAuthStore((state) => state.user);

  const current = NAV_ITEMS.find((item) => isNavItemActive(item, pathname));
  const initial = (user?.name ?? "?").charAt(0).toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-800 bg-slate-950/80 px-4 backdrop-blur md:px-8">
        <div className="min-w-0">
          <div className="md:hidden">
            <Logo size="sm" />
          </div>
          <h2 className="hidden truncate text-lg font-semibold text-fg md:block">
            {current?.label ?? "PrepMentor"}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div
            title={user?.name}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-violet-500 text-sm font-bold text-white md:hidden"
          >
            {initial}
          </div>
        </div>
      </header>

      {/* Small screens have no sidebar, so show the menu as a scrollable row. */}
      <nav className="flex gap-2 overflow-x-auto border-b border-slate-800 px-4 py-2 md:hidden">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isNavItemActive(item, pathname);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-fg"
              }`}
            >
              <Icon size={15} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
