"use client";

import type { PartnerInsightsData } from "@/hooks/use-partner-insights-data";

export function InsightsFiltersPanel({ data }: { data: PartnerInsightsData }) {
  const {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    saccoId,
    setSaccoId,
    txStatus,
    setTxStatus,
    txType,
    setTxType,
    query,
    setQuery,
    saccoOptions,
    uniqueStatuses,
    uniqueTypes,
    membersWithoutDate,
  } = data;

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-900/4">
      <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
      <p className="mt-1 text-xs text-slate-500">Applied to this chart and shared with the main Insights page.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[var(--rukapay-primary)] focus:ring-2 focus:ring-[#08163d]/15"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[var(--rukapay-primary)] focus:ring-2 focus:ring-[#08163d]/15"
          />
        </label>
        <label className="block text-sm sm:col-span-2 xl:col-span-1">
          <span className="mb-1 block font-medium text-slate-700">SACCO</span>
          <select
            value={saccoId}
            onChange={(e) => setSaccoId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[var(--rukapay-primary)] focus:ring-2 focus:ring-[#08163d]/15"
          >
            <option value="">All SACCOs</option>
            {saccoOptions.map((s) => (
              <option key={String(s.id)} value={String(s.id)}>
                {String(s.code || "")} — {String(s.name || "")}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm sm:col-span-2 xl:col-span-1">
          <span className="mb-1 block font-medium text-slate-700">Search</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Reference, member, SACCO…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[var(--rukapay-primary)] focus:ring-2 focus:ring-[#08163d]/15"
          />
        </label>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Transaction status</span>
          <select
            value={txStatus}
            onChange={(e) => setTxStatus(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[var(--rukapay-primary)] focus:ring-2 focus:ring-[#08163d]/15"
          >
            <option value="">Any</option>
            {uniqueStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Transaction type</span>
          <select
            value={txType}
            onChange={(e) => setTxType(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[var(--rukapay-primary)] focus:ring-2 focus:ring-[#08163d]/15"
          >
            <option value="">Any</option>
            {uniqueTypes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Rows without <code className="rounded bg-slate-100 px-1">createdAt</code> are excluded from date filters.{" "}
        {membersWithoutDate > 0 ? (
          <span className="font-medium text-amber-800">
            {membersWithoutDate} member record(s) have no date.
          </span>
        ) : null}
      </p>
    </section>
  );
}
