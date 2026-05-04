"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { listPartnerSaccos, listSaccoTransactions } from "@/lib/api";
import { ipc } from "@/lib/dashboard-ui";

type SaccoSummary = {
  id: string;
  code?: string;
  name?: string;
  status?: string;
  totalCollectedBalance?: number;
  balanceCurrency?: string;
  _count?: { members?: number };
};

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

export default function SaccoHomePage() {
  const { user } = useAuth();
  const institutionId = user?.institution?.id ? String(user.institution.id) : "";
  const [sacco, setSacco] = useState<SaccoSummary | null>(null);
  const [transactions, setTransactions] = useState<SaccoTx[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true);
    setError("");
    try {
      const [allSaccos, txRes] = await Promise.all([
        listPartnerSaccos() as Promise<SaccoSummary[]>,
        listSaccoTransactions(institutionId),
      ]);
      const ownSacco =
        (Array.isArray(allSaccos)
          ? allSaccos.find((item) => String(item.id) === institutionId)
          : null) || null;
      setSacco(ownSacco);
      setTransactions((txRes.transactions || []) as SaccoTx[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load SACCO dashboard");
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const totalBalance = Number(sacco?.totalCollectedBalance || 0);
  const currency = sacco?.balanceCurrency || "UGX";
  const membersCount = Number(sacco?._count?.members || 0);
  const recentTx = useMemo(() => {
    return [...transactions]
      .sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 6);
  }, [transactions]);

  function formatMoney(value: number | string | null | undefined, ccy = "UGX") {
    const n = Number(value || 0);
    const safe = Number.isFinite(n) ? n : 0;
    return `${ccy} ${safe.toLocaleString()}`;
  }

  return (
    <div className={ipc.pageStack}>
      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          Institution Partner Console
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          {user?.institution?.name || "SACCO dashboard"}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Code: <span className="font-medium text-slate-800">{user?.institution?.code || "—"}</span>
        </p>
        <p className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          Role: {String(user?.permissions?.role || "VIEWER")}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className={ipc.metricTile}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Wallet balance</p>
          <p className="mt-2 text-xl font-bold tabular-nums text-slate-900">{formatMoney(totalBalance, currency)}</p>
          <p className="mt-1 text-xs text-slate-600">Current settlement balance for this SACCO.</p>
        </article>
        <article className={ipc.metricTile}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Transactions</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{transactions.length.toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-600">Rows returned for your SACCO only.</p>
        </article>
        <article className={ipc.metricTile}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Members</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{membersCount.toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-600">Registered SACCO customer members.</p>
        </article>
        <article className={ipc.metricTile}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{String(sacco?.status || "ACTIVE")}</p>
          <p className="mt-1 text-xs text-slate-600">Institution status in core.</p>
        </article>
      </section>

      {(error || loading) && (
        <section className={`${ipc.card} ${ipc.cardPad}`}>
          {loading && <p className="text-sm text-slate-600">Loading SACCO metrics...</p>}
          {error && <p className="text-sm font-medium text-red-700">{error}</p>}
        </section>
      )}

      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
        <p className="mt-1 text-sm text-slate-600">
          Manage your SACCO members, review transactions, and request liquidation (if your role allows).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/sacco/members"
            className={ipc.btnPrimary}
          >
            Members
          </Link>
          <Link href="/sacco/transactions" className={ipc.btnSecondary}>
            Transactions
          </Link>
          {user?.permissions?.canRequestLiquidation && (
            <Link href="/sacco/liquidation" className={ipc.btnSecondary}>
              Liquidation
            </Link>
          )}
        </div>
      </section>

      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Recent transactions</h2>
        <p className="mt-1 text-sm text-slate-600">Latest activity for this SACCO only.</p>
        <div className={`mt-4 ${ipc.tableWrap}`}>
          <table className={ipc.table}>
            <thead>
              <tr className={ipc.theadRow}>
                <th className={ipc.th}>Date</th>
                <th className={ipc.th}>Reference</th>
                <th className={ipc.th}>Type</th>
                <th className={ipc.th}>Status</th>
                <th className={ipc.th}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentTx.length === 0 ? (
                <tr>
                  <td className={`${ipc.td} text-slate-600`} colSpan={5}>
                    No transactions yet for this SACCO.
                  </td>
                </tr>
              ) : (
                recentTx.map((tx) => (
                  <tr key={tx.id} className={ipc.tbodyRow}>
                    <td className={`${ipc.td} whitespace-nowrap text-xs text-slate-600`}>
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "—"}
                    </td>
                    <td className={`${ipc.td} font-mono text-xs`}>{tx.reference || tx.id.slice(0, 8)}</td>
                    <td className={ipc.td}>{tx.type || "—"}</td>
                    <td className={ipc.td}>{tx.status || "—"}</td>
                    <td className={ipc.tdNum}>{formatMoney(tx.amount, tx.currency || currency)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Link href="/sacco/transactions" className={ipc.link}>
            View all transactions
          </Link>
        </div>
      </section>
    </div>
  );
}
