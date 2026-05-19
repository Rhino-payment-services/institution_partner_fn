"use client";

import { CreateMemberModal } from "@/components/members/CreateMemberModal";
import { CreateStaffModal } from "@/components/members/CreateStaffModal";
import type { MemberFormErrors } from "@/components/members/member-form-types";
import {
    createSaccoStaff,
    createSaccoUser,
    downloadSaccoUsersTemplate,
    listPartnerSaccos,
    listSaccoStaff,
    resendSaccoStaffInvitation,
    updateSaccoWithdrawalSettings,
    uploadSaccoUsersExcel,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ipc } from "@/lib/dashboard-ui";
import { useCallback, useEffect, useMemo, useState } from "react";

type SaccoItem = {
  id: string;
  code?: string;
  name?: string;
  _count?: {
    members?: number;
  };
  metadata?: {
    withdrawals?: {
      enabled?: boolean;
      savings?: boolean;
      shares?: boolean;
      minimumAmount?: number;
      maximumAmount?: number;
    };
  };
};

type PreviewRow = {
  firstName: string;
  lastName: string;
  displayName?: string;
  phone: string;
  nationalId: string;
  email?: string;
  accountNo?: string;
  clientId?: string;
  status?: string;
};

type StaffItem = {
  id: string;
  status?: string;
  accountStatus?: string;
  role?: string;
  permissions?: {
    canViewTransactions?: boolean;
    canManageMembers?: boolean;
    canManageInstitution?: boolean;
    canRequestLiquidation?: boolean;
  } | null;
  user?: {
    email?: string | null;
    phone?: string | null;
    profile?: { firstName?: string | null; lastName?: string | null } | null;
  } | null;
};

type StaffFormErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
};

