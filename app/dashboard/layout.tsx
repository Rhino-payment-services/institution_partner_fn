"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  IconAdjustments,
  IconChevronSidebar,
  IconDotsVertical,
  IconLiquidation,
  IconMembers,
  IconOverview,
  IconReports,
  IconSaccos,
  IconSearch,
} from "@/components/dashboard-nav-icons";
import { ipc } from "@/lib/dashboard-ui";
import { useAuth } from "@/lib/auth-context";

const navItems = [
  { label: "Overview", href: "/dashboard", Icon: IconOverview },
  { label: "SACCOs", href: "/dashboard/saccos", Icon: IconSaccos },
  {
    label: "Members",
    href: "/dashboard/members",
    Icon: IconMembers,
    permission: "canManageMembers",
  },
  {
    label: "Staff",
    href: "/dashboard/staff",
    Icon: IconMembers,
    permission: "canManageMembers",
  },
  {
    label: "Liquidation",
    href: "/dashboard/liquidation",
    Icon: IconLiquidation,
    permission: "canRequestLiquidation",
  },
  { label: "Insights", href: "/dashboard/insights", Icon: IconReports, permission: "canViewTransactions" },
] as const;

const SIDEBAR_EXPANDED_PX = 288;
const SIDEBAR_COLLAPSED_PX = 80;
/** Space between the curved sidebar edge and the main column (top bar + content). */
const SIDEBAR_MAIN_GUTTER_PX = 20;

function isSidebarNavActive(pathname: string, itemHref: string): boolean {
  if (itemHref === "/dashboard") return pathname === "/dashboard";
  if (itemHref === "/dashboard/insights") {
    return (
      pathname === "/dashboard/insights" ||
      pathname === "/dashboard/reports" ||
      pathname.startsWith("/dashboard/insights/")
    );
  }
  if (itemHref === "/dashboard/liquidation") {
    return pathname === "/dashboard/liquidation" || pathname.startsWith("/dashboard/liquidation/");
  }
  return pathname === itemHref || pathname.startsWith(`${itemHref}/`);
}

