"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listPartnerSaccos } from "@/lib/api";
import {
  sumInstitutionWalletBalances,
  walletBalanceByInstitution,
  type SaccoSummary,
} from "@/lib/partner-reports";
import { IconReports } from "@/components/dashboard-nav-icons";
import { useAuth } from "@/lib/auth-context";
import { institutionStatusBadgeClass, ipc } from "@/lib/dashboard-ui";

type SaccoItem = {
  id: string;
  code?: string;
  name?: string;
  status?: string;
  totalCollectedBalance?: number;
  balanceCurrency?: string;
  _count?: {
    members?: number;
  };
};

function IconBuilding(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function IconWallet(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function IconUsers(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function IconCheck(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconRefresh(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [saccos, setSaccos] = useState<SaccoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dateLabel, setDateLabel] = useState("");

  const partnerName = user?.partner?.partnerName?.trim() || "Partner institution";

  useEffect(() => {
    setDateLabel(
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    );
  }, []);

  const loadSaccos = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = (await listPartnerSaccos()) as SaccoItem[];
      setSaccos(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load SACCOs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSaccos();
  }, [loadSaccos]);

  const totalSaccos = saccos.length;
  const totalMembers = useMemo(
    () => saccos.reduce((sum, item) => sum + Number(item?._count?.members || 0), 0),
    [saccos],
  );
  const collectedByInstitution = useMemo(
    () => walletBalanceByInstitution(saccos as SaccoSummary[]),
    [saccos],
  );

  const totalWalletBalance = useMemo(
    () => sumInstitutionWalletBalances(saccos as SaccoSummary[]),
    [saccos],
  );
  const activeSaccos = useMemo(
    () => saccos.filter((s) => (String(s.status || "").toUpperCase() === "ACTIVE")).length,
    [saccos],
  );

  const sortedByBalance = useMemo(() => {
    return [...saccos].sort((a, b) => {
      const ba = collectedByInstitution.get(String(a.id)) ?? 0;
      const bb = collectedByInstitution.get(String(b.id)) ?? 0;
      return bb - ba;
    });
  }, [saccos, collectedByInstitution]);

  const maxBalance = useMemo(() => {
    const m = Math.max(...saccos.map((s) => collectedByInstitution.get(String(s.id)) ?? 0), 0);
    return m > 0 ? m : 1;
  }, [saccos, collectedByInstitution]);

  function formatMoney(value: number | undefined, currency = "UGX") {
    const amount = Number(value || 0);
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    return `${currency} ${safeAmount.toLocaleString()}`;
  }

  function formatTime(d: Date | null) {
    if (!d) return "—";
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  return (
    <div className={ipc.pageStack}>
      {/* Top: breadcrumb + calendar line */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <nav className="text-sm text-slate-500" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="transition hover:text-slate-800">
                Home
              </Link>
            </li>
            <li className="text-slate-300" aria-hidden>
              /
            </li>
            <li className="font-semibold text-[var(--rukapay-primary)]">Dashboard</li>
          </ol>
        </nav>
        <p className="text-sm text-slate-500">{dateLabel || "\u00a0"}</p>
      </div>

      <Link
        href="/dashboard/insights"
        className={`${ipc.card} ${ipc.cardPad} flex flex-col gap-4 border border-slate-200/90 transition hover:border-[color-mix(in_srgb,var(--rukapay-primary)_28%,#e2e8f0)] hover:shadow-md sm:flex-row sm:items-center sm:justify-between`}
      >
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--rukapay-primary)_12%,white)] text-[var(--rukapay-primary)]">
            <IconReports className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Insight</p>
            <p className="mt-0.5 text-base font-semibold text-slate-900">Live charts &amp; partner metrics</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Open the insights page for interactive charts — transactions by day, new members, and SACCO
              balances — plus filters and CSV/Excel export.
            </p>
          </div>
        </div>
        <span
          className={`${ipc.btnPrimary} inline-flex shrink-0 items-center justify-center self-start sm:self-center`}
        >
          Go to insights
        </span>
      </Link>

      {/* Entity header — partner snapshot */}
      <section
        className={`${ipc.card} ${ipc.cardPad} border-l-[3px] border-l-[var(--rukapay-primary)]/75 ring-1 ring-slate-200/70`}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">{partnerName}</h1>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200/70">
                {totalMembers.toLocaleString()} members
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              {totalSaccos === 0
                ? "No SACCOs linked yet. Create a SACCO to start tracking collections and members."
                : `${totalSaccos} SACCO institution${totalSaccos === 1 ? "" : "s"} under this partner. Total settlement balance across wallets is shown below.`}
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Updated: {formatTime(lastUpdated)}
              {loading ? " · Refreshing…" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadSaccos()}
            disabled={loading}
            className={`${ipc.btnSecondary} inline-flex items-center gap-2 self-start`}
          >
            <IconRefresh className="h-4 w-4" />
            Refresh data
          </button>
        </div>
      </section>

      {/* Four metric tiles — soft icon tints */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className={ipc.metricTile}>
          <div className="flex items-start gap-4">
            <div
              className={`${ipc.metricIcon} border-emerald-200/80 bg-emerald-50/90 text-emerald-900`}
            >
              <IconBuilding className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">SACCO institutions</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{totalSaccos}</p>
              <p className="mt-1 text-xs text-slate-600">Linked to your partner account.</p>
            </div>
          </div>
        </article>
        <article className={ipc.metricTile}>
          <div className="flex items-start gap-4">
            <div className={`${ipc.metricIcon} border-sky-200/80 bg-sky-50/90 text-sky-900`}>
              <IconWallet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total wallet balance</p>
              <p className="mt-2 text-xl font-bold tabular-nums leading-snug text-slate-900">
                {formatMoney(totalWalletBalance)}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Live balances on all SACCO wallets in Core — not a sum of past successful transactions.
              </p>
            </div>
          </div>
        </article>
        <article className={ipc.metricTile}>
          <div className="flex items-start gap-4">
            <div className={`${ipc.metricIcon} border-teal-200/80 bg-teal-50/90 text-teal-950`}>
              <IconUsers className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Members</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{totalMembers.toLocaleString()}</p>
              <p className="mt-1 text-xs text-slate-600">Registered under partner SACCOs.</p>
            </div>
          </div>
        </article>
        <article className={ipc.metricTile}>
          <div className="flex items-start gap-4">
            <div className={`${ipc.metricIcon} border-amber-200/80 bg-amber-50/90 text-amber-950`}>
              <IconCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active SACCOs</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{activeSaccos}</p>
              <p className="mt-1 text-xs text-slate-600">Status ACTIVE (excludes inactive).</p>
            </div>
          </div>
        </article>
      </section>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</p>
      )}

      {/* Two columns: collection mix + top SACCOs */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className={`${ipc.card} ${ipc.cardPad}`}>
          <h2 className="text-base font-semibold text-slate-900">Wallet balance by SACCO</h2>
          <p className="mt-1 text-sm text-slate-600">
            Relative share of each institution&apos;s total on-ledger wallet balance (same scale, single tone).
          </p>
          <div className="mt-5 space-y-4">
            {sortedByBalance.length === 0 && !loading && (
              <p className="text-sm text-slate-600">No data yet. Add SACCOs to see distribution.</p>
            )}
            {sortedByBalance.slice(0, 8).map((item) => {
              const v = collectedByInstitution.get(String(item.id)) ?? 0;
              const pct = Math.round((v / maxBalance) * 100);
              return (
                <div key={String(item.id)}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium text-slate-800">{String(item.name || item.code || "—")}</span>
                    <span className="shrink-0 tabular-nums text-slate-600">
                      {formatMoney(v, item.balanceCurrency || "UGX")}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--rukapay-primary)]/35 to-emerald-600/25 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`${ipc.card} ${ipc.cardPad}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Largest balances</h2>
              <p className="mt-1 text-sm text-slate-600">SACCOs ranked by total wallet balance in Core.</p>
            </div>
            <Link href="/dashboard/saccos" className={`${ipc.link} shrink-0 text-sm`}>
              Manage
            </Link>
          </div>
          <ul className="mt-5 divide-y divide-slate-100">
            {sortedByBalance.slice(0, 5).map((item, index) => (
              <li key={String(item.id)} className="flex items-center gap-3 py-3 first:pt-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--rukapay-primary)]/10 text-xs font-bold text-[var(--rukapay-primary)] ring-1 ring-[var(--rukapay-primary)]/20">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{String(item.name || "—")}</p>
                  <p className="truncate text-xs text-slate-500">{String(item.code || "")}</p>
                </div>
                <p className="shrink-0 text-sm font-medium tabular-nums text-slate-800">
                  {formatMoney(collectedByInstitution.get(String(item.id)) ?? 0, item.balanceCurrency || "UGX")}
                </p>
              </li>
            ))}
            {sortedByBalance.length === 0 && !loading && (
              <li className="py-4 text-sm text-slate-600">No SACCOs to rank yet.</li>
            )}
          </ul>
        </div>
      </section>

      {/* Table + quick actions */}
      <section className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className={`${ipc.card} ${ipc.cardPad}`}>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">All SACCOs</h2>
                <p className="mt-1 text-sm text-slate-600">Codes, balances, members, and transaction drill-down.</p>
              </div>
              <Link href="/dashboard/saccos" className={`${ipc.btnPrimary} w-full sm:w-auto`}>
                Manage SACCOs
              </Link>
            </div>

            <div className={ipc.tableWrap}>
              <table className={ipc.table}>
                <thead>
                  <tr className={ipc.theadRow}>
                    <th className={ipc.th}>Code</th>
                    <th className={ipc.th}>Name</th>
                    <th className={ipc.th}>Wallet balance</th>
                    <th className={ipc.th}>Members</th>
                    <th className={ipc.th}>Status</th>
                    <th className={`${ipc.th} text-right`}>Open</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && saccos.length === 0 && (
                    <tr>
                      <td className={`${ipc.td} text-slate-600`} colSpan={6}>
                        No SACCOs found.
                      </td>
                    </tr>
                  )}
                  {saccos.map((item) => (
                    <tr key={String(item.id)} className={ipc.tbodyRow}>
                      <td className={`${ipc.td} font-medium`}>{String(item.code || "—")}</td>
                      <td className={ipc.td}>{String(item.name || "—")}</td>
                      <td className={ipc.tdNum}>
                        {formatMoney(collectedByInstitution.get(String(item.id)) ?? 0, item.balanceCurrency || "UGX")}
                      </td>
                      <td className={ipc.tdNum}>{Number(item?._count?.members || 0)}</td>
                      <td className={ipc.td}>
                        <span className={institutionStatusBadgeClass(item.status)}>
                          {String(item.status || "—")}
                        </span>
                      </td>
                      <td className={`${ipc.td} text-right`}>
                        <Link href={`/dashboard/saccos/${String(item.id)}`} className={ipc.link}>
                          Transactions
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {loading && <p className="mt-4 text-sm font-medium text-slate-600">Loading SACCOs…</p>}
          </div>
        </div>

        <aside className={`${ipc.card} ${ipc.cardPad} h-fit xl:sticky xl:top-[5.5rem]`}>
          <h2 className="text-base font-semibold text-slate-900">Quick actions</h2>
          <p className="mt-1 text-sm text-slate-600">Common tasks for institution partners.</p>
          <ul className="mt-5 space-y-2">
            <li>
              <Link
                href="/dashboard/saccos"
                className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-emerald-200/80 hover:bg-emerald-50/40"
              >
                SACCO management
                <span className="text-slate-400" aria-hidden>
                  →
                </span>
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/members"
                className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-emerald-200/80 hover:bg-emerald-50/40"
              >
                Member management
                <span className="text-slate-400" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          </ul>
        </aside>
      </section>
    </div>
  );
}
