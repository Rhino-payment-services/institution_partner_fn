"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cancelLiquidationRequest,
  getSettlementWalletPreview,
  listPartnerSaccos,
  listSaccoTransactions,
  type PartnerLiquidation,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ipc } from "@/lib/dashboard-ui";

type SaccoSummary = {
  id: string;
  code?: string;
  name?: string;
  wallets?: Array<{ id?: string; walletType?: string; balance?: unknown; currency?: string }>;
};

function statusClass(status: string | undefined) {
  const s = String(status || "PENDING").toUpperCase();
  if (["COMPLETED", "SETTLED", "PAID", "SUCCESS"].includes(s)) return ipc.badgeSuccess;
  if (["PENDING", "IN_REVIEW", "PROCESSING"].includes(s)) return ipc.badgeWarning;
  return ipc.badgeNeutral;
}

function formatMoney(value: number | undefined, currency = "UGX") {
  const n = Number(value || 0);
  return `${currency} ${Number.isFinite(n) ? n.toLocaleString() : "0"}`;
}

function deriveLiquidationDisplayStatus(item: Record<string, unknown>): string {
  const raw = String(item.status ?? "PENDING").toUpperCase();
  const metadata =
    item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
      ? (item.metadata as Record<string, unknown>)
      : {};
  const processing = String(metadata.liquidationProcessingStatus || "").toUpperCase();
  const approval = String(metadata.liquidationApprovalStatus || "").toUpperCase();
  if (approval === "APPROVED" && raw === "PENDING") return "APPROVED";
  if (processing === "SUCCESS_AUTO_PROCESSED") return "SUCCESS (Auto-Processed)";
  if (processing === "SUCCESS_MANUAL_PROCESSING_REQUIRED")
    return "SUCCESS (Manual Processing Required)";
  return raw;
}

export default function SaccoLiquidationPage() {
  const { user } = useAuth();
  const institutionId = user?.institution?.id ? String(user.institution.id) : "";
  const canRequestLiquidation = Boolean(user?.permissions?.canRequestLiquidation);
  const [sacco, setSacco] = useState<SaccoSummary | null>(null);
  const [rows, setRows] = useState<PartnerLiquidation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [selectedRow, setSelectedRow] = useState<PartnerLiquidation | null>(null);
  const [cancellingId, setCancellingId] = useState("");

  const loadData = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true);
    setError("");
    try {
      const [saccos, tx] = await Promise.all([
        listPartnerSaccos() as Promise<SaccoSummary[]>,
        listSaccoTransactions(institutionId),
      ]);
      const own = Array.isArray(saccos)
        ? saccos.find((item) => String(item.id) === institutionId) || null
        : null;
      setSacco(own);
      const liqRows: PartnerLiquidation[] = (tx.transactions || [])
        .filter((item) => String(item.type || "").toUpperCase() === "LIQUIDATION")
        .map((item) => ({
          id: String(item.id),
          reference: item.reference || undefined,
          institutionId,
          saccoCode: own?.code || undefined,
          saccoName: own?.name || undefined,
          status: deriveLiquidationDisplayStatus(item as unknown as Record<string, unknown>),
          amount: item.amount != null ? Number(item.amount) : undefined,
          currency: item.currency || undefined,
          requestedAt: item.createdAt || undefined,
          updatedAt: item.createdAt || undefined,
          notes: item.description || undefined,
          payoutMethod:
            item.metadata && typeof item.metadata === "object"
              ? String((item.metadata as Record<string, unknown>).payoutMethod || "") || undefined
              : undefined,
          payoutDetails:
            item.metadata && typeof item.metadata === "object"
              ? (((item.metadata as Record<string, unknown>).payoutDetails as Record<
                  string,
                  unknown
                >) || undefined)
              : undefined,
        }))
        .sort((a, b) => {
          const ta = a.requestedAt ? new Date(a.requestedAt).getTime() : 0;
          const tb = b.requestedAt ? new Date(b.requestedAt).getTime() : 0;
          return tb - ta;
        });
      setRows(liqRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load liquidation data");
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  async function onCancel(row: PartnerLiquidation) {
    if (!row.id) return;
    if (!window.confirm("Cancel this liquidation request?")) return;
    try {
      setCancellingId(row.id);
      const res = await cancelLiquidationRequest(row.id, "Cancelled by requester");
      setFeedback(res?.message || "Liquidation request cancelled.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel request");
    } finally {
      setCancellingId("");
    }
  }

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const settlementPreview = useMemo(() => {
    if (!sacco) return null;
    return getSettlementWalletPreview(sacco);
  }, [sacco]);

  if (!canRequestLiquidation) {
    return (
      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Access denied</h2>
        <p className="mt-1 text-sm text-slate-600">
          Your role cannot request liquidation for this SACCO.
        </p>
      </section>
    );
  }

  return (
    <div className={ipc.pageStack}>
      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">SACCO liquidation</h2>
            <p className="mt-1 text-sm text-slate-600">
              Request settlement using this SACCO&apos;s partner settlement wallet.
            </p>
            {settlementPreview && (
              <p className="mt-2 text-xs text-slate-600">
                Available wallet balance:{" "}
                <span className="font-semibold text-slate-800">
                  {formatMoney(settlementPreview.balance, settlementPreview.currency)}
                </span>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Link href="/sacco/liquidation/new" className={`${ipc.btnPrimary} no-underline`}>
              New request
            </Link>
            <button type="button" onClick={() => void loadData()} className={ipc.btnSecondary} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
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

      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <h3 className="text-lg font-semibold tracking-tight text-slate-900">Request history</h3>
        <div className={`mt-4 ${ipc.tableWrap}`}>
          <table className={ipc.table}>
            <thead>
              <tr className={ipc.theadRow}>
                <th className={ipc.th}>Reference</th>
                <th className={ipc.th}>Status</th>
                <th className={ipc.th}>Amount</th>
                <th className={ipc.th}>Requested at</th>
                <th className={ipc.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className={`${ipc.td} text-slate-600`} colSpan={5}>
                    No liquidation records yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className={ipc.tbodyRow}>
                    <td className={`${ipc.td} font-mono text-xs`}>{row.reference || row.id.slice(0, 8)}</td>
                    <td className={ipc.td}>
                      <span className={statusClass(row.status)}>{row.status || "PENDING"}</span>
                    </td>
                    <td className={ipc.tdNum}>{formatMoney(row.amount, row.currency || "UGX")}</td>
                    <td className={`${ipc.td} whitespace-nowrap text-xs text-slate-600`}>
                      {row.requestedAt ? new Date(row.requestedAt).toLocaleString() : "—"}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
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
              <p><span className="font-semibold">Status:</span> {selectedRow.status || "PENDING"}</p>
              <p><span className="font-semibold">Amount:</span> {formatMoney(selectedRow.amount, selectedRow.currency || "UGX")}</p>
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
