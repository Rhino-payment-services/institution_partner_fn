"use client";

import Link from "next/link";
import { ipc } from "@/lib/dashboard-ui";

const CHARTS = [
  {
    href: "/dashboard/insights/charts/transaction-volume",
    title: "Transaction volume & count",
    description: "Area + line — volume and tx count over time.",
  },
  {
    href: "/dashboard/insights/charts/new-members",
    title: "New members by day",
    description: "Area trend for dated member creations.",
  },
  {
    href: "/dashboard/insights/charts/sacco-balances",
    title: "SACCO balances & members",
    description: "Grouped bars — balance vs members (scaled).",
  },
] as const;

export function InsightsChartsHub() {
  return (
    <section
      id="live-charts"
      className="scroll-mt-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-900/4"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Live charts</p>
      <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">Interactive Recharts</h3>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Open each chart on its own page — filters and live refresh work the same on every chart.
      </p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CHARTS.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className={`${ipc.card} flex h-full flex-col justify-between p-5 transition hover:border-[color-mix(in_srgb,var(--rukapay-primary)_22%,#e2e8f0)] hover:shadow-md`}
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{c.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{c.description}</p>
              </div>
              <span className="mt-4 text-xs font-semibold text-[var(--rukapay-primary)]">Open chart →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
