"use client";

import { useEffect, useMemo, useState } from "react";
import { createPartnerStaff, listPartnerTeamMembers, resendPartnerTeamInvitation, updatePartnerStaff } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ipc } from "@/lib/dashboard-ui";

type StaffItem = {
  id: string;
  userId?: string;
  status?: string;
  accountStatus?: string;
  role?: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
};

export default function StaffPage() {
  const { user } = useAuth();
  const isInstitutionScoped = user?.scope === "INSTITUTION";
  const role = String(user?.permissions?.role || "").toUpperCase();
  const canManageMembers = Boolean(
    user?.permissions?.canManageMembers ||
      role === "OWNER" ||
      role === "ADMIN",
  );
  const partnerId = user?.partner?.id;
  const canManagePartnerStaff = useMemo(
    () => !isInstitutionScoped && canManageMembers,
    [isInstitutionScoped, canManageMembers],
  );

  const [staffRows, setStaffRows] = useState<StaffItem[]>([]);
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPhoneNumber, setStaffPhoneNumber] = useState("");
  const [staffFirstName, setStaffFirstName] = useState("");
  const [staffLastName, setStaffLastName] = useState("");
  const [staffRole, setStaffRole] = useState<"OWNER" | "ADMIN" | "DEVELOPER" | "MEMBER" | "VIEWER">("MEMBER");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendMemberId, setResendMemberId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!partnerId || isInstitutionScoped) return;
    void loadPartnerStaff(partnerId);
  }, [partnerId, isInstitutionScoped]);

  async function loadPartnerStaff(targetPartnerId: string) {
    setError("");
    try {
      const data = await listPartnerTeamMembers(targetPartnerId);
      setStaffRows((data?.members || []) as StaffItem[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load partner staff");
    }
  }

  async function handleResend(memberId: string) {
    if (!partnerId) return;
    setResendMemberId(memberId);
    setError("");
    setFeedback("");
    try {
      await resendPartnerTeamInvitation(partnerId, memberId);
      setFeedback("Invitation email sent successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend invitation");
    } finally {
      setResendMemberId(null);
    }
  }

  async function handleRoleChange(
    memberId: string,
    role: "OWNER" | "ADMIN" | "DEVELOPER" | "MEMBER" | "VIEWER",
  ) {
    setUpdatingRoleId(memberId);
    setError("");
    setFeedback("");
    try {
      await updatePartnerStaff(memberId, { role });
      setFeedback("Staff role updated.");
      if (partnerId) await loadPartnerStaff(partnerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update staff role");
    } finally {
      setUpdatingRoleId(null);
    }
  }

  async function handleCreateStaff(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!partnerId) {
      setError("Partner context missing. Please login again.");
      return;
    }
    setError("");
    setFeedback("");
    setIsSubmitting(true);
    try {
      await createPartnerStaff(partnerId, {
        firstName: staffFirstName.trim() || undefined,
        lastName: staffLastName.trim() || undefined,
        email: staffEmail.trim(),
        phoneNumber: staffPhoneNumber.trim() || undefined,
        role: staffRole,
      });
      setFeedback("Invitation email sent successfully.");
      setStaffEmail("");
      setStaffPhoneNumber("");
      setStaffFirstName("");
      setStaffLastName("");
      setStaffRole("MEMBER");
      setIsCreateModalOpen(false);
      await loadPartnerStaff(partnerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create partner staff login");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!canManagePartnerStaff) {
    return (
      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Access denied</h2>
        <p className="mt-1 text-sm text-slate-600">
          This page is for partner dashboard staff management only.
        </p>
      </section>
    );
  }

  return (
    <div className={ipc.pageStack}>
      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Staff management</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Create partner dashboard staff users and assign roles (OWNER, ADMIN, DEVELOPER, MEMBER, VIEWER).
        </p>
      </section>

      {(error || feedback) && (
        <section className="space-y-2">
          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {feedback && (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {feedback}
            </p>
          )}
        </section>
      )}

      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">Create staff login user</h3>
            <p className="mt-1 text-sm text-slate-600">
              Add a partner dashboard staff account. We email them a secure link to set their own password.
            </p>
          </div>
          <button
            type="button"
            disabled={!partnerId}
            onClick={() => setIsCreateModalOpen(true)}
            className={`${ipc.btnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            Create staff login
          </button>
        </div>
      </section>

      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <h3 className="text-lg font-semibold tracking-tight text-slate-900">Existing partner staff users</h3>
        <div className={`mt-4 ${ipc.tableWrap}`}>
          <table className={ipc.table}>
            <thead>
              <tr className={ipc.theadRow}>
                <th className={ipc.th}>Name</th>
                <th className={ipc.th}>Email</th>
                <th className={ipc.th}>Phone</th>
                <th className={ipc.th}>Role</th>
                <th className={ipc.th}>Account</th>
                <th className={ipc.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staffRows.length === 0 ? (
                <tr>
                  <td className={`${ipc.td} text-slate-600`} colSpan={6}>
                    No partner staff logins yet.
                  </td>
                </tr>
              ) : (
                staffRows.map((s) => {
                  const first = s.firstName || "";
                  const last = s.lastName || "";
                  const badge =
                    s.accountStatus === "PENDING_INVITATION" || String(s.status) === "PENDING"
                      ? "Pending Invitation"
                      : "Active";
                  const badgeClass =
                    badge === "Active"
                      ? "bg-emerald-50 text-emerald-800 ring-emerald-600/20"
                      : "bg-amber-50 text-amber-900 ring-amber-600/20";
                  const showResend =
                    canManagePartnerStaff &&
                    (s.accountStatus === "PENDING_INVITATION" || String(s.status) === "PENDING");
                  const isSelf =
                    Boolean(user?.email) &&
                    String(s.email || "").toLowerCase() === String(user?.email || "").toLowerCase();
                  const canEditRole = canManagePartnerStaff && !isSelf;
                  return (
                    <tr key={s.id} className={ipc.tbodyRow}>
                      <td className={ipc.td}>{`${first} ${last}`.trim() || "—"}</td>
                      <td className={ipc.td}>{s.email || "—"}</td>
                      <td className={ipc.td}>—</td>
                      <td className={ipc.td}>
                        {canEditRole ? (
                          <select
                            value={s.role || "VIEWER"}
                            disabled={updatingRoleId === s.id}
                            onChange={(e) =>
                              void handleRoleChange(
                                s.id,
                                e.target.value as "OWNER" | "ADMIN" | "DEVELOPER" | "MEMBER" | "VIEWER",
                              )
                            }
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
                          >
                            <option value="OWNER">OWNER</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="DEVELOPER">DEVELOPER</option>
                            <option value="MEMBER">MEMBER</option>
                            <option value="VIEWER">VIEWER</option>
                          </select>
                        ) : (
                          <span className="text-sm text-slate-800">
                            {s.role || "VIEWER"}
                            {isSelf ? (
                              <span className="ml-1 text-xs text-slate-500">(you)</span>
                            ) : null}
                          </span>
                        )}
                      </td>
                      <td className={ipc.td}>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeClass}`}
                        >
                          {badge}
                        </span>
                      </td>
                      <td className={ipc.td}>
                        {showResend ? (
                          <button
                            type="button"
                            onClick={() => void handleResend(s.id)}
                            disabled={resendMemberId === s.id}
                            className="text-sm font-medium text-[var(--rukapay-primary)] hover:underline disabled:opacity-50"
                          >
                            {resendMemberId === s.id ? "Sending…" : "Resend invitation"}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isCreateModalOpen && (
        <div
          className={ipc.modalOverlay}
          role="presentation"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className={ipc.modalPanelLg}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-staff-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={ipc.modalHeader}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 id="create-staff-title" className="text-lg font-semibold tracking-tight text-slate-900">
                    Create staff login
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    We will send a one-time invitation link to set a password.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className={ipc.modalClose}
                >
                  Close
                </button>
              </div>
            </div>
            <form onSubmit={handleCreateStaff} className="flex min-h-0 flex-1 flex-col">
              <div className={`${ipc.modalBody} grid grid-cols-1 gap-3 md:grid-cols-2`}>
                <input
                  value={staffFirstName}
                  onChange={(e) => setStaffFirstName(e.target.value)}
                  placeholder="First Name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  required
                />
                <input
                  value={staffLastName}
                  onChange={(e) => setStaffLastName(e.target.value)}
                  placeholder="Last Name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  required
                />
                <input
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="staff@partner.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  required
                  type="email"
                />
                <input
                  value={staffPhoneNumber}
                  onChange={(e) => setStaffPhoneNumber(e.target.value)}
                  placeholder="+2567..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                />
                <select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value as "OWNER" | "ADMIN" | "DEVELOPER" | "MEMBER" | "VIEWER")}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                >
                  <option value="OWNER">OWNER</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="DEVELOPER">DEVELOPER</option>
                  <option value="MEMBER">MEMBER</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
              </div>
              <div className={ipc.modalFooter}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className={`${ipc.btnSecondary} w-full rounded-xl sm:w-auto`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!partnerId || isSubmitting}
                  className={`${ipc.btnPrimary} w-full rounded-xl px-6 sm:w-auto disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {isSubmitting ? "Sending invitation…" : "Send invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
