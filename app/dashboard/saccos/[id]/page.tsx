"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  deletePartnerSacco,
  getPartnerSacco,
  listSaccoAudit,
  listSaccoTransactions,
  listSaccoUsers,
  restorePartnerSacco,
  setSaccoStatus,
  updatePartnerSacco,
} from "@/lib/api";
import { ipc } from "@/lib/dashboard-ui";
import { useAuth } from "@/lib/auth-context";
import { ConfirmActionModal } from "@/components/common/ConfirmActionModal";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EditSaccoModal } from "@/components/saccos/EditSaccoModal";
import { DELETED_RECORD_COPY, SaccoLifecycleActions } from "@/components/saccos/SaccoLifecycleActions";
import {
  TransactionsTable,
  type SaccoTransaction,
  type TransactionPagination,
} from "@/components/transactions/TransactionsTable";

type SaccoItem = {
  id: string;
  code?: string;
  name?: string;
  licenseNumber?: string | null;
  externalOrgId?: string | null;
  status?: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deletionReason?: string | null;
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

type AuditRow = {
  id: string;
  entityType?: string;
  action?: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  reason?: string | null;
  actorEmail?: string | null;
  createdAt?: string;
};

type PendingSaccoAction = "inactive" | "active" | "delete" | "restore" | null;

const TX_PAGE_SIZE = 50;

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

export default function SaccoDetailPage() {
  const params = useParams<{ id: string }>();
  const saccoId = params?.id;
  const { user } = useAuth();
  const authRole = String(user?.permissions?.role || "").toUpperCase();
  const isPartnerScope = user?.scope !== "INSTITUTION";
  const canManageInstitution = Boolean(
    user?.permissions?.canManageInstitution || authRole === "OWNER" || authRole === "ADMIN",
  );
  const canChangeSaccoStatus = isPartnerScope && canManageInstitution;
  const [sacco, setSacco] = useState<SaccoItem | null>(null);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editExternalOrgId, setEditExternalOrgId] = useState("");
  const [editLicenseNumber, setEditLicenseNumber] = useState("");
  const [editError, setEditError] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingSaccoAction>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionError, setActionError] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [transactions, setTransactions] = useState<SaccoTransaction[]>([]);
  const [txPagination, setTxPagination] = useState<TransactionPagination | null>(null);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isLoadingMoreTransactions, setIsLoadingMoreTransactions] = useState(false);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!saccoId) return;
    void loadSacco(String(saccoId));
    void loadTransactions(String(saccoId));
    void loadMembers(String(saccoId));
    void loadAudit(String(saccoId));
  }, [saccoId, canManageInstitution]);

  async function loadSacco(institutionId: string) {
    setError("");
    try {
      const data = (await getPartnerSacco(institutionId)) as SaccoItem;
      setSacco(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load SACCO details");
    }
  }

  async function loadAudit(institutionId: string) {
    if (!canManageInstitution) {
      setAuditRows([]);
      return;
    }
    setIsLoadingAudit(true);
    try {
      const data = await listSaccoAudit(institutionId);
      setAuditRows(Array.isArray(data) ? data : []);
    } catch {
      setAuditRows([]);
    } finally {
      setIsLoadingAudit(false);
    }
  }

  async function loadMembers(institutionId: string) {
    setIsLoadingMembers(true);
    try {
      const data = await listSaccoUsers(institutionId);
      setMembers((data?.members || []) as MemberItem[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load SACCO members");
    } finally {
      setIsLoadingMembers(false);
    }
  }

  async function loadTransactions(institutionId: string, page = 1, append = false) {
    if (append) setIsLoadingMoreTransactions(true);
    else setIsLoadingTransactions(true);
    try {
      const data = await listSaccoTransactions(institutionId, { page, limit: TX_PAGE_SIZE });
      setTransactions((current) =>
        append ? [...current, ...(data.transactions || [])] : data.transactions || [],
      );
      setTxPagination(data.pagination || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load SACCO transactions");
    } finally {
      setIsLoadingTransactions(false);
      setIsLoadingMoreTransactions(false);
    }
  }

  function formatMoney(value: number | undefined, currency = "UGX") {
    const amount = Number(value || 0);
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    return `${currency} ${safeAmount.toLocaleString()}`;
  }

  function openEdit() {
    if (!sacco) return;
    setEditName(String(sacco.name || ""));
    setEditCode(String(sacco.code || ""));
    setEditExternalOrgId(String(sacco.externalOrgId || ""));
    setEditLicenseNumber(String(sacco.licenseNumber || ""));
    setEditError("");
    setIsEditOpen(true);
  }

  async function handleSaveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!saccoId || !sacco) return;
    setIsSavingEdit(true);
    setEditError("");
    try {
      const payload: {
        name: string;
        licenseNumber: string | null;
        code?: string;
        externalOrgId?: string | null;
      } = {
        name: editName.trim(),
        licenseNumber: editLicenseNumber.trim() || null,
      };
      const nextCode = editCode.trim();
      const nextOrgId = editExternalOrgId.trim();
      if (nextCode && nextCode !== String(sacco.code || "")) {
        payload.code = nextCode;
      }
      if (nextOrgId !== String(sacco.externalOrgId || "")) {
        payload.externalOrgId = nextOrgId;
      }
      await updatePartnerSacco(String(saccoId), payload);
      setIsEditOpen(false);
      await loadSacco(String(saccoId));
      await loadAudit(String(saccoId));
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update SACCO");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleConfirmStatusAction() {
    if (!saccoId || !pendingAction) return;
    setIsSubmittingAction(true);
    setActionError("");
    try {
      if (pendingAction === "inactive") {
        await setSaccoStatus(String(saccoId), { status: "INACTIVE", reason: actionReason.trim() || undefined });
      } else if (pendingAction === "active") {
        await setSaccoStatus(String(saccoId), { status: "ACTIVE", reason: actionReason.trim() || undefined });
      } else if (pendingAction === "delete") {
        await deletePartnerSacco(String(saccoId), actionReason.trim() || undefined);
      } else if (pendingAction === "restore") {
        await restorePartnerSacco(String(saccoId), actionReason.trim() || undefined);
      }
      setPendingAction(null);
      await loadSacco(String(saccoId));
      await loadAudit(String(saccoId));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update SACCO");
    } finally {
      setIsSubmittingAction(false);
    }
  }

  return (
    <div className={ipc.pageStack}>
      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                {sacco ? String(sacco.name || "SACCO") : "SACCO details"}
              </h2>
              {sacco ? <StatusBadge status={sacco.status} /> : null}
            </div>
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
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <Link href="/dashboard/saccos" className={`${ipc.btnSecondary} shrink-0 self-start`}>
              Back to SACCOs
            </Link>
            {sacco ? (
              <SaccoLifecycleActions
                status={sacco.status}
                canEdit={canManageInstitution}
                canChangeStatus={canChangeSaccoStatus}
                onEdit={openEdit}
                onMakeInactive={() => {
                  setPendingAction("inactive");
                  setActionReason("");
                  setActionError("");
                }}
                onMakeActive={() => {
                  setPendingAction("active");
                  setActionReason("");
                  setActionError("");
                }}
                onDelete={() => {
                  setPendingAction("delete");
                  setActionReason("");
                  setActionError("");
                }}
                onRestore={() => {
                  setPendingAction("restore");
                  setActionReason("");
                  setActionError("");
                }}
              />
            ) : null}
          </div>
        </div>
        {String(sacco?.status || "").toUpperCase() === "DELETED" ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p className="font-semibold">This SACCO is deleted.</p>
            <p className="mt-1">
              Deleted at: {sacco?.deletedAt ? new Date(sacco.deletedAt).toLocaleString() : "—"}
              {sacco?.deletedBy ? ` · by ${sacco.deletedBy}` : ""}
            </p>
            {sacco?.deletionReason ? <p className="mt-1">Reason: {sacco.deletionReason}</p> : null}
          </div>
        ) : null}
      </section>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">Members</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Customer members linked to this SACCO.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-slate-700">Total: {members.length}</p>
            <Link href="/dashboard/members" className={ipc.btnPrimary}>
              Manage members
            </Link>
          </div>
        </div>
        <div className={ipc.tableWrap}>
          <table className={ipc.table}>
            <thead>
              <tr className={ipc.theadRow}>
                <th className={ipc.th}>Display name</th>
                <th className={ipc.th}>Legal name</th>
                <th className={ipc.th}>Phone</th>
                <th className={ipc.th}>Email</th>
                <th className={ipc.th}>Account no</th>
                <th className={ipc.th}>Client ID</th>
                <th className={ipc.th}>Status</th>
                <th className={`${ipc.th} text-right`}>View</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingMembers ? (
                <tr>
                  <td className={`${ipc.td} text-slate-600`} colSpan={8}>
                    Loading members…
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td className={`${ipc.td} text-slate-600`} colSpan={8}>
                    No members found for this SACCO.
                  </td>
                </tr>
              ) : (
                members.map((member) => {
                  const firstName = member.user?.profile?.firstName || "";
                  const lastName = member.user?.profile?.lastName || "";
                  const legalName = `${firstName} ${lastName}`.trim() || "—";
                  const displayName = member.displayName?.trim() || legalName;
                  return (
                    <tr key={member.id} className={ipc.tbodyRow}>
                      <td className={`${ipc.td} font-medium`}>
                        <Link
                          href={`/dashboard/saccos/${saccoId}/members/${member.id}`}
                          className={ipc.link}
                        >
                          {displayName}
                        </Link>
                      </td>
                      <td className={ipc.td}>{legalName}</td>
                      <td className={ipc.td}>{member.user?.phone || "—"}</td>
                      <td className={ipc.td}>{member.user?.email || "—"}</td>
                      <td className={ipc.td}>{member.accountNo || "—"}</td>
                      <td className={ipc.td}>{member.clientId || "—"}</td>
                      <td className={ipc.td}>
                        <StatusBadge status={member.status} />
                      </td>
                      <td className={`${ipc.td} text-right`}>
                        <Link
                          href={`/dashboard/saccos/${saccoId}/members/${member.id}`}
                          className={ipc.link}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <h3 className="text-lg font-semibold tracking-tight text-slate-900">Transactions</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Latest transactions for this SACCO, including member activity.
        </p>
        <div className="mt-4">
          <TransactionsTable
            transactions={transactions}
            isLoading={isLoadingTransactions}
            emptyMessage="No transactions available yet for this SACCO."
            pagination={txPagination}
            isLoadingMore={isLoadingMoreTransactions}
            onLoadMore={
              saccoId
                ? () => void loadTransactions(String(saccoId), (txPagination?.page || 1) + 1, true)
                : undefined
            }
          />
        </div>
      </section>

      {canManageInstitution ? (
        <section className={`${ipc.card} ${ipc.cardPad}`}>
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">History</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Permanent audit trail for this SACCO and its members.
          </p>
          <div className={`mt-4 ${ipc.tableWrap}`}>
            <table className={ipc.table}>
              <thead>
                <tr className={ipc.theadRow}>
                  <th className={ipc.th}>When</th>
                  <th className={ipc.th}>Action</th>
                  <th className={ipc.th}>Status</th>
                  <th className={ipc.th}>Actor</th>
                  <th className={ipc.th}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingAudit ? (
                  <tr>
                    <td className={`${ipc.td} text-slate-600`} colSpan={5}>
                      Loading history…
                    </td>
                  </tr>
                ) : auditRows.length === 0 ? (
                  <tr>
                    <td className={`${ipc.td} text-slate-600`} colSpan={5}>
                      No audit history yet.
                    </td>
                  </tr>
                ) : (
                  auditRows.map((row) => (
                    <tr key={row.id} className={ipc.tbodyRow}>
                      <td className={`${ipc.td} whitespace-nowrap text-xs text-slate-600`}>
                        {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                      </td>
                      <td className={ipc.td}>{row.action || "—"}</td>
                      <td className={ipc.td}>
                        {row.previousStatus || "—"} → {row.newStatus || "—"}
                      </td>
                      <td className={ipc.td}>{row.actorEmail || "—"}</td>
                      <td className={ipc.td}>{row.reason || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <EditSaccoModal
        open={isEditOpen}
        isSubmitting={isSavingEdit}
        error={editError}
        code={editCode}
        externalOrgId={editExternalOrgId}
        name={editName}
        licenseNumber={editLicenseNumber}
        onCodeChange={setEditCode}
        onExternalOrgIdChange={setEditExternalOrgId}
        onNameChange={setEditName}
        onLicenseNumberChange={setEditLicenseNumber}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleSaveEdit}
      />

      <ConfirmActionModal
        open={Boolean(pendingAction)}
        title={
          pendingAction === "delete"
            ? "Delete SACCO"
            : pendingAction === "restore"
              ? "Restore SACCO"
              : pendingAction === "inactive"
                ? "Make SACCO inactive"
                : "Make SACCO active"
        }
        explanation={
          pendingAction === "delete"
            ? DELETED_RECORD_COPY
            : pendingAction === "restore"
              ? "This restores the SACCO to INACTIVE if no live SACCO already uses the same code or external org ID."
              : pendingAction === "inactive"
                ? "Inactive SACCOs stay in the list. Members and history are preserved."
                : "This SACCO will be available for live operations again."
        }
        confirmLabel={
          pendingAction === "delete"
            ? "Delete"
            : pendingAction === "restore"
              ? "Restore"
              : pendingAction === "inactive"
                ? "Make Inactive"
                : "Make Active"
        }
        danger={pendingAction === "delete"}
        reason={actionReason}
        isSubmitting={isSubmittingAction}
        error={actionError}
        onReasonChange={setActionReason}
        onClose={() => setPendingAction(null)}
        onConfirm={() => void handleConfirmStatusAction()}
      />
    </div>
  );
}
