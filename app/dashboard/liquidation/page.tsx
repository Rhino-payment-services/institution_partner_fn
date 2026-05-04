"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cancelLiquidationRequest,
  listPartnerLiquidations,
  type PartnerLiquidation,
} from "@/lib/api";
import { institutionStatusBadgeClass, ipc } from "@/lib/dashboard-ui";

function formatMoney(n: number, ccy = "UGX") {
  return `${ccy} ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function liquidationStatusClass(status: string | undefined) {
  const s = String(status || "PENDING").toUpperCase();
  if (s === "COMPLETED" || s === "SETTLED" || s === "PAID" || s === "SUCCESS")
    return ipc.badgeSuccess;
  if (s === "PENDING" || s === "IN_REVIEW" || s === "PROCESSING") return ipc.badgeWarning;
  if (s === "FAILED" || s === "REJECTED" || s === "CANCELLED")
    return "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200/80";
  return institutionStatusBadgeClass(status);
}

export default function LiquidationPage() {
  const [rows, setRows] = useState<PartnerLiquidation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [selectedRow, setSelectedRow] = useState<PartnerLiquidation | null>(null);
  const [cancellingId, setCancellingId] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const liq = await listPartnerLiquidations();
      setRows(liq);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load liquidation data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(() => {
    const terminal = new Set([
      "COMPLETED",
      "SETTLED",
      "PAID",
      "SUCCESS",
      "CANCELLED",
      "REJECTED",
    ]);
    const open = rows.filter((r) => !terminal.has(String(r.status || "").toUpperCase())).length;
    const settledStatuses = ["COMPLETED", "SETTLED", "PAID", "SUCCESS"];
    const pendingVal = rows
      .filter((r) => !settledStatuses.includes(String(r.status || "").toUpperCase()))
      .reduce((s, r) => s + Math.abs(Number(r.amount || 0)), 0);
    const settled = rows.filter((r) =>
      settledStatuses.includes(String(r.status || "").toUpperCase()),
    ).length;
    return { open, pendingVal, settled, total: rows.length };
  }, [rows]);


  async function onCancel(row: PartnerLiquidation) {
    if (!row.id) return;
    if (!window.confirm("Cancel this liquidation request?")) return;
    try {
      setCancellingId(row.id);
      const res = await cancelLiquidationRequest(row.id, "Cancelled by requester");
      setFeedback(res?.message || "Liquidation request cancelled.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to cancel request");
    } finally {
      setCancellingId("");
    }
  }

  return (
    <div className={ipc.pageStack}>
      <section
        className={`${ipc.card} ${ipc.cardPad} relative overflow-hidden border-l-[4px] border-l-[var(--rukapay-primary)] ring-1 ring-slate-200/70`}
      >
        <div className="pointer-events-none absolute -right-16 -top-24 h-48 w-48 rounded-full bg-[color-mix(in_srgb,var(--rukapay-primary)_06%,transparent)] blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Treasury</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Liquidation</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Request settlement (liquidation) against the SACCO&apos;s{" "}
              <span className="font-medium text-slate-800">PARTNER settlement wallet balance in RukaPay Core</span>
              . Money visible only in Nexen or other ledgers is not available here until it is reflected in that
              wallet. An administrator must approve before the wallet is debited; off-platform cash or bank
              movement is manual.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            <Link href="/dashboard/liquidation/new" className={`${ipc.btnPrimary} rounded-xl px-5 no-underline`}>
              New liquidation request
            </Link>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className={`${ipc.btnSecondary} rounded-xl`}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
      </section>

      {(error || feedback) && (
        <div className="space-y-2">
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {error}
            </p>
          )}
          {feedback && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
              {feedback}
            </p>
          )}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className={ipc.metricTile}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Open requests</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{metrics.open}</p>
          <p className="mt-1 text-xs text-slate-600">Not yet completed or rejected.</p>
        </article>
        <article className={ipc.metricTile}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">In-flight value</p>
          <p className="mt-2 text-xl font-bold tabular-nums leading-snug text-slate-900">
            {formatMoney(metrics.pendingVal)}
          </p>
          <p className="mt-1 text-xs text-slate-600">Sum of amounts on non-settled rows.</p>
        </article>
        <article className={ipc.metricTile}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Settled (all time)</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{metrics.settled}</p>
          <p className="mt-1 text-xs text-slate-600">Completed or paid liquidations.</p>
        </article>
        <article className={ipc.metricTile}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total rows</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{metrics.total}</p>
          <p className="mt-1 text-xs text-slate-600">Returned by the liquidation API.</p>
        </article>
      </section>

      {rows.length === 0 && !loading && !error && (
        <div className="rounded-2xl border border-sky-200/90 bg-gradient-to-br from-sky-50/90 to-white px-5 py-4 text-sm text-sky-950 shadow-sm shadow-sky-900/5">
          <p className="font-semibold text-sky-950">No liquidation records yet</p>
          <p className="mt-1 text-sky-900/90">
            Submit a request above, or ensure your SACCO has transactions of type{" "}
            <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs text-sky-950 ring-1 ring-sky-200">
              LIQUIDATION
            </code>{" "}
            (loaded from each SACCO&apos;s transaction list).
          </p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className={`${ipc.card} overflow-hidden ${ipc.cardPad}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">Liquidation queue</h3>
                <p className="mt-1 text-sm text-slate-600">References, SACCO, status, and amounts.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/dashboard/liquidation/new" className={`${ipc.btnPrimary} rounded-xl text-sm no-underline`}>
                  New request
                </Link>
                <Link href="/dashboard/saccos" className={`${ipc.btnSecondary} rounded-xl text-sm no-underline`}>
                  Manage SACCOs
                </Link>
              </div>
            </div>
            <div className={`mt-5 ${ipc.tableWrap}`}>
              <table className={ipc.table}>
                <thead>
                  <tr className={ipc.theadRow}>
                    <th className={ipc.th}>Reference</th>
                    <th className={ipc.th}>SACCO</th>
                    <th className={ipc.th}>Status</th>
                    <th className={ipc.th}>Amount</th>
                    <th className={ipc.th}>Requested</th>
                    <th className={ipc.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td className={`${ipc.td} text-slate-500`} colSpan={6}>
                        Loading…
                      </td>
                    </tr>
                  )}
                  {!loading && rows.length === 0 && (
                    <tr>
                      <td className={`${ipc.td} py-10 text-center text-slate-600`} colSpan={6}>
                        No liquidation items to display.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    rows.map((row) => (
                      <tr key={row.id} className={ipc.tbodyRow}>
                        <td className={`${ipc.td} font-mono text-xs font-medium`}>
                          {row.reference || row.id.slice(0, 8)}
                        </td>
                        <td className={ipc.td}>
                          <span className="font-medium text-slate-900">{row.saccoCode || "—"}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">{row.saccoName || ""}</span>
                        </td>
                        <td className={ipc.td}>
                          <span className={liquidationStatusClass(row.status)}>
                            {row.status || "PENDING"}
                          </span>
                        </td>
                        <td className={ipc.tdNum}>
                          {row.amount != null
                            ? formatMoney(Number(row.amount), row.currency || "UGX")
                            : "—"}
                        </td>
                        <td className={`${ipc.td} whitespace-nowrap text-xs text-slate-600`}>
                          {row.requestedAt
                            ? new Date(row.requestedAt).toLocaleString()
                            : row.updatedAt
                              ? new Date(row.updatedAt).toLocaleString()
                              : "—"}
                        </td>
                        <td className={ipc.td}>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className={`${ipc.btnSecondary} rounded-lg px-2.5 py-1 text-xs`}
                              onClick={() => setSelectedRow(row)}
                            >
                              Open
                            </button>
                            {String(row.status || "").toUpperCase().includes("PENDING") && (
                              <button
                                type="button"
                                className={`${ipc.btnSecondary} rounded-lg px-2.5 py-1 text-xs`}
                                disabled={cancellingId === row.id}
                                onClick={() => void onCancel(row)}
                              >
                                {cancellingId === row.id ? "Cancelling..." : "Cancel"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className={`${ipc.card} ${ipc.cardPad} bg-slate-50/50`}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Typical flow</h3>
            <ol className="mt-4 space-y-4 text-sm text-slate-700">
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--rukapay-primary)]/10 text-xs font-bold text-[var(--rukapay-primary)]">
                  1
                </span>
                <span>Partner raises a liquidation with SACCO context and optional amount.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--rukapay-primary)]/10 text-xs font-bold text-[var(--rukapay-primary)]">
                  2
                </span>
                <span>Treasury reviews against balances and policy; status moves to processing.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--rukapay-primary)]/10 text-xs font-bold text-[var(--rukapay-primary)]">
                  3
                </span>
                <span>Settlement posts to your ledger; row completes with timestamps for audit.</span>
              </li>
            </ol>
          </section>
        </div>
      </div>
      {selectedRow && (
        <div className={ipc.modalOverlay} role="presentation" onClick={() => setSelectedRow(null)}>
          <div className={ipc.modalPanel} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className={ipc.modalHeader}>
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-lg font-semibold text-slate-900">Liquidation details</h3>
                <button type="button" className={ipc.modalClose} onClick={() => setSelectedRow(null)}>
                  Close
                </button>
              </div>
            </div>
            <div className={`${ipc.modalBody} space-y-3 text-sm`}>
              <p><span className="font-semibold">Reference:</span> {selectedRow.reference || selectedRow.id}</p>
              <p><span className="font-semibold">SACCO:</span> {selectedRow.saccoCode || "—"} {selectedRow.saccoName ? `(${selectedRow.saccoName})` : ""}</p>
              <p><span className="font-semibold">Status:</span> {selectedRow.status || "PENDING"}</p>
              <p><span className="font-semibold">Amount:</span> {selectedRow.amount != null ? formatMoney(Number(selectedRow.amount), selectedRow.currency || "UGX") : "—"}</p>
              <p><span className="font-semibold">Method:</span> {selectedRow.payoutMethod || "—"}</p>
              <p><span className="font-semibold">Note:</span> {selectedRow.notes || "—"}</p>
              <div>
                <p className="font-semibold">Payout details</p>
                <pre className="mt-1 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
{JSON.stringify(selectedRow.payoutDetails || {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
