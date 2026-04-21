"use client";

import Link from "next/link";
import type { PartnerInsightsData } from "@/hooks/use-partner-insights-data";
import { ipc } from "@/lib/dashboard-ui";

export function InsightsChartChrome({
  data,
  kicker,
  title,
  description,
}: {
  data: PartnerInsightsData;
  kicker: string;
  title: string;
  description: string;
}) {
  const { load, loading, liveRefresh, setLiveRefresh } = data;

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-900/4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link href="/dashboard/insights" className={`${ipc.link} font-medium`}>
          ← Insights
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-600">Live charts</span>
      </div>
      <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{kicker}</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{description}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-[var(--rukapay-primary)] focus:ring-[var(--rukapay-primary)]"
              checked={liveRefresh}
              onChange={(e) => setLiveRefresh(e.target.checked)}
            />
            <span>Live refresh (60s)</span>
          </label>
          <button type="button" onClick={() => void load()} className={ipc.btnSecondary} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh data"}
          </button>
        </div>
      </div>
    </section>
  );
}
