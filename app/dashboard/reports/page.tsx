"use client";

import { useMemo, useState } from "react";
import { InsightsChartsHub } from "@/components/insights-charts-hub";
import type { ReportMember, ReportTransaction } from "@/lib/partner-reports";
import {
  exportMembersCsv,
  exportMembersXlsx,
  exportTransactionsCsv,
  exportTransactionsXlsx,
} from "@/lib/reports-export";
import { usePartnerInsightsData } from "@/hooks/use-partner-insights-data";
import { ipc } from "@/lib/dashboard-ui";

type Insight = "overview" | "transactions" | "members" | "balances";

function numAmount(v: string | number | null | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function memberDisplayName(m: ReportMember): string {
  const n = [m.user?.profile?.firstName, m.user?.profile?.lastName].filter(Boolean).join(" ").trim();
  return n || m.user?.email || m.user?.phone || "—";
}

function txMemberLabel(t: ReportTransaction): string {
  const n = [t.user?.profile?.firstName, t.user?.profile?.lastName].filter(Boolean).join(" ").trim();
  return n || t.user?.email || t.user?.phone || "—";
}

export default function ReportsPage() {
  const [insight, setInsight] = useState<Insight>("overview");

  const data = usePartnerInsightsData();
  const {
    loading,
    error,
    load,
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
    filteredTx,
    filteredMembers,
    dailyTx,
    dailyMembers,
    maxDailyAmount,
    maxDailyMembers,
    balanceRows,
    maxBalance,
    txTotalVolume,
    txCount,
    totalBalance,
    totalMembersFiltered,
    formatMoney,
  } = data;

  const insightTabs: { id: Insight; label: string; hint: string }[] = [
    { id: "overview", label: "Overview", hint: "Summary metrics" },
    { id: "transactions", label: "Transactions", hint: "Volume & ledger rows" },
    { id: "members", label: "Members", hint: "New users in range" },
    { id: "balances", label: "SACCO balances", hint: "Collected balance by institution" },
  ];

  return (
    <div className={ipc.pageStack}>
      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Insights</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
              Use <strong className="font-semibold text-slate-800">Open live charts</strong> to jump to
              Recharts pages (volume, members, balances) or pick a card below. Insight tabs switch summary
              metrics and simple bar views. Filter, refresh, and export CSV or Excel — data is per SACCO.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={ipc.btnPrimary}
              onClick={() =>
                document.getElementById("live-charts")?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              Open live charts
            </button>
            <button type="button" onClick={() => void load()} className={ipc.btnSecondary} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh data"}
            </button>
          </div>
        </div>
      </section>

      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">INSIGHT</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {insightTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setInsight(tab.id)}
              title={tab.hint}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                insight === tab.id
                  ? "bg-[var(--sidebar-base)] text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Want the interactive Recharts view?{" "}
          <button
            type="button"
            className="font-semibold text-[var(--rukapay-primary)] underline-offset-2 hover:underline"
            onClick={() =>
              document.getElementById("live-charts")?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          >
            Jump to live charts
          </button>
        </p>
      </section>

      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
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
          Rows without <code className="rounded bg-slate-100 px-1">createdAt</code> are excluded from date
          filters and charts.{" "}
          {membersWithoutDate > 0 ? (
            <span className="font-medium text-amber-800">
              {membersWithoutDate} member record(s) have no date — adjust filters or enrich API.
            </span>
          ) : null}
        </p>
      </section>

      <InsightsChartsHub />

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </p>
      )}

      {/* Metrics */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className={ipc.metricTile}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Transactions (range)</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{txCount.toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-600">Filtered ledger movements with timestamps.</p>
        </article>
        <article className={ipc.metricTile}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Volume (abs. amount)</p>
          <p className="mt-2 text-xl font-bold tabular-nums leading-snug text-slate-900">
            {formatMoney(txTotalVolume)}
          </p>
          <p className="mt-1 text-xs text-slate-600">Sum of absolute amounts in filtered set.</p>
        </article>
        <article className={ipc.metricTile}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Members (range)</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
            {filteredMembers.length.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-600">Member records with created date in range.</p>
        </article>
        <article className={ipc.metricTile}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Collected balance</p>
          <p className="mt-2 text-xl font-bold tabular-nums leading-snug text-slate-900">
            {formatMoney(totalBalance)}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {saccoId ? "Selected SACCO" : "All SACCOs"} · {totalMembersFiltered.toLocaleString()} members
            linked.
          </p>
        </article>
      </section>

      {/* Charts */}
      {(insight === "overview" || insight === "transactions") && (
        <section className={`${ipc.card} ${ipc.cardPad}`}>
          <h3 className="text-base font-semibold text-slate-900">Transaction volume by day</h3>
          <p className="mt-1 text-sm text-slate-600">Absolute amount aggregated per calendar day (filtered).</p>
          <div className="mt-5 space-y-3">
            {dailyTx.length === 0 && !loading && (
              <p className="text-sm text-slate-600">No transactions in this range with timestamps.</p>
            )}
            {dailyTx.slice(-40).map((row) => {
              const pct = Math.round((row.amount / maxDailyAmount) * 100);
              return (
                <div key={row.day}>
                  <div className="mb-1 flex justify-between text-xs text-slate-600">
                    <span className="font-medium text-slate-800">{row.day}</span>
                    <span className="tabular-nums">
                      {formatMoney(row.amount)} · {row.count} tx
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--rukapay-primary)]/40 to-emerald-600/30"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {(insight === "overview" || insight === "members") && (
        <section className={`${ipc.card} ${ipc.cardPad}`}>
          <h3 className="text-base font-semibold text-slate-900">New members by day</h3>
          <p className="mt-1 text-sm text-slate-600">Counts from member records that include a creation timestamp.</p>
          <div className="mt-5 space-y-3">
            {dailyMembers.length === 0 && !loading && (
              <p className="text-sm text-slate-600">No dated member creations in range (API may omit dates).</p>
            )}
            {dailyMembers.slice(-40).map((row) => {
              const pct = Math.round((row.count / maxDailyMembers) * 100);
              return (
                <div key={row.day}>
                  <div className="mb-1 flex justify-between text-xs text-slate-600">
                    <span className="font-medium text-slate-800">{row.day}</span>
                    <span className="tabular-nums">{row.count} new</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500/35 to-teal-500/35"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {(insight === "overview" || insight === "balances") && (
        <section className={`${ipc.card} ${ipc.cardPad}`}>
          <h3 className="text-base font-semibold text-slate-900">Balance by SACCO</h3>
          <p className="mt-1 text-sm text-slate-600">Collected settlement balance from partner SACCO list.</p>
          <div className="mt-5 space-y-4">
            {balanceRows.length === 0 && !loading && (
              <p className="text-sm text-slate-600">No SACCOs to display.</p>
            )}
            {balanceRows.map((row) => {
              const pct = Math.round((row.balance / maxBalance) * 100);
              return (
                <div key={row.id}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium text-slate-800">
                      {row.code} · {row.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-600">
                      {formatMoney(row.balance, row.currency)} · {row.members} members
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--rukapay-primary)]/35 to-amber-500/25"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Table + export */}
      {(insight === "overview" || insight === "transactions") && (
        <section className={`${ipc.card} ${ipc.cardPad}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">Transactions</h3>
              <p className="mt-1 text-sm text-slate-600">{filteredTx.length.toLocaleString()} rows · export applies filters.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={ipc.btnSecondary}
                disabled={!filteredTx.length}
                onClick={() => exportTransactionsCsv(filteredTx)}
              >
                Export CSV
              </button>
              <button
                type="button"
                className={ipc.btnPrimary}
                disabled={!filteredTx.length}
                onClick={() => exportTransactionsXlsx(filteredTx)}
              >
                Export Excel
              </button>
            </div>
          </div>
          <div className={`mt-4 ${ipc.tableWrap}`}>
            <table className={ipc.table}>
              <thead>
                <tr className={ipc.theadRow}>
                  <th className={ipc.th}>Date</th>
                  <th className={ipc.th}>SACCO</th>
                  <th className={ipc.th}>Reference</th>
                  <th className={ipc.th}>Type</th>
                  <th className={ipc.th}>Status</th>
                  <th className={ipc.th}>Amount</th>
                  <th className={ipc.th}>Member</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td className={`${ipc.td} text-slate-600`} colSpan={7}>
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && filteredTx.length === 0 && (
                  <tr>
                    <td className={`${ipc.td} text-slate-600`} colSpan={7}>
                      No transactions match filters.
                    </td>
                  </tr>
                )}
                {!loading &&
                  filteredTx.map((t) => (
                    <tr key={t.id} className={ipc.tbodyRow}>
                      <td className={`${ipc.td} whitespace-nowrap text-xs text-slate-600`}>
                        {t.createdAt ? new Date(t.createdAt).toLocaleString() : "—"}
                      </td>
                      <td className={ipc.td}>
                        <span className="font-medium text-slate-900">{t.saccoCode}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">{t.saccoName}</span>
                      </td>
                      <td className={`${ipc.td} font-mono text-xs`}>{t.reference || "—"}</td>
                      <td className={ipc.td}>{t.type || "—"}</td>
                      <td className={ipc.td}>{t.status || "—"}</td>
                      <td className={`${ipc.td} tabular-nums`}>
                        {t.currency || "UGX"} {numAmount(t.amount).toLocaleString()}
                      </td>
                      <td className={ipc.td}>{txMemberLabel(t)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {insight === "members" && (
        <section className={`${ipc.card} ${ipc.cardPad}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">Members</h3>
              <p className="mt-1 text-sm text-slate-600">
                {filteredMembers.length.toLocaleString()} dated members in range.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={ipc.btnSecondary}
                disabled={!filteredMembers.length}
                onClick={() => exportMembersCsv(filteredMembers)}
              >
                Export CSV
              </button>
              <button
                type="button"
                className={ipc.btnPrimary}
                disabled={!filteredMembers.length}
                onClick={() => exportMembersXlsx(filteredMembers)}
              >
                Export Excel
              </button>
            </div>
          </div>
          <div className={`mt-4 ${ipc.tableWrap}`}>
            <table className={ipc.table}>
              <thead>
                <tr className={ipc.theadRow}>
                  <th className={ipc.th}>Created</th>
                  <th className={ipc.th}>SACCO</th>
                  <th className={ipc.th}>Name</th>
                  <th className={ipc.th}>Phone</th>
                  <th className={ipc.th}>Email</th>
                  <th className={ipc.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {!loading && filteredMembers.length === 0 && (
                  <tr>
                    <td className={`${ipc.td} text-slate-600`} colSpan={6}>
                      No members with creation dates in range.
                    </td>
                  </tr>
                )}
                {filteredMembers.map((m) => (
                  <tr key={m.id} className={ipc.tbodyRow}>
                    <td className={`${ipc.td} whitespace-nowrap text-xs text-slate-600`}>
                      {m.createdAt ? new Date(m.createdAt).toLocaleString() : "—"}
                    </td>
                    <td className={ipc.td}>
                      <span className="font-medium text-slate-900">{m.saccoCode}</span>
                    </td>
                    <td className={ipc.td}>{memberDisplayName(m)}</td>
                    <td className={ipc.td}>{m.user?.phone || "—"}</td>
                    <td className={ipc.td}>{m.user?.email || "—"}</td>
                    <td className={ipc.td}>{m.status || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
