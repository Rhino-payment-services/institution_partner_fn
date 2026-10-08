"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { listSaccoTransactions, listSaccoUsers } from "@/lib/api";
import { ipc } from "@/lib/dashboard-ui";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  TransactionsTable,
  type SaccoTransaction,
  type TransactionPagination,
} from "@/components/transactions/TransactionsTable";

type MemberItem = {
  id: string;
  accountNo?: string | null;
  clientId?: string | null;
  displayName?: string | null;
  status?: string;
  user?: {
    email?: string | null;
    phone?: string | null;
    profile?: {
      firstName?: string | null;
      lastName?: string | null;
    } | null;
  } | null;
};

const TX_PAGE_SIZE = 50;

export default function SaccoMemberDetailPage() {
  const params = useParams<{ id: string; memberId: string }>();
  const saccoId = params?.id ? String(params.id) : "";
  const memberId = params?.memberId ? String(params.memberId) : "";
  const [member, setMember] = useState<MemberItem | null>(null);
  const [institutionName, setInstitutionName] = useState("SACCO");
  const [isLoadingMember, setIsLoadingMember] = useState(false);
  const [transactions, setTransactions] = useState<SaccoTransaction[]>([]);
  const [txPagination, setTxPagination] = useState<TransactionPagination | null>(null);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isLoadingMoreTransactions, setIsLoadingMoreTransactions] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!saccoId || !memberId) return;
    void loadMember(saccoId, memberId);
    void loadTransactions(saccoId, memberId, 1, false);
  }, [saccoId, memberId]);

  async function loadMember(institutionId: string, id: string) {
    setIsLoadingMember(true);
    setError("");
    try {
      const data = await listSaccoUsers(institutionId);
      setInstitutionName(data?.institution?.name || "SACCO");
      const found = (data?.members || []).find((row) => String(row.id) === id) || null;
      setMember(found as MemberItem | null);
      if (!found) {
        setError("Member not found for this SACCO.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load member");
    } finally {
      setIsLoadingMember(false);
    }
  }

  async function loadTransactions(
    institutionId: string,
    id: string,
    page = 1,
    append = false,
  ) {
    if (append) setIsLoadingMoreTransactions(true);
    else setIsLoadingTransactions(true);
    try {
      const data = await listSaccoTransactions(institutionId, {
        page,
        limit: TX_PAGE_SIZE,
        memberId: id,
      });
      setTransactions((current) =>
        append ? [...current, ...(data.transactions || [])] : data.transactions || [],
      );
      setTxPagination(data.pagination || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load member transactions");
    } finally {
      setIsLoadingTransactions(false);
      setIsLoadingMoreTransactions(false);
    }
  }

  const firstName = member?.user?.profile?.firstName || "";
  const lastName = member?.user?.profile?.lastName || "";
  const legalName = `${firstName} ${lastName}`.trim() || "—";
  const displayName = member?.displayName?.trim() || legalName;

  return (
    <div className={ipc.pageStack}>
      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                {isLoadingMember ? "Member details" : displayName}
              </h2>
              {member ? <StatusBadge status={member.status} /> : null}
            </div>
            <p className="mt-2 text-sm text-slate-700">
              <span className="font-medium text-slate-900">SACCO:</span> {institutionName}
            </p>
            <p className="mt-1 text-sm text-slate-700">
              <span className="font-medium text-slate-900">Legal name:</span> {legalName}
            </p>
            <p className="mt-1 text-sm text-slate-700">
              <span className="font-medium text-slate-900">Phone:</span> {member?.user?.phone || "—"}
              <span className="mx-2 text-slate-300">|</span>
              <span className="font-medium text-slate-900">Email:</span> {member?.user?.email || "—"}
            </p>
            <p className="mt-1 text-sm text-slate-700">
              <span className="font-medium text-slate-900">Account no:</span>{" "}
              {member?.accountNo || "—"}
              <span className="mx-2 text-slate-300">|</span>
              <span className="font-medium text-slate-900">Client ID:</span> {member?.clientId || "—"}
            </p>
          </div>
          <Link href={`/dashboard/saccos/${saccoId}`} className={`${ipc.btnSecondary} shrink-0 self-start`}>
            Back to SACCO
          </Link>
        </div>
      </section>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <h3 className="text-lg font-semibold tracking-tight text-slate-900">Transactions</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Transaction history for this SACCO member.
        </p>
        <div className="mt-4">
          <TransactionsTable
            transactions={transactions}
            isLoading={isLoadingTransactions}
            emptyMessage="No transactions found for this member."
            showMember={false}
            pagination={txPagination}
            isLoadingMore={isLoadingMoreTransactions}
            onLoadMore={() =>
              void loadTransactions(saccoId, memberId, (txPagination?.page || 1) + 1, true)
            }
          />
        </div>
      </section>
    </div>
  );
}
