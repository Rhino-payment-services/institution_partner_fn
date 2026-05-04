"use client";

import { useEffect, useMemo, useState } from "react";
import { createPartnerStaff, listPartnerTeamMembers } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ipc } from "@/lib/dashboard-ui";

type StaffItem = {
  id: string;
  status?: string;
  role?: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
};

export default function StaffPage() {
  const { user } = useAuth();
  const isInstitutionScoped = user?.scope === "INSTITUTION";
  const canManageMembers = Boolean(
    user?.permissions?.canManageMembers || user?.permissions?.role === "OWNER",
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
  const [staffPassword, setStaffPassword] = useState("");
  const [staffRole, setStaffRole] = useState<"OWNER" | "ADMIN" | "DEVELOPER" | "MEMBER" | "VIEWER">("MEMBER");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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

  async function handleCreateStaff(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!partnerId) {
      setError("Partner context missing. Please login again.");
      return;
    }
    setError("");
    setFeedback("");
    try {
      await createPartnerStaff(partnerId, {
        firstName: staffFirstName.trim() || undefined,
        lastName: staffLastName.trim() || undefined,
        email: staffEmail.trim(),
        phoneNumber: staffPhoneNumber.trim() || undefined,
        password: staffPassword,
        role: staffRole,
      });
      setFeedback("Partner staff login created successfully.");
      setStaffEmail("");
      setStaffPhoneNumber("");
      setStaffFirstName("");
      setStaffLastName("");
      setStaffPassword("");
      setStaffRole("MEMBER");
      setIsCreateModalOpen(false);
      await loadPartnerStaff(partnerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create partner staff login");
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
              Add a partner dashboard staff account and assign role access.
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
                <th className={ipc.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {staffRows.length === 0 ? (
                <tr>
                  <td className={`${ipc.td} text-slate-600`} colSpan={5}>
                    No partner staff logins yet.
                  </td>
                </tr>
              ) : (
                staffRows.map((s) => {
                  const first = s.firstName || "";
                  const last = s.lastName || "";
                  return (
                    <tr key={s.id} className={ipc.tbodyRow}>
                      <td className={ipc.td}>{`${first} ${last}`.trim() || "—"}</td>
                      <td className={ipc.td}>{s.email || "—"}</td>
                      <td className={ipc.td}>—</td>
                      <td className={ipc.td}>{s.role || "VIEWER"}</td>
                      <td className={ipc.td}>{s.status || "ACTIVE"}</td>
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
            className={ipc.modalPanel}
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
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">Partner dashboard staff account</p>
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
            <form onSubmit={handleCreateStaff}>
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
                <input
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  placeholder="Temporary password"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  required
                  type="password"
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
                  disabled={!partnerId}
                  className={`${ipc.btnPrimary} w-full rounded-xl px-6 sm:w-auto disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  Create staff login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
