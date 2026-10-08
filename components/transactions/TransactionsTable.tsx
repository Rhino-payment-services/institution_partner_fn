"use client";

import { useState } from "react";
import { ipc } from "@/lib/dashboard-ui";

export type SaccoTransaction = {
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
};

export type TransactionPagination = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
};

export function getTransactionMemberName(tx: SaccoTransaction) {
  const first = tx.user?.profile?.firstName?.trim() || "";
  const last = tx.user?.profile?.lastName?.trim() || "";
  const full = `${first} ${last}`.trim();
  if (full) return full;

  const metadataName = String((tx.metadata?.nexenMemberName as string) || "").trim();
  if (metadataName) return metadataName;

  if (tx.user?.phone) return tx.user.phone;
  if (tx.user?.email) return tx.user.email;
  return "—";
}

export function getTransactionActionLabel(tx: SaccoTransaction) {
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
  return tx.type || "—";
}

export function TransactionsTable({
  transactions,
  isLoading,
  emptyMessage = "No transactions available yet.",
  showMember = true,
  pagination,
  onLoadMore,
  isLoadingMore,
}: {
  transactions: SaccoTransaction[];
  isLoading?: boolean;
  emptyMessage?: string;
  showMember?: boolean;
  pagination?: TransactionPagination | null;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}) {
  const [selectedTransaction, setSelectedTransaction] = useState<SaccoTransaction | null>(null);
  const colSpan = showMember ? 7 : 6;
  const page = pagination?.page ?? 1;
  const totalPages = pagination?.totalPages ?? 1;
  const hasMore = Boolean(onLoadMore) && page < totalPages;

  return (
    <>
      <div className={ipc.tableWrap}>
        <table className={ipc.table}>
          <thead>
            <tr className={ipc.theadRow}>
              <th className={ipc.th}>Date</th>
              <th className={ipc.th}>Reference</th>
              {showMember ? <th className={ipc.th}>Member</th> : null}
              <th className={ipc.th}>Action</th>
              <th className={ipc.th}>Amount</th>
              <th className={ipc.th}>Status</th>
              <th className={`${ipc.th} text-right`}>View</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className={`${ipc.td} text-slate-600`} colSpan={colSpan}>
                  Loading transactions…
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td className={`${ipc.td} text-slate-600`} colSpan={colSpan}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className={ipc.tbodyRow}>
                  <td className={ipc.td}>
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "—"}
                  </td>
                  <td className={ipc.td}>{tx.reference || "—"}</td>
                  {showMember ? <td className={ipc.td}>{getTransactionMemberName(tx)}</td> : null}
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
      {hasMore ? (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className={ipc.btnSecondary}
          >
            {isLoadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
      {selectedTransaction ? (
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
              <p>
                <span className="font-medium">Reference:</span> {selectedTransaction.reference || "—"}
              </p>
              {showMember ? (
                <p>
                  <span className="font-medium">Member:</span>{" "}
                  {getTransactionMemberName(selectedTransaction)}
                </p>
              ) : null}
              <p>
                <span className="font-medium">Action:</span>{" "}
                {getTransactionActionLabel(selectedTransaction)}
              </p>
              <p>
                <span className="font-medium">Type:</span> {selectedTransaction.type || "—"}
              </p>
              <p>
                <span className="font-medium">Amount:</span>{" "}
                {`${selectedTransaction.currency || "UGX"} ${Number(selectedTransaction.amount || 0).toLocaleString()}`}
              </p>
              <p>
                <span className="font-medium">Status:</span> {selectedTransaction.status || "—"}
              </p>
              <p>
                <span className="font-medium">Date:</span>{" "}
                {selectedTransaction.createdAt
                  ? new Date(selectedTransaction.createdAt).toLocaleString()
                  : "—"}
              </p>
              <p>
                <span className="font-medium">Description:</span>{" "}
                {selectedTransaction.description || "—"}
              </p>
            </div>
            <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Metadata
              </p>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-700">
                {JSON.stringify(selectedTransaction.metadata || {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
