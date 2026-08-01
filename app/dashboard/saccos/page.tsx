"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createPartnerSacco, listPartnerSaccos } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ipc } from "@/lib/dashboard-ui";

type SaccoItem = {
  id: string;
  code?: string;
  name?: string;
  licenseNumber?: string | null;
  totalCollectedBalance?: number;
  balanceCurrency?: string;
  _count?: {
    members?: number;
  };
};

export default function SaccosPage() {
  const { user } = useAuth();
  const authRole = String(user?.permissions?.role || "").toUpperCase();
  const canCreateSacco = Boolean(
    user?.scope !== "INSTITUTION" &&
      (user?.permissions?.canManageMembers ||
        user?.permissions?.canManageInstitution ||
        authRole === "OWNER" ||
        authRole === "ADMIN"),
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  /** When inviting initial staff, step 1 = SACCO details; step 2 = staff contact & role. */
  const [createModalStep, setCreateModalStep] = useState<1 | 2>(1);
  const [saccoCode, setSaccoCode] = useState("");
  const [saccoName, setSaccoName] = useState("");
  const [externalOrgId, setExternalOrgId] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [createInitialStaff, setCreateInitialStaff] = useState(false);
  const [initialStaffFirstName, setInitialStaffFirstName] = useState("");
  const [initialStaffLastName, setInitialStaffLastName] = useState("");
  const [initialStaffEmail, setInitialStaffEmail] = useState("");
  const [initialStaffPhone, setInitialStaffPhone] = useState("");
  const [initialStaffRole, setInitialStaffRole] = useState<"OWNER" | "ADMIN" | "OPERATOR" | "VIEWER">(
    "OWNER",
  );
  const [saccos, setSaccos] = useState<SaccoItem[]>([]);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    void loadSaccos();
  }, []);

  async function loadSaccos() {
    setError("");
    try {
      const data = (await listPartnerSaccos()) as SaccoItem[];
      setSaccos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load SACCOs");
    }
  }

  async function handleCreateSacco(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (createInitialStaff && createModalStep !== 2) {
      return;
    }
    if (!canCreateSacco) {
      setError("Your role does not allow creating SACCOs.");
      return;
    }
    setFeedback("");
    setError("");
    const trimmedExternalOrgId = externalOrgId.trim();
    if (!trimmedExternalOrgId) {
      setError("External Org ID is required.");
      return;
    }
    try {
      await createPartnerSacco({
        code: saccoCode.trim().toUpperCase(),
        name: saccoName.trim(),
        externalOrgId: trimmedExternalOrgId,
        ...(licenseNumber.trim()
          ? { licenseNumber: licenseNumber.trim().toUpperCase() }
          : {}),
        ...(createInitialStaff
          ? {
              createInitialStaffLogin: true,
              initialStaffFirstName: initialStaffFirstName.trim() || undefined,
              initialStaffLastName: initialStaffLastName.trim() || undefined,
              initialStaffEmail: initialStaffEmail.trim() || undefined,
              initialStaffPhone: initialStaffPhone.trim() || undefined,
              initialStaffRole,
            }
          : {}),
      });
      setFeedback(
        "SACCO created successfully. If you added initial dashboard staff, they receive an email with a link to set their own password.",
      );
      setSaccoCode("");
      setSaccoName("");
      setExternalOrgId("");
      setLicenseNumber("");
      setCreateInitialStaff(false);
      setInitialStaffFirstName("");
      setInitialStaffLastName("");
      setInitialStaffEmail("");
      setInitialStaffPhone("");
      setInitialStaffRole("OWNER");
      setCreateModalStep(1);
      setIsCreateModalOpen(false);
      await loadSaccos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create SACCO");
    }
  }

  function closeCreateModal() {
    setIsCreateModalOpen(false);
    setCreateModalStep(1);
    setError("");
  }

  function validateCreateModalStep1(): boolean {
    setError("");
    if (!saccoCode.trim()) {
      setError("SACCO code is required.");
      return false;
    }
    if (!saccoName.trim()) {
      setError("SACCO name is required.");
      return false;
    }
    if (!externalOrgId.trim()) {
      setError("External Org ID is required.");
      return false;
    }
    return true;
  }

  function goToStaffStep() {
    if (!validateCreateModalStep1()) return;
    setCreateModalStep(2);
  }

  function formatMoney(value: number | undefined, currency?: string) {
    const amount = Number(value || 0);
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    const ccy = currency || "UGX";
    return `${ccy} ${safeAmount.toLocaleString()}`;
  }

  return (
    <div className={ipc.pageStack}>
      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">SACCO management</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Create and manage SACCO institutions here.
            </p>
          </div>
          <button
            type="button"
            disabled={!canCreateSacco}
            onClick={() => {
              setError("");
              setFeedback("");
              setCreateModalStep(1);
              setIsCreateModalOpen(true);
            }}
            className={`${ipc.btnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            Create SACCO
          </button>
        </div>
      </section>

      {(error || feedback) && (
        <section className="space-y-2">
          {error && !isCreateModalOpen && (
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

      <section>
        <article className={`${ipc.card} ${ipc.cardPad}`}>
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">Existing SACCOs</h3>
          <div className={`mt-4 ${ipc.tableWrap}`}>
            <table className={ipc.table}>
              <thead>
                <tr className={ipc.theadRow}>
                  <th className={ipc.th}>Code</th>
                  <th className={ipc.th}>Name</th>
                  <th className={ipc.th}>License</th>
                  <th className={ipc.th}>Collected balance</th>
                  <th className={ipc.th}>Members</th>
                  <th className={`${ipc.th} text-right`}>Open</th>
                </tr>
              </thead>
              <tbody>
                {saccos.map((item) => (
                  <tr key={String(item.id)} className={ipc.tbodyRow}>
                    <td className={`${ipc.td} font-medium`}>{String(item.code || "—")}</td>
                    <td className={ipc.td}>{String(item.name || "—")}</td>
                    <td className={ipc.td}>{item.licenseNumber ? String(item.licenseNumber) : "—"}</td>
                    <td className={ipc.tdNum}>{formatMoney(item.totalCollectedBalance, item.balanceCurrency)}</td>
                    <td className={ipc.tdNum}>{Number(item?._count?.members || 0)}</td>
                    <td className={`${ipc.td} text-right`}>
                      <Link href={`/dashboard/saccos/${String(item.id)}`} className={ipc.link}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {isCreateModalOpen && (
        <div
          className={ipc.modalOverlay}
          role="presentation"
          onClick={closeCreateModal}
        >
          <div
            className={ipc.modalPanelLg}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-sacco-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={ipc.modalHeader}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {createInitialStaff ? `Step ${createModalStep} of 2` : "Step 1 of 1"}
                  </p>
                  <h3 id="create-sacco-title" className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
                    Create SACCO
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {createModalStep === 1
                      ? "Register a new savings and credit co-operative linked to your partner account. Required fields are on this step."
                      : "Enter the first dashboard staff member. They will receive an email with a one-time link to set their password."}
                  </p>
                </div>
                <button type="button" onClick={closeCreateModal} className={ipc.modalClose}>
                  Close
                </button>
              </div>
            </div>
            <form onSubmit={handleCreateSacco} className="flex min-h-0 flex-1 flex-col">
              <div className={`${ipc.modalBody} space-y-5`}>
                {error ? (
                  <p className={ipc.formAlert} role="alert">
                    {error}
                  </p>
                ) : null}
                {createModalStep === 1 && (
                  <>
                    <div>
                      <label htmlFor="sacco-code" className={ipc.formLabel}>
                        SACCO code
                      </label>
                      <input
                        id="sacco-code"
                        value={saccoCode}
                        onChange={(e) => setSaccoCode(e.target.value)}
                        placeholder="e.g. NAMASUBA"
                        autoComplete="off"
                        className={`${ipc.input} mt-2`}
                        required
                      />
                      <p className="mt-1.5 text-xs text-slate-500">Unique code, stored in uppercase.</p>
                    </div>
                    <div>
                      <label htmlFor="sacco-name" className={ipc.formLabel}>
                        SACCO name
                      </label>
                      <input
                        id="sacco-name"
                        value={saccoName}
                        onChange={(e) => setSaccoName(e.target.value)}
                        placeholder="Institution display name"
                        autoComplete="organization"
                        className={`${ipc.input} mt-2`}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="external-org" className={ipc.formLabel}>
                        External org ID
                      </label>
                      <input
                        id="external-org"
                        value={externalOrgId}
                        onChange={(e) => setExternalOrgId(e.target.value)}
                        placeholder="Link to your core banking or ERP reference"
                        className={`${ipc.input} mt-2`}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="license-number" className={ipc.formLabel}>
                        License number <span className="font-normal text-slate-500">(optional)</span>
                      </label>
                      <input
                        id="license-number"
                        value={licenseNumber}
                        onChange={(e) =>
                          setLicenseNumber(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())
                        }
                        placeholder="e.g. BL2024001 (letters and numbers only)"
                        autoComplete="off"
                        maxLength={64}
                        className={`${ipc.input} mt-2`}
                      />
                      <p className="mt-1.5 text-xs text-slate-500">
                        Alphanumeric only; stored in uppercase. Leave blank if not applicable.
                      </p>
                    </div>
                    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-snug text-slate-700">
                      <input
                        type="checkbox"
                        className="mt-0.5 shrink-0"
                        checked={createInitialStaff}
                        onChange={(e) => {
                          setCreateInitialStaff(e.target.checked);
                          setCreateModalStep(1);
                        }}
                      />
                      <span>
                        Create initial SACCO staff login. When enabled, they receive an email with a link to choose
                        their password. Continue on the next step before creating the SACCO.
                      </span>
                    </label>
                  </>
                )}
                {createModalStep === 2 && createInitialStaff && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label htmlFor="staff-first" className={ipc.formLabel}>
                          Staff first name
                        </label>
                        <input
                          id="staff-first"
                          value={initialStaffFirstName}
                          onChange={(e) => setInitialStaffFirstName(e.target.value)}
                          placeholder="First name"
                          autoComplete="given-name"
                          className={`${ipc.input} mt-2`}
                        />
                      </div>
                      <div>
                        <label htmlFor="staff-last" className={ipc.formLabel}>
                          Staff last name
                        </label>
                        <input
                          id="staff-last"
                          value={initialStaffLastName}
                          onChange={(e) => setInitialStaffLastName(e.target.value)}
                          placeholder="Last name"
                          autoComplete="family-name"
                          className={`${ipc.input} mt-2`}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label htmlFor="staff-email" className={ipc.formLabel}>
                          Staff email
                        </label>
                        <input
                          id="staff-email"
                          value={initialStaffEmail}
                          onChange={(e) => setInitialStaffEmail(e.target.value)}
                          placeholder="staff@sacco.com"
                          className={`${ipc.input} mt-2`}
                          type="email"
                          autoComplete="email"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="staff-phone" className={ipc.formLabel}>
                          Staff phone
                        </label>
                        <input
                          id="staff-phone"
                          value={initialStaffPhone}
                          onChange={(e) => setInitialStaffPhone(e.target.value)}
                          placeholder="+2567..."
                          className={`${ipc.input} mt-2`}
                          autoComplete="tel"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="staff-role" className={ipc.formLabel}>
                        Dashboard role
                      </label>
                      <select
                        id="staff-role"
                        value={initialStaffRole}
                        onChange={(e) =>
                          setInitialStaffRole(
                            e.target.value as "OWNER" | "ADMIN" | "OPERATOR" | "VIEWER",
                          )
                        }
                        className={`${ipc.input} mt-2`}
                      >
                        <option value="OWNER">OWNER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="OPERATOR">OPERATOR</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
              <div className={ipc.modalFooter}>
                {createModalStep === 2 && createInitialStaff ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setCreateModalStep(1);
                      }}
                      className={`${ipc.btnSecondary} w-full rounded-xl sm:w-auto`}
                    >
                      Back
                    </button>
                    <button type="submit" className={`${ipc.btnPrimary} w-full rounded-xl px-6 sm:w-auto`}>
                      Create SACCO
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={closeCreateModal}
                      className={`${ipc.btnSecondary} w-full rounded-xl sm:w-auto`}
                    >
                      Cancel
                    </button>
                    {createInitialStaff ? (
                      <button
                        type="button"
                        onClick={goToStaffStep}
                        className={`${ipc.btnPrimary} w-full rounded-xl px-6 sm:w-auto`}
                      >
                        Continue
                      </button>
                    ) : (
                      <button type="submit" className={`${ipc.btnPrimary} w-full rounded-xl px-6 sm:w-auto`}>
                        Create SACCO
                      </button>
                    )}
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
