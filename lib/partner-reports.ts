import { listPartnerSaccos, listSaccoTransactions, listSaccoUsers } from "./api";

export type SaccoSummary = {
  id: string;
  code?: string;
  name?: string;
  totalCollectedBalance?: number;
  balanceCurrency?: string;
  status?: string;
  _count?: { members?: number };
};

export type ReportTransaction = {
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
    profile?: { firstName?: string | null; lastName?: string | null } | null;
  } | null;
  institutionId: string;
  saccoCode: string;
  saccoName: string;
};

function numAmount(v: string | number | null | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** True when a transaction is settled / succeeded (excludes pending, processing, failed). */
export function isSuccessfulTransactionStatus(status: string | null | undefined): boolean {
  const s = String(status || "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, "_");
  if (!s) return false;
  const ok = new Set([
    "SUCCESS",
    "SUCCESSFUL",
    "SUCCEEDED",
    "COMPLETED",
    "SETTLED",
    "CONFIRMED",
    "DONE",
    "PAID",
  ]);
  return ok.has(s);
}

/** Sum of absolute amounts for transactions whose status counts as successfully collected. */
export function sumSuccessfulCollectedAmount(transactions: ReportTransaction[]): number {
  return transactions.reduce((sum, t) => {
    if (!isSuccessfulTransactionStatus(t.status)) return sum;
    return sum + Math.abs(numAmount(t.amount));
  }, 0);
}

/** Per-institution successful collected totals (transaction history — not wallet balances). */
export function successfulCollectedByInstitution(transactions: ReportTransaction[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of transactions) {
    if (!isSuccessfulTransactionStatus(t.status)) continue;
    const id = String(t.institutionId);
    m.set(id, (m.get(id) || 0) + Math.abs(numAmount(t.amount)));
  }
  return m;
}

/**
 * Per-institution wallet balance totals from Core (`totalCollectedBalance` on each institution =
 * sum of that SACCO’s wallet balances). Use for dashboard “money on ledger” — not historical tx sums.
 */
export function walletBalanceByInstitution(saccos: SaccoSummary[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of saccos) {
    const id = String(s.id);
    const v = Number(s.totalCollectedBalance ?? 0);
    m.set(id, Number.isFinite(v) ? v : 0);
  }
  return m;
}

/** Sum of all institution wallet balances (same basis as per-SACCO `totalCollectedBalance`). */
export function sumInstitutionWalletBalances(saccos: SaccoSummary[]): number {
  return saccos.reduce((sum, s) => {
    const v = Number(s.totalCollectedBalance ?? 0);
    return sum + (Number.isFinite(v) ? v : 0);
  }, 0);
}

/**
 * Loads transactions for each SACCO (parallel). Failed per-SACCO fetches yield [] so other institutions still show.
 */
export async function fetchPartnerTransactionsForSaccos(saccos: SaccoSummary[]): Promise<ReportTransaction[]> {
  if (!saccos.length) return [];
  const chunks = await Promise.all(
    saccos.map(async (s) => {
      const id = String(s.id);
      try {
        const txRes = await listSaccoTransactions(id);
        return (txRes.transactions || []).map((tx) => ({
          ...tx,
          institutionId: id,
          saccoCode: String(s.code || "—"),
          saccoName: String(s.name || "—"),
        }));
      } catch {
        return [] as ReportTransaction[];
      }
    }),
  );
  return chunks.flat();
}

export type ReportMember = {
  id: string;
  accountNo?: string | null;
  clientId?: string | null;
  status?: string;
  createdAt?: string | null;
  user?: {
    email?: string | null;
    phone?: string | null;
    profile?: { firstName?: string | null; lastName?: string | null } | null;
  } | null;
  institutionId: string;
  saccoCode: string;
  saccoName: string;
};

export type PartnerReportsBundle = {
  saccos: SaccoSummary[];
  transactions: ReportTransaction[];
  members: ReportMember[];
};

/**
 * Loads all SACCOs and aggregates transactions + members per institution (parallel per SACCO).
 */
export async function fetchPartnerReportsData(): Promise<PartnerReportsBundle> {
  const raw = (await listPartnerSaccos()) as SaccoSummary[];
  const saccos = Array.isArray(raw) ? raw : [];

  const chunks = await Promise.all(
    saccos.map(async (s) => {
      const id = String(s.id);
      const [txRes, userRes] = await Promise.all([
        listSaccoTransactions(id),
        listSaccoUsers(id),
      ]);

      const txs: ReportTransaction[] = (txRes.transactions || []).map((tx) => ({
        ...tx,
        institutionId: id,
        saccoCode: String(s.code || "—"),
        saccoName: String(s.name || "—"),
      }));

      const members: ReportMember[] = (userRes.members || []).map((m) => {
        const row = m as ReportMember & { createdAt?: string | null };
        return {
          ...m,
          createdAt: row.createdAt ?? null,
          institutionId: id,
          saccoCode: String(s.code || "—"),
          saccoName: String(s.name || "—"),
        };
      });

      return { txs, members };
    }),
  );

  return {
    saccos,
    transactions: chunks.flatMap((c) => c.txs),
    members: chunks.flatMap((c) => c.members),
  };
}

export function parseTxDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
