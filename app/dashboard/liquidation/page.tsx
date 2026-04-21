"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  createPartnerLiquidationRequest,
  getSettlementWalletPreview,
  listPartnerLiquidations,
  listPartnerSaccos,
  type PartnerLiquidation,
} from "@/lib/api";
import { institutionStatusBadgeClass, ipc } from "@/lib/dashboard-ui";

type SaccoRow = {
  id: string;
  code?: string;
  name?: string;
  wallets?: Array<{ id?: string; walletType?: string; balance?: unknown; currency?: string }>;
  totalCollectedBalance?: number;
};

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
  const [saccos, setSaccos] = useState<SaccoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [institutionId, setInstitutionId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [manualSettlementNote, setManualSettlementNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [liq, list] = await Promise.all([
        listPartnerLiquidations(),
        listPartnerSaccos() as Promise<SaccoRow[]>,
      ]);
      setRows(liq);
      setSaccos(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load liquidation data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const settlementPreview = useMemo(() => {
    if (!institutionId) return null;
    const inst = saccos.find((s) => String(s.id) === institutionId);
    if (!inst) return null;
    return getSettlementWalletPreview(inst);
  }, [institutionId, saccos]);

  const institutionTotalAcrossWallets = useMemo(() => {
    if (!institutionId) return null;
    const inst = saccos.find((s) => String(s.id) === institutionId);
    if (!inst || inst.totalCollectedBalance == null) return null;
    return Number(inst.totalCollectedBalance);
  }, [institutionId, saccos]);

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

  function openRequestModal() {
    setFormError("");
    setIsRequestModalOpen(true);
  }

  function closeRequestModal() {
    setIsRequestModalOpen(false);
    setFormError("");
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!institutionId.trim()) {
      setFormError("Select a SACCO.");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setFormError("Enter a valid amount greater than zero.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const res = await createPartnerLiquidationRequest({
        institutionId: institutionId.trim(),
        amount: amt,
        currency: "UGX",
        reason: reason.trim() || undefined,
        manualSettlementNote: manualSettlementNote.trim() || undefined,
      });
      setFeedback(
        res?.message ||
          (res?.reference
            ? `Request submitted. Reference ${res.reference}. Pending admin approval before the wallet is debited.`
            : "Liquidation request submitted. Pending admin approval."),
      );
      setInstitutionId("");
      setAmount("");
      setReason("");
      setManualSettlementNote("");
      closeRequestModal();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not submit request");
    } finally {
      setSubmitting(false);
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
            <button type="button" onClick={openRequestModal} className={`${ipc.btnPrimary} rounded-xl px-5`}>
              New liquidation request
            </button>
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
                <button type="button" onClick={openRequestModal} className={`${ipc.btnPrimary} rounded-xl text-sm`}>
                  New request
                </button>
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
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td className={`${ipc.td} text-slate-500`} colSpan={5}>
                        Loading…
                      </td>
                    </tr>
                  )}
                  {!loading && rows.length === 0 && (
                    <tr>
                      <td className={`${ipc.td} py-10 text-center text-slate-600`} colSpan={5}>
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

      {isRequestModalOpen && (
        <div
          className={ipc.modalOverlay}
          role="presentation"
          onClick={() => !submitting && closeRequestModal()}
        >
          <div
            className={ipc.modalPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="liq-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={ipc.modalHeader}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 id="liq-modal-title" className="text-lg font-semibold tracking-tight text-slate-900">
                    New liquidation request
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    Only the{" "}
                    <span className="font-medium text-slate-800">PARTNER</span> settlement wallet balance in Core
                    counts. If you see 0 available below, that wallet is empty — even if the SACCO has funds
                    elsewhere.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => !submitting && closeRequestModal()}
                  className={ipc.modalClose}
                >
                  Close
                </button>
              </div>
            </div>
            <form onSubmit={onSubmit}>
              <div className={`${ipc.modalBody} space-y-5`}>
                {formError && (
                  <div
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                    role="alert"
                  >
                    {formError}
                  </div>
                )}
                <div>
                  <label htmlFor="liq-sacco" className={ipc.formLabel}>
                    SACCO
                  </label>
                  <select
                    id="liq-sacco"
                    value={institutionId}
                    onChange={(e) => setInstitutionId(e.target.value)}
                    className={`${ipc.input} mt-2`}
                    required
                  >
                    <option value="">Select institution</option>
                    {saccos.map((s) => (
                      <option key={String(s.id)} value={String(s.id)}>
                        {String(s.code || "")} — {String(s.name || "")}
                      </option>
                    ))}
                  </select>
                  {settlementPreview && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-700">
                      <p className="font-semibold text-slate-900">Settlement wallet in Core (this request)</p>
                      <p className="mt-1">
                        Available:{" "}
                        <span className="font-medium tabular-nums text-slate-900">
                          {formatMoney(settlementPreview.balance, settlementPreview.currency)}
                        </span>
                        <span className="text-slate-500">
                          {" "}
                          · wallet type <span className="font-mono">{settlementPreview.walletType || "—"}</span>
                        </span>
                      </p>
                      {!settlementPreview.isPartnerWallet && (
                        <p className="mt-2 text-amber-800">
                          No PARTNER wallet found; using the first linked wallet. Ask support to ensure a PARTNER
                          settlement wallet exists for this SACCO.
                        </p>
                      )}
                      {institutionTotalAcrossWallets != null &&
                        Math.abs(institutionTotalAcrossWallets - settlementPreview.balance) > 0.009 && (
                          <p className="mt-2 text-slate-600">
                            Sum of all wallets on this institution in Core:{" "}
                            <span className="font-medium tabular-nums">
                              {formatMoney(institutionTotalAcrossWallets)}
                            </span>
                            . If higher than available above, funds are in another wallet type — not usable for
                            this liquidation until moved to the settlement wallet.
                          </p>
                        )}
                    </div>
                  )}
                </div>
                <div>
                  <label htmlFor="liq-amount" className={ipc.formLabel}>
                    Amount <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="liq-amount"
                    inputMode="decimal"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount in UGX"
                    className={`${ipc.input} mt-2`}
                  />
                </div>
                <div>
                  <label htmlFor="liq-reason" className={ipc.formLabel}>
                    Reason <span className="font-normal normal-case text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    id="liq-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Why you are liquidating (shown on the transaction)"
                    rows={2}
                    className={`${ipc.input} mt-2 min-h-[72px] resize-y`}
                  />
                </div>
                <div>
                  <label htmlFor="liq-manual" className={ipc.formLabel}>
                    Manual settlement note{" "}
                    <span className="font-normal normal-case text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    id="liq-manual"
                    value={manualSettlementNote}
                    onChange={(e) => setManualSettlementNote(e.target.value)}
                    placeholder="Instructions for offline bank/cash settlement"
                    rows={3}
                    className={`${ipc.input} mt-2 min-h-[88px] resize-y`}
                  />
                </div>
                {!saccos.length && (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Create a SACCO first, then open this dialog again.
                  </p>
                )}
              </div>
              <div className={ipc.modalFooter}>
                <button
                  type="button"
                  onClick={() => !submitting && closeRequestModal()}
                  className={`${ipc.btnSecondary} w-full rounded-xl sm:w-auto`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !saccos.length}
                  className={`${ipc.btnPrimary} w-full rounded-xl px-6 sm:w-auto`}
                >
                  {submitting ? "Submitting…" : "Submit liquidation request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
