"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  listPartnerSaccos,
  listSaccoTransactions,
} from "@/lib/api";
import { ipc } from "@/lib/dashboard-ui";

type SaccoItem = {
  id: string;
  code?: string;
  name?: string;
  metadata?: {
    withdrawals?: {
      enabled?: boolean;
      savings?: boolean;
      shares?: boolean;
      minimumAmount?: number;
      maximumAmount?: number;
    };
  };
  totalCollectedBalance?: number;
  balanceCurrency?: string;
  _count?: {
    members?: number;
  };
};

export default function SaccoDetailPage() {
  const params = useParams<{ id: string }>();
  const saccoId = params?.id;
  const [saccos, setSaccos] = useState<SaccoItem[]>([]);
  const [transactions, setTransactions] = useState<
    Array<{
      id: string;
      reference?: string | null;
      type?: string | null;
      status?: string | null;
      amount?: number | string | null;
      currency?: string | null;
      description?: string | null;
      metadata?: Record<string, unknown> | null;
      createdAt?: string | null;
      user?: {
        id?: string | null;
        email?: string | null;
        phone?: string | null;
        profile?: {
          firstName?: string | null;
          lastName?: string | null;
        } | null;
      } | null;
    }>
  >([]);
  const [selectedTransaction, setSelectedTransaction] = useState<{
    id: string;
    reference?: string | null;
    type?: string | null;
    status?: string | null;
    amount?: number | string | null;
    currency?: string | null;
    description?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt?: string | null;
    user?: {
      id?: string | null;
      email?: string | null;
      phone?: string | null;
      profile?: {
        firstName?: string | null;
        lastName?: string | null;
      } | null;
    } | null;
  } | null>(null);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadSaccos();
  }, []);

  useEffect(() => {
    if (!saccoId) return;
    void loadTransactions(String(saccoId));
  }, [saccoId]);

  async function loadSaccos() {
    setError("");
    try {
      const data = (await listPartnerSaccos()) as SaccoItem[];
      setSaccos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load SACCO details");
    }
  }

  async function loadTransactions(institutionId: string) {
    setIsLoadingTransactions(true);
    try {
      const data = await listSaccoTransactions(institutionId);
      setTransactions(data.transactions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load SACCO transactions");
    } finally {
      setIsLoadingTransactions(false);
    }
  }

  const sacco = useMemo(
    () => saccos.find((item) => String(item.id) === String(saccoId)) || null,
    [saccos, saccoId],
  );

  function formatMoney(value: number | undefined, currency = "UGX") {
    const amount = Number(value || 0);
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    return `${currency} ${safeAmount.toLocaleString()}`;
  }

  function getTransactionMemberName(tx: {
    user?: {
      email?: string | null;
      phone?: string | null;
      profile?: { firstName?: string | null; lastName?: string | null } | null;
    } | null;
    metadata?: Record<string, unknown> | null;
  }) {
    const first = tx.user?.profile?.firstName?.trim() || "";
    const last = tx.user?.profile?.lastName?.trim() || "";
    const full = `${first} ${last}`.trim();
    if (full) return full;

    const metadataName = String((tx.metadata?.nexenMemberName as string) || "").trim();
    if (metadataName) return metadataName;

    if (tx.user?.phone) return tx.user.phone;
    if (tx.user?.email) return tx.user.email;
    return "-";
  }

  function getTransactionActionLabel(tx: {
    type?: string | null;
    metadata?: Record<string, unknown> | null;
  }) {
    const flowType = String((tx.metadata?.flowType as string) || "").toUpperCase();
    const nexenAction = String((tx.metadata?.nexenAction as string) || "").toUpperCase();
    const description = String((tx.metadata?.description as string) || "").toUpperCase();

    if (flowType.includes("NEXEN")) {
      if (flowType.includes("SAVINGS")) {
        if (nexenAction === "DEPOSIT") return "Saving Deposit";
        if (nexenAction === "WITHDRAW") return "Savings Withdraw";
        return "Savings";
      }
      if (flowType.includes("SHARE")) {
        if (nexenAction === "PURCHASE" || description.includes("BUY")) return "Buy Shares";
        if (nexenAction === "WITHDRAW") return "Withdraw Shares";
        return "Shares";
      }
      if (flowType.includes("LOAN")) {
        if (nexenAction === "REPAY") return "Loan Repayment";
        if (nexenAction === "CREATE") return "Loan Disbursement";
        return "Loan";
      }
    }

    if (tx.type === "MNO_TO_WALLET") return "Collection";
    if (tx.type === "WALLET_TO_MNO") return "Payout";
    return tx.type || "-";
  }

  return (
    <>
      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              {sacco ? String(sacco.name || "SACCO") : "SACCO details"}
            </h2>
            <p className="mt-2 text-sm text-slate-700">
              <span className="font-medium text-slate-900">Code:</span>{" "}
              {sacco ? String(sacco.code || "—") : "—"}{" "}
              <span className="mx-2 text-slate-300">|</span>{" "}
              <span className="font-medium text-slate-900">Members:</span>{" "}
              {sacco ? Number(sacco?._count?.members || 0) : 0}
            </p>
            <p className="mt-1 text-sm text-slate-700">
              <span className="font-medium text-slate-900">Collected balance:</span>{" "}
              {sacco
                ? formatMoney(sacco.totalCollectedBalance, sacco.balanceCurrency || "UGX")
                : "UGX 0"}
            </p>
          </div>
          <Link href="/dashboard/saccos" className={`${ipc.btnSecondary} shrink-0 self-start`}>
            Back to SACCOs
          </Link>
        </div>
        <div className="mt-5">
          <Link href={`/dashboard/saccos/${saccoId}/members`} className={ipc.btnPrimary}>
            View members
          </Link>
        </div>
      </section>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <h3 className="text-lg font-semibold tracking-tight text-slate-900">Transactions</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Latest transactions for this SACCO settlement wallet.
        </p>

        <div className={`mt-4 ${ipc.tableWrap}`}>
          <table className={ipc.table}>
            <thead>
              <tr className={ipc.theadRow}>
                <th className={ipc.th}>Date</th>
                <th className={ipc.th}>Reference</th>
                <th className={ipc.th}>Member</th>
                <th className={ipc.th}>Action</th>
                <th className={ipc.th}>Amount</th>
                <th className={ipc.th}>Status</th>
                <th className={`${ipc.th} text-right`}>View</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingTransactions ? (
                <tr>
                  <td className={`${ipc.td} text-slate-600`} colSpan={7}>
                    Loading transactions…
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td className={`${ipc.td} text-slate-600`} colSpan={7}>
                    No transactions available yet for this SACCO.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className={ipc.tbodyRow}>
                    <td className={ipc.td}>
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "—"}
                    </td>
                    <td className={ipc.td}>{tx.reference || "—"}</td>
                    <td className={ipc.td}>{getTransactionMemberName(tx)}</td>
                    <td className={ipc.td}>{getTransactionActionLabel(tx)}</td>
                    <td className={ipc.tdNum}>
                      {`${tx.currency || "UGX"} ${Number(tx.amount || 0).toLocaleString()}`}
                    </td>
                    <td className={ipc.td}>
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                        {tx.status || "—"}
                      </span>
                    </td>
                    <td className={`${ipc.td} text-right`}>
                      <button
                        type="button"
                        onClick={() => setSelectedTransaction(tx)}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
                        title="View transaction details"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]">
          <div className={`w-full max-w-2xl ${ipc.card} p-5 shadow-xl`}>
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-base font-semibold text-slate-900">Transaction Details</h4>
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm text-slate-700">
              <p><span className="font-medium">Reference:</span> {selectedTransaction.reference || "-"}</p>
              <p><span className="font-medium">Member:</span> {getTransactionMemberName(selectedTransaction)}</p>
              <p><span className="font-medium">Action:</span> {getTransactionActionLabel(selectedTransaction)}</p>
              <p><span className="font-medium">Type:</span> {selectedTransaction.type || "-"}</p>
              <p>
                <span className="font-medium">Amount:</span>{" "}
                {`${selectedTransaction.currency || "UGX"} ${Number(selectedTransaction.amount || 0).toLocaleString()}`}
              </p>
              <p><span className="font-medium">Status:</span> {selectedTransaction.status || "-"}</p>
              <p>
                <span className="font-medium">Date:</span>{" "}
                {selectedTransaction.createdAt
                  ? new Date(selectedTransaction.createdAt).toLocaleString()
                  : "-"}
              </p>
              <p><span className="font-medium">Description:</span> {selectedTransaction.description || "-"}</p>
            </div>
            <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Metadata</p>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-700">
                {JSON.stringify(selectedTransaction.metadata || {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
