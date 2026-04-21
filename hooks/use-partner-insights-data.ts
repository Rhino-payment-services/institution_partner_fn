"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type PartnerReportsBundle,
  type ReportMember,
  type ReportTransaction,
  type SaccoSummary,
  dayKey,
  fetchPartnerReportsData,
  parseTxDate,
  successfulCollectedByInstitution,
} from "@/lib/partner-reports";

function defaultDateTo() {
  return new Date().toISOString().slice(0, 10);
}

function defaultDateFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString().slice(0, 10);
}

function numAmount(v: string | number | null | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function memberKey(m: ReportMember): string {
  const n = [m.user?.profile?.firstName, m.user?.profile?.lastName].filter(Boolean).join(" ").trim();
  return n || m.user?.email || m.user?.phone || "—";
}

function txMemberLabel(t: ReportTransaction): string {
  const n = [t.user?.profile?.firstName, t.user?.profile?.lastName].filter(Boolean).join(" ").trim();
  return n || t.user?.email || t.user?.phone || "—";
}

function inRange(iso: string | null | undefined, from: string, to: string): boolean {
  if (!iso) return false;
  const d = parseTxDate(iso);
  if (!d) return false;
  const t = d.getTime();
  const a = new Date(from + "T00:00:00").getTime();
  const b = new Date(to + "T23:59:59.999").getTime();
  return t >= a && t <= b;
}

export function usePartnerInsightsData() {
  const [bundle, setBundle] = useState<PartnerReportsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);
  const [saccoId, setSaccoId] = useState("");
  const [txStatus, setTxStatus] = useState("");
  const [txType, setTxType] = useState("");
  const [query, setQuery] = useState("");
  const [liveRefresh, setLiveRefresh] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchPartnerReportsData();
      setBundle(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reports");
      setBundle(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!liveRefresh) return;
    const id = window.setInterval(() => {
      void load();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [liveRefresh, load]);

  const filteredTx = useMemo(() => {
    if (!bundle) return [];
    const q = query.trim().toLowerCase();
    return bundle.transactions.filter((t) => {
      if (saccoId && t.institutionId !== saccoId) return false;
      if (txStatus && String(t.status || "").toLowerCase() !== txStatus.toLowerCase()) return false;
      if (txType && String(t.type || "").toLowerCase() !== txType.toLowerCase()) return false;
      if (t.createdAt) {
        if (!inRange(t.createdAt, dateFrom, dateTo)) return false;
      } else {
        return false;
      }
      if (!q) return true;
      const blob = [
        t.reference,
        t.description,
        t.saccoName,
        t.saccoCode,
        txMemberLabel(t),
        String(t.amount ?? ""),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [bundle, dateFrom, dateTo, saccoId, txStatus, txType, query]);

  const filteredMembers = useMemo(() => {
    if (!bundle) return [];
    const q = query.trim().toLowerCase();
    return bundle.members.filter((m) => {
      if (saccoId && m.institutionId !== saccoId) return false;
      if (m.createdAt) {
        if (!inRange(m.createdAt, dateFrom, dateTo)) return false;
      } else {
        return false;
      }
      if (!q) return true;
      const blob = [m.saccoName, m.saccoCode, memberKey(m), m.user?.email, m.user?.phone]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [bundle, dateFrom, dateTo, saccoId, query]);

  const membersWithoutDate = useMemo(() => {
    if (!bundle) return 0;
    return bundle.members.filter((m) => !m.createdAt).length;
  }, [bundle]);

  const saccoOptions = bundle?.saccos ?? [];

  const filteredSaccos: SaccoSummary[] = useMemo(() => {
    if (!bundle) return [];
    if (!saccoId) return bundle.saccos;
    return bundle.saccos.filter((s) => String(s.id) === saccoId);
  }, [bundle, saccoId]);

  const uniqueStatuses = useMemo(() => {
    if (!bundle) return [] as string[];
    const s = new Set<string>();
    bundle.transactions.forEach((t) => {
      if (t.status) s.add(String(t.status));
    });
    return [...s].sort();
  }, [bundle]);

  const uniqueTypes = useMemo(() => {
    if (!bundle) return [] as string[];
    const s = new Set<string>();
    bundle.transactions.forEach((t) => {
      if (t.type) s.add(String(t.type));
    });
    return [...s].sort();
  }, [bundle]);

  const dailyTx = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    for (const t of filteredTx) {
      const d = parseTxDate(t.createdAt || undefined);
      if (!d) continue;
      const k = dayKey(d);
      const cur = map.get(k) || { amount: 0, count: 0 };
      cur.amount += Math.abs(numAmount(t.amount));
      cur.count += 1;
      map.set(k, cur);
    }
    const keys = [...map.keys()].sort();
    return keys.map((k) => ({ day: k, ...map.get(k)! }));
  }, [filteredTx]);

  const dailyMembers = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of filteredMembers) {
      const d = parseTxDate(m.createdAt || undefined);
      if (!d) continue;
      const k = dayKey(d);
      map.set(k, (map.get(k) || 0) + 1);
    }
    const keys = [...map.keys()].sort();
    return keys.map((k) => ({ day: k, count: map.get(k)! }));
  }, [filteredMembers]);

  const maxDailyAmount = useMemo(
    () => (dailyTx.length ? Math.max(...dailyTx.map((d) => d.amount), 1) : 1),
    [dailyTx],
  );
  const maxDailyMembers = useMemo(
    () => (dailyMembers.length ? Math.max(...dailyMembers.map((d) => d.count), 1) : 1),
    [dailyMembers],
  );

  const successCollectedByInstitution = useMemo(
    () => successfulCollectedByInstitution(bundle?.transactions ?? []),
    [bundle?.transactions],
  );

  const balanceRows = useMemo(() => {
    return filteredSaccos
      .map((s) => ({
        id: String(s.id),
        code: String(s.code || "—"),
        name: String(s.name || "—"),
        balance: successCollectedByInstitution.get(String(s.id)) ?? 0,
        currency: s.balanceCurrency || "UGX",
        members: Number(s._count?.members || 0),
      }))
      .sort((a, b) => b.balance - a.balance);
  }, [filteredSaccos, successCollectedByInstitution]);

  const maxBalance = useMemo(
    () => (balanceRows.length ? Math.max(...balanceRows.map((r) => r.balance), 1) : 1),
    [balanceRows],
  );

  const txTotalVolume = useMemo(
    () => filteredTx.reduce((s, t) => s + Math.abs(numAmount(t.amount)), 0),
    [filteredTx],
  );
  const txCount = filteredTx.length;
  const totalBalance = useMemo(() => balanceRows.reduce((s, r) => s + r.balance, 0), [balanceRows]);
  const totalMembersFiltered = useMemo(
    () => filteredSaccos.reduce((s, x) => s + Number(x._count?.members || 0), 0),
    [filteredSaccos],
  );

  function formatMoney(n: number, ccy = "UGX") {
    return `${ccy} ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }

  return {
    bundle,
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
    liveRefresh,
    setLiveRefresh,
    saccoOptions,
    uniqueStatuses,
    uniqueTypes,
    membersWithoutDate,
    filteredTx,
    filteredMembers,
    filteredSaccos,
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
  };
}

export type PartnerInsightsData = ReturnType<typeof usePartnerInsightsData>;
