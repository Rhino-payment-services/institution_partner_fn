"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { listSaccoUsers } from "@/lib/api";
import { institutionStatusBadgeClass, ipc } from "@/lib/dashboard-ui";

type MemberItem = {
  id: string;
  accountNo?: string | null;
  clientId?: string | null;
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

export default function SaccoMembersPage() {
  const params = useParams<{ id: string }>();
  const saccoId = params?.id;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [institutionName, setInstitutionName] = useState("SACCO");
  const [members, setMembers] = useState<MemberItem[]>([]);

  useEffect(() => {
    if (!saccoId) return;
    void loadMembers(saccoId);
  }, [saccoId]);

  async function loadMembers(institutionId: string) {
    setLoading(true);
    setError("");
    try {
      const data = await listSaccoUsers(institutionId);
      setInstitutionName(data?.institution?.name || "SACCO");
      setMembers((data?.members || []) as MemberItem[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">{institutionName} members</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              View all users linked to this SACCO.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/dashboard/saccos/${saccoId}`} className={ipc.btnSecondary}>
              Back to SACCO
            </Link>
            <Link href="/dashboard/members" className={ipc.btnPrimary}>
              Add members
            </Link>
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">Members</h3>
          <p className="text-sm font-medium text-slate-700">Total: {members.length}</p>
        </div>
        <div className={ipc.tableWrap}>
          <table className={ipc.table}>
            <thead>
              <tr className={ipc.theadRow}>
                <th className={ipc.th}>Name</th>
                <th className={ipc.th}>Phone</th>
                <th className={ipc.th}>Email</th>
                <th className={ipc.th}>Account no</th>
                <th className={ipc.th}>Client ID</th>
                <th className={ipc.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {!loading && members.length === 0 && (
                <tr>
                  <td className={`${ipc.td} text-slate-600`} colSpan={6}>
                    No members found for this SACCO.
                  </td>
                </tr>
              )}
              {members.map((member) => {
                const firstName = member.user?.profile?.firstName || "";
                const lastName = member.user?.profile?.lastName || "";
                const fullName = `${firstName} ${lastName}`.trim() || "—";
                return (
                  <tr key={member.id} className={ipc.tbodyRow}>
                    <td className={`${ipc.td} font-medium`}>{fullName}</td>
                    <td className={ipc.td}>{member.user?.phone || "—"}</td>
                    <td className={ipc.td}>{member.user?.email || "—"}</td>
                    <td className={ipc.td}>{member.accountNo || "—"}</td>
                    <td className={ipc.td}>{member.clientId || "—"}</td>
                    <td className={ipc.td}>
                      <span className={institutionStatusBadgeClass(member.status)}>
                        {member.status || "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {loading && <p className="mt-4 text-sm font-medium text-slate-600">Loading members…</p>}
      </section>
    </>
  );
}
