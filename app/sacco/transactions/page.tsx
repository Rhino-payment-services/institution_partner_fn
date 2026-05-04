"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listSaccoTransactions } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ipc } from "@/lib/dashboard-ui";

type SaccoTx = {
  id: string;
  reference?: string | null;
  type?: string | null;
  status?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  createdAt?: string | null;
  description?: string | null;
};

export default function SaccoTransactionsPage() {
  const { user } = useAuth();
  const institutionId = user?.institution?.id ? String(user.institution.id) : "";
  const canViewTransactions = Boolean(user?.permissions?.canViewTransactions);
  const [transactions, setTransactions] = useState<SaccoTx[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const loadTransactions = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true);
    setError("");
    try {
      const data = await listSaccoTransactions(institutionId);
      setTransactions((data.transactions || []) as SaccoTx[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.status) set.add(String(tx.status));
    });
    return [...set].sort();
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const fromTs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const toTs = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : null;
    return transactions.filter((tx) => {
      if (statusFilter && String(tx.status || "").toUpperCase() !== statusFilter.toUpperCase()) return false;
      if (fromTs || toTs) {
        if (!tx.createdAt) return false;
        const ts = new Date(tx.createdAt).getTime();
        if (Number.isNaN(ts)) return false;
        if (fromTs !== null && ts < fromTs) return false;
        if (toTs !== null && ts > toTs) return false;
      }
      if (!q) return true;
      const blob = [tx.reference, tx.description, tx.type, tx.status, String(tx.amount || "")]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [transactions, query, statusFilter, fromDate, toDate]);

  function formatMoney(value: number | string | null | undefined, ccy = "UGX") {
    const n = Number(value || 0);
    const safe = Number.isFinite(n) ? n : 0;
    return `${ccy} ${safe.toLocaleString()}`;
  }

  if (!canViewTransactions) {
    return (
      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Access denied</h2>
        <p className="mt-1 text-sm text-slate-600">Your role cannot view SACCO transactions.</p>
      </section>
    );
  }

  return (
    <div className={ipc.pageStack}>
      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium text-slate-700">Search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Reference / description..."
              className={ipc.input}
            />
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium text-slate-700">Status</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={ipc.input}>
              <option value="">Any</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium text-slate-700">From</span>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={ipc.input} />
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium text-slate-700">To</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={ipc.input} />
          </label>
          <button type="button" onClick={() => void loadTransactions()} className={ipc.btnSecondary} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </section>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </p>
      )}

      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">SACCO transactions</h2>
          <p className="text-xs text-slate-500">{filtered.length.toLocaleString()} row(s)</p>
        </div>
        <div className={ipc.tableWrap}>
          <table className={ipc.table}>
            <thead>
              <tr className={ipc.theadRow}>
                <th className={ipc.th}>Date</th>
                <th className={ipc.th}>Reference</th>
                <th className={ipc.th}>Type</th>
                <th className={ipc.th}>Status</th>
                <th className={ipc.th}>Amount</th>
                <th className={ipc.th}>Description</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td className={`${ipc.td} text-slate-600`} colSpan={6}>
                    No transactions found for your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => (
                  <tr key={tx.id} className={ipc.tbodyRow}>
                    <td className={`${ipc.td} whitespace-nowrap text-xs text-slate-600`}>
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "—"}
                    </td>
                    <td className={`${ipc.td} font-mono text-xs`}>{tx.reference || tx.id.slice(0, 8)}</td>
                    <td className={ipc.td}>{tx.type || "—"}</td>
                    <td className={ipc.td}>{tx.status || "—"}</td>
                    <td className={ipc.tdNum}>{formatMoney(tx.amount, tx.currency || "UGX")}</td>
                    <td className={`${ipc.td} max-w-[280px] truncate`}>{tx.description || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