export default function MembersPage() {
  const { user } = useAuth();
  const isPartnerScope = user?.scope !== "INSTITUTION";
  const institutionId = user?.institution?.id ? String(user.institution.id) : "";
  const canManageMembers = isPartnerScope
    ? Boolean(user?.permissions?.canManageMembers || user?.permissions?.role === "OWNER")
    : Boolean(user?.permissions?.canManageMembers);
  const canManageInstitution = isPartnerScope
    ? Boolean(user?.permissions?.canManageInstitution || user?.permissions?.role === "OWNER")
    : Boolean(user?.permissions?.canManageInstitution);
  const [saccos, setSaccos] = useState<SaccoItem[]>([]);
  const [isCreateMemberModalOpen, setIsCreateMemberModalOpen] = useState(false);
  const [isCreateStaffModalOpen, setIsCreateStaffModalOpen] = useState(false);
  const [selectedSaccoId, setSelectedSaccoId] = useState("");
  const [saccoSearchQuery, setSaccoSearchQuery] = useState("");
  const [memberFirstName, setMemberFirstName] = useState("");
  const [memberLastName, setMemberLastName] = useState("");
  const [memberDisplayName, setMemberDisplayName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberFormErrors, setMemberFormErrors] = useState<MemberFormErrors>({});
  const [memberModalError, setMemberModalError] = useState("");
  const [staffModalError, setStaffModalError] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [memberNationalId, setMemberNationalId] = useState("");
  const [memberAccountNo, setMemberAccountNo] = useState("");
  const [memberClientId, setMemberClientId] = useState("");
  const [isCreatingMember, setIsCreatingMember] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [bulkRowErrors, setBulkRowErrors] = useState<string[]>([]);
  const [staffRows, setStaffRows] = useState<StaffItem[]>([]);
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffFirstName, setStaffFirstName] = useState("");
  const [staffLastName, setStaffLastName] = useState("");
  const [staffRole, setStaffRole] = useState<"OWNER" | "ADMIN" | "OPERATOR" | "VIEWER">("VIEWER");
  const [staffFormErrors, setStaffFormErrors] = useState<StaffFormErrors>({});
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);
  const [resendStaffId, setResendStaffId] = useState<string | null>(null);
  const [withdrawalsEnabled, setWithdrawalsEnabled] = useState(true);
  const [savingsWithdrawEnabled, setSavingsWithdrawEnabled] = useState(true);
  const [sharesWithdrawEnabled, setSharesWithdrawEnabled] = useState(true);
  const [minimumWithdrawAmount, setMinimumWithdrawAmount] = useState("");
  const [maximumWithdrawAmount, setMaximumWithdrawAmount] = useState("");
  const [isSavingWithdrawalSettings, setIsSavingWithdrawalSettings] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const selectedSacco = useMemo(
    () => saccos.find((item) => String(item.id) === selectedSaccoId) || null,
    [saccos, selectedSaccoId],
  );

  const filteredSaccos = useMemo(() => {
    const query = saccoSearchQuery.trim().toLowerCase();
    if (!query) return saccos;
    return saccos.filter((item) => {
      const code = String(item.code || "").toLowerCase();
      const name = String(item.name || "").toLowerCase();
      return code.includes(query) || name.includes(query);
    });
  }, [saccos, saccoSearchQuery]);

  const loadSaccos = useCallback(async () => {
    setError("");
    try {
      const data = (await listPartnerSaccos()) as SaccoItem[];
      const scopedData = isPartnerScope
        ? data
        : data.filter((item) => String(item.id) === institutionId);
      setSaccos(scopedData);
      if (!isPartnerScope && institutionId) {
        setSelectedSaccoId(institutionId);
      } else if (scopedData[0]?.id) {
        setSelectedSaccoId((prev) => prev || String(scopedData[0].id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load SACCOs");
    }
  }, [institutionId, isPartnerScope]);

  useEffect(() => {
    void loadSaccos();
  }, [loadSaccos]);

  useEffect(() => {
    if (!selectedSaccoId) {
      setStaffRows([]);
      return;
    }
    void loadSaccoStaff(selectedSaccoId);
  }, [selectedSaccoId]);

  useEffect(() => {
    const md = selectedSacco?.metadata;
    const withdrawals = md?.withdrawals;
    setWithdrawalsEnabled(withdrawals?.enabled !== false);
    setSavingsWithdrawEnabled(withdrawals?.savings !== false);
    setSharesWithdrawEnabled(withdrawals?.shares !== false);
    setMinimumWithdrawAmount(
      typeof withdrawals?.minimumAmount === "number" && Number.isFinite(withdrawals.minimumAmount)
        ? String(withdrawals.minimumAmount)
        : "",
    );
    setMaximumWithdrawAmount(
      typeof withdrawals?.maximumAmount === "number" && Number.isFinite(withdrawals.maximumAmount)
        ? String(withdrawals.maximumAmount)
        : "",
    );
  }, [selectedSacco]);

  async function loadSaccoStaff(institutionId: string) {
    try {
      const data = await listSaccoStaff(institutionId);
      setStaffRows((data?.members || []) as StaffItem[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load SACCO staff");
    }
  }

  async function handleCreateMember(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMemberModalError("");
    setError("");

    const nextErrors: MemberFormErrors = {};
    if (!selectedSaccoId) nextErrors.sacco = "Select a SACCO";
    const firstName = memberFirstName.trim();
    const lastName = memberLastName.trim();
    const displayName = memberDisplayName.trim();
    const normalizedPhone = memberPhone.trim();
    const phoneDigits = normalizedPhone.replace(/\D/g, "");
    const nationalId = memberNationalId.trim();
    const accountNoTrimmed = memberAccountNo.trim();

    if (!firstName) nextErrors.firstName = "First name is required";
    if (!lastName) nextErrors.lastName = "Last name is required";
    if (!normalizedPhone || phoneDigits.length < 9) {
      nextErrors.phone = "Enter a valid phone number";
    }
    if (!nationalId) nextErrors.nationalId = "National ID is required";
    if (!accountNoTrimmed) nextErrors.accountNo = "SACCO account number is required";

    if (Object.keys(nextErrors).length > 0) {
      setMemberFormErrors(nextErrors);
      return;
    }

    setMemberFormErrors({});
    setFeedback("");
    setIsCreatingMember(true);
    try {
      await createSaccoUser(selectedSaccoId, {
        firstName,
        lastName,
        displayName: displayName || undefined,
        phone: normalizedPhone,
        nationalId,
        email: memberEmail.trim() || undefined,
        accountNo: accountNoTrimmed,
        clientId: memberClientId.trim() || undefined,
      });
      setFeedback("SACCO user created successfully.");
      setMemberFirstName("");
      setMemberLastName("");
      setMemberDisplayName("");
      setMemberPhone("");
      setMemberNationalId("");
      setMemberEmail("");
      setMemberAccountNo("");
      setMemberClientId("");
      setMemberModalError("");
      setIsCreateMemberModalOpen(false);
      await loadSaccos();
    } catch (err) {
      const apiErr = err as Error & { code?: string; officialName?: string };
      if (apiErr.code === "PHONE_NAME_MISMATCH") {
        setMemberFormErrors({
          firstName: "Legal names do not match the phone account holder",
          lastName: "Legal names do not match the phone account holder",
        });
        setMemberModalError(
          apiErr.officialName
            ? `The legal names do not match the mobile money account holder (${apiErr.officialName}). Please verify and correct the names.`
            : apiErr.message,
        );
      } else {
        setMemberModalError(apiErr.message || "Failed to create SACCO user");
      }
    } finally {
      setIsCreatingMember(false);
    }
  }

  async function handleResendStaffInvitation(memberId: string) {
    if (!selectedSaccoId) return;
    setError("");
    setFeedback("");
    setResendStaffId(memberId);
    try {
      await resendSaccoStaffInvitation(selectedSaccoId, memberId);
      setFeedback("Invitation email sent successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend invitation");
    } finally {
      setResendStaffId(null);
    }
  }

  async function handleCreateStaff(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedSaccoId) {
      setError("Please select a SACCO first");
      return;
    }
    setError("");
    setFeedback("");
    const nextErrors: StaffFormErrors = {};
    const firstName = staffFirstName.trim();
    const lastName = staffLastName.trim();
    const email = staffEmail.trim();
    const phone = staffPhone.trim();

    if (!firstName) nextErrors.firstName = "First name is required";
    if (!lastName) nextErrors.lastName = "Last name is required";
    if (!email) {
      nextErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "Enter a valid email address";
    }
    if (!phone) {
      nextErrors.phone = "Phone is required";
    } else if (phone.replace(/\D/g, "").length < 9) {
      nextErrors.phone = "Enter a valid phone number";
    }

    if (Object.keys(nextErrors).length > 0) {
      setStaffFormErrors(nextErrors);
      setStaffModalError("Please fix the highlighted fields.");
      return;
    }
    setStaffFormErrors({});
    setStaffModalError("");
    setIsCreatingStaff(true);
    try {
      await createSaccoStaff(selectedSaccoId, {
        firstName,
        lastName,
        email,
        phone,
        role: staffRole,
      });
      setFeedback("Invitation email sent successfully.");
      setStaffEmail("");
      setStaffPhone("");
      setStaffFirstName("");
      setStaffLastName("");
      setStaffRole("VIEWER");
      setStaffFormErrors({});
      setStaffModalError("");
      setIsCreateStaffModalOpen(false);
      await loadSaccoStaff(selectedSaccoId);
    } catch (err) {
      setStaffModalError(err instanceof Error ? err.message : "Failed to create SACCO staff login");
    } finally {
      setIsCreatingStaff(false);
    }
  }

  async function handleSaveWithdrawalSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedSaccoId) {
      setError("Please select a SACCO first");
      return;
    }
    setError("");
    setFeedback("");
    setIsSavingWithdrawalSettings(true);
    try {
      const minAmount = minimumWithdrawAmount.trim() === "" ? undefined : Number(minimumWithdrawAmount);
      const maxAmount = maximumWithdrawAmount.trim() === "" ? undefined : Number(maximumWithdrawAmount);

      if (minAmount !== undefined && (!Number.isFinite(minAmount) || minAmount < 0)) {
        throw new Error("Minimum amount must be a valid number greater than or equal to 0");
      }
      if (maxAmount !== undefined && (!Number.isFinite(maxAmount) || maxAmount < 0)) {
        throw new Error("Maximum amount must be a valid number greater than or equal to 0");
      }
      if (minAmount !== undefined && maxAmount !== undefined && minAmount > maxAmount) {
        throw new Error("Minimum amount cannot be greater than maximum amount");
      }

      await updateSaccoWithdrawalSettings(selectedSaccoId, {
        enabled: withdrawalsEnabled,
        savings: savingsWithdrawEnabled,
        shares: sharesWithdrawEnabled,
        minimumAmount: minAmount,
        maximumAmount: maxAmount,
      });
      setFeedback("Withdrawal settings updated successfully.");
      await loadSaccos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update withdrawal settings");
    } finally {
      setIsSavingWithdrawalSettings(false);
    }
  }

  async function handleDownloadTemplate() {
    setError("");
    try {
      const blob = await downloadSaccoUsersTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "sacco-users-template.xlsx";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download template");
    }
  }

  async function handleBulkUpload() {
    if (!selectedSaccoId) {
      setError("Please select a SACCO first");
      return;
    }
    if (!bulkFile) {
      setError("Please choose an Excel file first");
      return;
    }
    setFeedback("");
    setError("");
    setBulkRowErrors([]);
    try {
      const result = await uploadSaccoUsersExcel(selectedSaccoId, bulkFile);
      setFeedback(
        `Bulk upload complete: ${result.successCount ?? 0} success, ${result.failCount ?? 0} failed.`,
      );
      const failures = Array.isArray(result?.results)
        ? (result.results as Array<Record<string, unknown>>)
            .filter((row) => row?.success !== true)
            .slice(0, 10)
            .map((row) => `Row ${String(row.index ?? "?")}: ${String(row.error || "Failed")}`)
        : [];
      setBulkRowErrors(failures);
      setBulkFile(null);
      setPreviewRows([]);
      setPreviewErrors([]);
      await loadSaccos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload users file");
    }
  }

  async function handleBulkFileChange(file: File | null) {
    setBulkFile(file);
    setPreviewRows([]);
    setPreviewErrors([]);
    setBulkRowErrors([]);
    if (!file) {
      return;
    }

    setIsParsingFile(true);
    setError("");
    setFeedback("");
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;

      if (!sheet) {
        setPreviewErrors(["No worksheet found in selected file."]);
        return;
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const parsedRows: PreviewRow[] = rows.map((row) => ({
        firstName: String(row.firstName ?? row.first_name ?? "").trim(),
        lastName: String(row.lastName ?? row.last_name ?? "").trim(),
        displayName: String(row.displayName ?? row.display_name ?? "").trim() || undefined,
        phone: String(row.phone ?? row.phoneNumber ?? row.phone_number ?? "").trim(),
        nationalId: String(
          row.nationalId ?? row.national_id ?? row.nin ?? row.ninNumber ?? row.nin_number ?? "",
        ).trim(),
        email: String(row.email ?? "").trim() || undefined,
        accountNo: String(row.accountNo ?? row.account_no ?? "").trim() || undefined,
        clientId: String(row.clientId ?? row.client_id ?? "").trim() || undefined,
        status: String(row.status ?? "ACTIVE").trim() || "ACTIVE",
      }));

      const validationErrors = parsedRows
        .map((row, index) => {
          const missingFields: string[] = [];
          if (!row.firstName) missingFields.push("firstName");
          if (!row.lastName) missingFields.push("lastName");
          if (!row.phone) missingFields.push("phone");
          if (!row.nationalId) missingFields.push("nationalId");
          if (!row.accountNo) missingFields.push("accountNo");
          return missingFields.length > 0
            ? `Row ${index + 2}: missing ${missingFields.join(", ")}`
            : null;
        })
        .filter((msg): msg is string => Boolean(msg))
        .slice(0, 20);

      setPreviewRows(parsedRows);
      setPreviewErrors(validationErrors);
    } catch {
      setPreviewErrors(["Failed to parse Excel file. Please use the template and try again."]);
    } finally {
      setIsParsingFile(false);
    }
  }

  return (
    <>
      {!canManageMembers ? (
        <section className={`${ipc.card} ${ipc.cardPad}`}>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Access denied</h2>
          <p className="mt-1 text-sm text-slate-600">
            Your role does not allow managing SACCO members.
          </p>
        </section>
      ) : (
        <>
      <div className={ipc.pageStack}>
      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Member management</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Manage SACCO customer members and SACCO staff login users.
            </p>
          </div>
          <button type="button" onClick={() => setIsCreateMemberModalOpen(true)} className={ipc.btnPrimary}>
            Create SACCO customer
          </button>
        </div>
      </section>

      {isPartnerScope ? (
        <section className={`${ipc.card} ${ipc.cardPad}`}>
          <label className="mb-2 block text-sm font-semibold text-slate-800">Select SACCO</label>
          <input
            type="text"
            value={saccoSearchQuery}
            onChange={(e) => setSaccoSearchQuery(e.target.value)}
            placeholder="Search by SACCO code or name..."
            className="mb-2 w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[var(--rukapay-primary)] focus:ring-2 focus:ring-[#08163d]/15"
          />
          <div className="max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white">
            {filteredSaccos.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-500">No SACCOs match your search.</p>
            ) : (
              <div className="max-h-72 overflow-auto">
                {filteredSaccos.map((item) => {
                  const isActive = String(item.id) === selectedSaccoId;
                  return (
                    <button
                      key={String(item.id)}
                      type="button"
                      onClick={() => setSelectedSaccoId(String(item.id))}
                      className={`flex w-full items-center justify-between px-4 py-3 text-left transition ${
                        isActive
                          ? "bg-[#08163d] text-white"
                          : "border-t border-slate-100 text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-sm font-medium">
                        {String(item.code || "—")} - {String(item.name || "—")}
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                          isActive ? "text-slate-200" : "text-slate-500"
                        }`}
                      >
                        Members: {Number(item?._count?.members || 0)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Showing {filteredSaccos.length} of {saccos.length} SACCOs.
          </p>
        </section>
      ) : (
        <section className={`${ipc.card} ${ipc.cardPad}`}>
          <h3 className="text-sm font-semibold text-slate-800">SACCO</h3>
          <p className="mt-1 text-sm text-slate-600">
            {selectedSacco
              ? `${String(selectedSacco.code || "")} - ${String(selectedSacco.name || "")}`
              : "Your account is scoped to one SACCO."}
          </p>
        </section>
      )}

      {canManageInstitution && (
        <section className={`${ipc.card} ${ipc.cardPad}`}>
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">Withdrawal controls</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Control whether SACCO withdrawals are available on USSD.
          </p>
          <form className="mt-4 space-y-3" onSubmit={handleSaveWithdrawalSettings}>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={withdrawalsEnabled}
                onChange={(e) => setWithdrawalsEnabled(e.target.checked)}
              />
              Enable withdrawals (master switch)
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={savingsWithdrawEnabled}
                onChange={(e) => setSavingsWithdrawEnabled(e.target.checked)}
                disabled={!withdrawalsEnabled}
              />
              Allow savings withdrawal
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={sharesWithdrawEnabled}
                onChange={(e) => setSharesWithdrawEnabled(e.target.checked)}
                disabled={!withdrawalsEnabled}
              />
              Allow shares withdrawal
            </label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Minimum withdrawal amount (UGX)
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={minimumWithdrawAmount}
                  onChange={(e) => setMinimumWithdrawAmount(e.target.value)}
                  disabled={!withdrawalsEnabled}
                  placeholder="e.g. 5000"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[var(--rukapay-primary)] focus:ring-2 focus:ring-[#08163d]/15 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </label>
              <label className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Maximum withdrawal amount (UGX)
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={maximumWithdrawAmount}
                  onChange={(e) => setMaximumWithdrawAmount(e.target.value)}
                  disabled={!withdrawalsEnabled}
                  placeholder="e.g. 2000000"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[var(--rukapay-primary)] focus:ring-2 focus:ring-[#08163d]/15 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={!selectedSaccoId || isSavingWithdrawalSettings}
              className={ipc.btnPrimary}
            >
              {isSavingWithdrawalSettings ? "Saving..." : "Save withdrawal settings"}
            </button>
          </form>
        </section>
      )}

      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">SACCO staff login users</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Create dashboard staff accounts (OWNER/ADMIN/OPERATOR/VIEWER) for this SACCO.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateStaffModalOpen(true)}
            disabled={!selectedSaccoId}
            className={`${ipc.btnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            Create staff login
          </button>
        </div>

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
                    No SACCO staff logins yet.
                  </td>
                </tr>
              ) : (
                staffRows.map((s) => {
                  const first = s.user?.profile?.firstName || "";
                  const last = s.user?.profile?.lastName || "";
                  const badge =
                    s.accountStatus === "PENDING_INVITATION" || String(s.status) === "PENDING_INVITATION"
                      ? "Pending Invitation"
                      : "Active";
                  const badgeClass =
                    badge === "Active"
                      ? "bg-emerald-50 text-emerald-800 ring-emerald-600/20"
                      : "bg-amber-50 text-amber-900 ring-amber-600/20";
                  const showResend =
                    canManageMembers &&
                    (s.accountStatus === "PENDING_INVITATION" || String(s.status) === "PENDING_INVITATION");
                  return (
                    <tr key={s.id} className={ipc.tbodyRow}>
                      <td className={ipc.td}>{`${first} ${last}`.trim() || "—"}</td>
                      <td className={ipc.td}>{s.user?.email || "—"}</td>
                      <td className={ipc.td}>{s.user?.phone || "—"}</td>
                      <td className={ipc.td}>{s.role || "VIEWER"}</td>
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
                            onClick={() => void handleResendStaffInvitation(s.id)}
                            disabled={resendStaffId === s.id}
                            className="text-sm font-medium text-[var(--rukapay-primary)] hover:underline disabled:opacity-50"
                          >
                            {resendStaffId === s.id ? "Sending…" : "Resend invitation"}
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

      {(error || feedback || previewErrors.length > 0 || bulkRowErrors.length > 0) && (
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
          {bulkRowErrors.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {bulkRowErrors.map((msg) => (
                <p key={msg}>{msg}</p>
              ))}
            </div>
          )}
          {previewErrors.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {previewErrors.map((msg) => (
                <p key={msg}>{msg}</p>
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <article className={`${ipc.card} ${ipc.cardPad}`}>
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">Bulk register SACCO customers by Excel</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Required columns: firstName, lastName, phone, nationalId (or nin), accountNo.
            Optional: displayName, email, clientId, status.
          </p>
          <div className="mt-4 space-y-3">
            <button type="button" onClick={handleDownloadTemplate} className={ipc.btnSecondary}>
              Download Excel template
            </button>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => void handleBulkFileChange(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-700"
            />
            {isParsingFile && <p className="text-xs text-slate-500">Reading Excel file...</p>}
            <button
              type="button"
              onClick={handleBulkUpload}
              disabled={!selectedSaccoId || !bulkFile || previewRows.length === 0 || previewErrors.length > 0}
              className={`${ipc.btnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Confirm and register
            </button>

            {bulkFile && !isParsingFile && (
              <p className="text-xs text-slate-500">
                Preview loaded: {previewRows.length} row(s).
              </p>
            )}

            {previewRows.length > 0 && (
              <div className={`mt-3 ${ipc.tableWrap}`}>
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">Excel preview</p>
                  <p className="text-xs text-slate-600">
                    Showing first {Math.min(previewRows.length, 20)} row(s) before registration.
                  </p>
                </div>
                <div className="max-h-72 overflow-auto">
                  <table className={ipc.table}>
                    <thead>
                      <tr className={ipc.theadRow}>
                        <th className={ipc.th}>#</th>
                        <th className={ipc.th}>First name</th>
                        <th className={ipc.th}>Last name</th>
                        <th className={ipc.th}>Phone</th>
                        <th className={ipc.th}>National ID</th>
                        <th className={ipc.th}>Email</th>
                        <th className={ipc.th}>Account no</th>
                        <th className={ipc.th}>Client ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.slice(0, 20).map((row, index) => (
                        <tr
                          key={`${row.firstName}-${row.lastName}-${row.phone}-${index}`}
                          className={ipc.tbodyRow}
                        >
                          <td className={ipc.tdNum}>{index + 1}</td>
                          <td className={ipc.td}>{row.firstName || "—"}</td>
                          <td className={ipc.td}>{row.lastName || "—"}</td>
                          <td className={ipc.td}>{row.phone || "—"}</td>
                          <td className={ipc.td}>{row.nationalId || "—"}</td>
                          <td className={ipc.td}>{row.email || "—"}</td>
                          <td className={ipc.td}>{row.accountNo || "—"}</td>
                          <td className={ipc.td}>{row.clientId || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </article>
      </section>
      </div>

      <CreateMemberModal
        open={isCreateMemberModalOpen}
        isPartnerScope={isPartnerScope}
        saccos={saccos}
        selectedSaccoId={selectedSaccoId}
        selectedSaccoName={selectedSacco ? String(selectedSacco.name) : ""}
        isSubmitting={isCreatingMember}
        modalError={memberModalError}
        formErrors={memberFormErrors}
        memberFirstName={memberFirstName}
        memberLastName={memberLastName}
        memberDisplayName={memberDisplayName}
        memberPhone={memberPhone}
        memberNationalId={memberNationalId}
        memberAccountNo={memberAccountNo}
        memberEmail={memberEmail}
        memberClientId={memberClientId}
        onClose={() => setIsCreateMemberModalOpen(false)}
        onSubmit={handleCreateMember}
        onSaccoChange={(id) => {
          setSelectedSaccoId(id);
          setMemberFormErrors((prev) => ({ ...prev, sacco: undefined }));
        }}
        onFirstNameChange={(v) => {
          setMemberFirstName(v);
          setMemberFormErrors((prev) => ({ ...prev, firstName: undefined }));
        }}
        onLastNameChange={(v) => {
          setMemberLastName(v);
          setMemberFormErrors((prev) => ({ ...prev, lastName: undefined }));
        }}
        onDisplayNameChange={setMemberDisplayName}
        onPhoneChange={(v) => {
          setMemberPhone(v);
          setMemberFormErrors((prev) => ({ ...prev, phone: undefined }));
        }}
        onNationalIdChange={(v) => {
          setMemberNationalId(v);
          setMemberFormErrors((prev) => ({ ...prev, nationalId: undefined }));
        }}
        onAccountNoChange={(v) => {
          setMemberAccountNo(v);
          setMemberFormErrors((prev) => ({ ...prev, accountNo: undefined }));
        }}
        onEmailChange={setMemberEmail}
        onClientIdChange={setMemberClientId}
      />

      <CreateStaffModal
        open={isCreateStaffModalOpen}
        selectedSaccoName={selectedSacco ? String(selectedSacco.name) : ""}
        selectedSaccoId={selectedSaccoId}
        isSubmitting={isCreatingStaff}
        modalError={staffModalError}
        formErrors={staffFormErrors}
        staffFirstName={staffFirstName}
        staffLastName={staffLastName}
        staffEmail={staffEmail}
        staffPhone={staffPhone}
        staffRole={staffRole}
        onClose={() => setIsCreateStaffModalOpen(false)}
        onSubmit={handleCreateStaff}
        onFirstNameChange={(v) => {
          setStaffFirstName(v);
          setStaffFormErrors((prev) => ({ ...prev, firstName: undefined }));
        }}
        onLastNameChange={(v) => {
          setStaffLastName(v);
          setStaffFormErrors((prev) => ({ ...prev, lastName: undefined }));
        }}
        onEmailChange={(v) => {
          setStaffEmail(v);
          setStaffFormErrors((prev) => ({ ...prev, email: undefined }));
        }}
        onPhoneChange={(v) => {
          setStaffPhone(v);
          setStaffFormErrors((prev) => ({ ...prev, phone: undefined }));
        }}
        onRoleChange={setStaffRole}
      />

        </>
      )}
    </>
  );
}