function getInitials(from?: string | null) {
  if (!from?.trim()) return "?";
  const s = from.trim();
  if (s.includes("@")) {
    const local = s.split("@")[0] || "";
    const parts = local.replace(/[^a-zA-Z0-9.]/g, " ").split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase().slice(0, 2);
    }
    return local.slice(0, 2).toUpperCase() || "?";
  }
  return s.replace(/\D/g, "").slice(-2) || s.slice(0, 2).toUpperCase();
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isHydrated, user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const emailOrPhone = user?.email || user?.phone || "";
  const partnerName = user?.partner?.partnerName?.trim();
  const profileTitle =
    partnerName ||
    (emailOrPhone.includes("@") ? emailOrPhone.split("@")[0] : emailOrPhone) ||
    "Partner User";
  const profileSubtitle = emailOrPhone || "Signed in";

  const displayName = user?.email || user?.phone || "Partner User";
  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const displayedNavItems = useMemo(() => {
    const perms = user?.permissions || {};
    return navItems.filter((item) => {
      if (!("permission" in item) || !item.permission) return true;
      return Boolean((perms as Record<string, unknown>)[item.permission]);
    });
  }, [user?.permissions]);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace("/");
    }
  }, [isHydrated, isAuthenticated, router]);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated) return;
    if (user?.scope === "INSTITUTION") {
      router.replace("/sacco");
    }
  }, [isHydrated, isAuthenticated, user?.scope, router]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    function handleMouseDown(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [profileMenuOpen]);

  if (!isHydrated || !isAuthenticated) {
    return (
      <main className={`flex min-h-screen items-center justify-center ${ipc.pageBg} px-4`}>
        <p className="text-sm font-medium text-slate-700">Loading dashboard…</p>
      </main>
    );
  }

  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_PX : SIDEBAR_EXPANDED_PX;

  function navLinkClass(active: boolean) {
    const base =
      "group flex items-center gap-3 rounded-2xl text-sm font-medium transition-colors duration-200";
    if (sidebarCollapsed) {
      return [
        base,
        "justify-center px-3 py-3",
        active
          ? "bg-[var(--sidebar-base)] text-white shadow-sm"
          : "text-slate-600 hover:bg-[var(--sidebar-base-muted)]",
      ].join(" ");
    }
    return [
      base,
      "px-3 py-3",
      active
        ? "bg-[var(--sidebar-base)] text-white shadow-sm"
        : "text-slate-700 hover:bg-[var(--sidebar-base-muted)] hover:text-slate-900",
    ].join(" ");
  }

  function navIconClass(active: boolean) {
    return [
      "h-5 w-5 shrink-0",
      active ? "text-white" : "text-slate-500 group-hover:text-slate-800",
    ].join(" ");
  }

  const sidebarInner = (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={`shrink-0 px-4 pt-5 ${sidebarCollapsed ? "pb-3" : "pb-4"}`}
      >
        <div
          className={`flex items-start ${sidebarCollapsed ? "flex-col items-center gap-3" : "justify-between gap-2"}`}
        >
          <div className={`min-w-0 flex-1 ${sidebarCollapsed ? "text-center" : ""}`}>
            {!sidebarCollapsed ? (
              <div className="min-w-0 pr-1 pt-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  RukaPay
                </p>
                <p className="truncate text-base font-semibold leading-tight text-slate-900">
                  Partner Console
                </p>
              </div>
            ) : (
              <>
                <span className="sr-only">RukaPay Partner Console</span>
                <p className="text-[10px] font-bold uppercase leading-snug tracking-[0.08em] text-[var(--sidebar-base)]">
                  Ruka
                  <br />
                  Pay
                </p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 ${sidebarCollapsed ? "rotate-180" : ""}`}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <IconChevronSidebar className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!sidebarCollapsed && (
        <div className="shrink-0 px-4 pb-4">
          <label className="relative block">
            <span className="sr-only">Search</span>
            <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search…"
              className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-11 pr-11 text-sm text-slate-900 shadow-sm shadow-slate-900/[0.03] outline-none ring-0 transition placeholder:text-slate-400 focus:border-[color-mix(in_srgb,var(--sidebar-base)_35%,#e2e8f0)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--sidebar-base)_22%,transparent)]"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Search options"
            >
              <IconAdjustments className="h-[18px] w-[18px]" />
            </button>
          </label>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {!sidebarCollapsed && (
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Menu
          </p>
        )}
        <nav className="flex flex-col gap-1" aria-label="Sidebar">
          {displayedNavItems.map((item) => {
            const active = isSidebarNavActive(pathname, item.href);
            const Icon = item.Icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={sidebarCollapsed ? item.label : undefined}
                className={navLinkClass(active)}
              >
                <Icon className={navIconClass(active)} />
                <span className={sidebarCollapsed ? "sr-only" : ""}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="shrink-0 border-t border-slate-100 p-3">
        <div
          className={`relative ${sidebarCollapsed ? "flex justify-center" : ""}`}
          ref={profileRef}
        >
          <div
            className={`flex items-center gap-3 rounded-2xl bg-gradient-to-br from-slate-50 to-white p-2.5 ring-1 ring-slate-200/80 ${sidebarCollapsed ? "flex-col p-2" : ""}`}
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--sidebar-base)_12%,white)] text-sm font-semibold text-[var(--sidebar-base)] ring-2 ring-white"
              aria-hidden
            >
              {initials}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900" title={profileTitle}>
                  {profileTitle}
                </p>
                <p className="truncate text-xs text-slate-500" title={profileSubtitle}>
                  {profileSubtitle}
                </p>
              </div>
            )}
            {!sidebarCollapsed && (
              <button
                type="button"
                onClick={() => setProfileMenuOpen((o) => !o)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
                aria-label="Account menu"
              >
                <IconDotsVertical className="h-5 w-5" />
              </button>
            )}
            {sidebarCollapsed && (
              <button
                type="button"
                onClick={() => setProfileMenuOpen((o) => !o)}
                className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
                aria-label="Account menu"
              >
                <IconDotsVertical className="h-4 w-4" />
              </button>
            )}
          </div>
          {profileMenuOpen && (
            <div
              className="absolute bottom-full right-0 z-50 mb-2 min-w-[160px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-900/10"
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                onClick={() => {
                  setProfileMenuOpen(false);
                  logout();
                  router.replace("/");
                }}
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <main className={`min-h-screen ${ipc.pageBg}`}>
      <nav
        className="sticky top-0 z-50 flex gap-1 border-b border-slate-200/80 bg-white/95 px-2 py-2 shadow-sm shadow-slate-900/[0.04] backdrop-blur-md lg:hidden"
        aria-label="Main"
      >
        {displayedNavItems.map((item) => {
          const active = isSidebarNavActive(pathname, item.href);
          const Icon = item.Icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-center text-[11px] font-semibold leading-tight transition-colors ${
                active
                  ? "bg-[var(--sidebar-base)] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className={`h-5 w-5 shrink-0 ${active ? "text-white" : "text-slate-500"}`} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <aside
        style={{ width: sidebarWidth }}
        className="fixed bottom-0 left-0 top-0 z-40 hidden h-screen flex-col overflow-hidden rounded-r-[28px] border border-slate-100/90 bg-white shadow-[8px_0_48px_-20px_rgba(15,23,42,0.14)] transition-[width] duration-300 ease-out lg:flex"
        aria-label="Partner console navigation"
      >
        {sidebarInner}
      </aside>

      <div
        className="flex min-h-screen flex-col pl-0 transition-[padding-left] duration-300 ease-out lg:pl-[var(--dashboard-sidebar-offset)]"
        style={
          {
            "--dashboard-sidebar-offset": `${sidebarWidth + SIDEBAR_MAIN_GUTTER_PX}px`,
          } as React.CSSProperties
        }
      >
        <div className="flex min-h-screen flex-col lg:gap-5 lg:pr-5 lg:pb-5">
          <header className="sticky top-16 z-30 shrink-0 border-b border-slate-200/90 bg-white/95 shadow-sm shadow-slate-900/[0.06] backdrop-blur-md lg:top-0 lg:rounded-tl-[28px]">
            <div className="flex w-full items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Institution Partner Console
                </p>
                <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900 md:text-xl">
                  <span className="text-[var(--sidebar-base)]">
                    {user?.partner?.partnerName || "Institution Partner"}
                  </span>
                </h1>
              </div>
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.replace("/");
                }}
                className={`${ipc.btnSecondary} lg:hidden`}
              >
                Logout
              </button>
            </div>
          </header>

          <div className="w-full min-h-0 flex-1 px-4 pb-6 pt-6 sm:px-6 lg:px-8 lg:pb-8 lg:pt-0 xl:px-10">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
