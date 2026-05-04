"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  IconLiquidation,
  IconMembers,
  IconOverview,
  IconReports,
} from "@/components/dashboard-nav-icons";
import { useAuth } from "@/lib/auth-context";
import { ipc } from "@/lib/dashboard-ui";

const navItems = [
  { label: "Overview", href: "/sacco", Icon: IconOverview },
  {
    label: "Transactions",
    href: "/sacco/transactions",
    Icon: IconReports,
    permission: "canViewTransactions",
  },
  {
    label: "Members",
    href: "/sacco/members",
    Icon: IconMembers,
    permission: "canManageMembers",
  },
  {
    label: "Liquidation",
    href: "/sacco/liquidation",
    Icon: IconLiquidation,
    permission: "canRequestLiquidation",
  },
] as const;

export default function SaccoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isHydrated, isAuthenticated, user, logout } = useAuth();

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace("/");
    }
  }, [isHydrated, isAuthenticated, router]);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated) return;
    if (user?.scope !== "INSTITUTION") {
      router.replace("/dashboard");
    }
  }, [isHydrated, isAuthenticated, user?.scope, router]);

  if (!isHydrated || !isAuthenticated) {
    return (
      <main className={`flex min-h-screen items-center justify-center px-4 ${ipc.pageBg}`}>
        <p className="text-sm font-medium text-slate-700">Loading SACCO dashboard...</p>
      </main>
    );
  }

  const permissions = user?.permissions || {};
  const displayedNavItems = navItems.filter((item) => {
    if (!("permission" in item) || !item.permission) return true;
    return Boolean((permissions as Record<string, unknown>)[item.permission]);
  });

  return (
    <main className={`min-h-screen ${ipc.pageBg}`}>
      <div className="flex h-screen w-full gap-4 p-3 lg:gap-5 lg:p-5">
        <aside className={`hidden h-full w-64 shrink-0 ${ipc.card} ${ipc.cardPad} lg:flex lg:flex-col`}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">SACCO console</p>
          <p className="mt-1 truncate text-base font-semibold text-slate-900">
            {user?.institution?.name || "Institution"}
          </p>
          <p className="truncate text-xs text-slate-500">{user?.institution?.code || "—"}</p>
          <p className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700">
            Role: {String(user?.permissions?.role || "VIEWER")}
          </p>
          <nav className="mt-4 flex flex-1 flex-col gap-1">
            {displayedNavItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.Icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  title={item.label}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-[var(--rukapay-primary)] text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            className="mt-5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => {
              logout();
              router.replace("/");
            }}
          >
            Log out
          </button>
        </aside>
        <section className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <nav className="mb-4 flex flex-wrap gap-2 lg:hidden">
            {displayedNavItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  title={item.label}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    active
                      ? "bg-[var(--rukapay-primary)] text-white"
                      : "border border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {children}
        </section>
      </div>
    </main>
  );
}
