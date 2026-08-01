"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createSaccoStaff,
  createSaccoUser,
  createSaccoUsersBulkSequential,
  deleteSaccoUser,
  downloadSaccoUsersTemplate,
  listPartnerSaccos,
  listSaccoStaff,
  listSaccoUsers,
  resendSaccoStaffInvitation,
  updateSaccoStaff,
  updateSaccoUser,
  updateSaccoWithdrawalSettings,
  validateSaccoMemberPhone,
} from "@/lib/api";
import { CreateMemberModal } from "@/components/members/CreateMemberModal";
import { CreateStaffModal } from "@/components/members/CreateStaffModal";
import { EditMemberModal, type SaccoCustomerMember } from "@/components/members/EditMemberModal";
import type { MemberFormErrors } from "@/components/members/member-form-types";
import {
  isNationalIdNotApplicableValue,
  parseTruthyExcelFlag,
  validateMemberNationalId,
} from "@/lib/member-validation";
import { useAuth } from "@/lib/auth-context";
import { ipc } from "@/lib/dashboard-ui";

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

type BulkVerifyStatus = "pending" | "ok" | "mismatch" | "error" | "registered";

type PreviewRow = {
  firstName: string;
  lastName: string;
  displayName?: string;
  phone: string;
  nationalId: string;
  nationalIdNotApplicable?: boolean;
  email?: string;
  accountNo?: string;
  clientId?: string;
  status?: string;
  verifyStatus?: BulkVerifyStatus;
  officialName?: string;
  verifyError?: string;
  approvedMismatch?: boolean;
  registerError?: string;
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
  const authRole = String(user?.permissions?.role || "").toUpperCase();
  const canManageMembers = isPartnerScope
    ? Boolean(
        user?.permissions?.canManageMembers ||
          authRole === "OWNER" ||
          authRole === "ADMIN",
      )
    : Boolean(user?.permissions?.canManageMembers);
  const canManageInstitution = isPartnerScope
    ? Boolean(
        user?.permissions?.canManageInstitution ||
          authRole === "OWNER" ||
          authRole === "ADMIN",
      )
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
  const [memberPhoneMismatchOfficial, setMemberPhoneMismatchOfficial] = useState<string | null>(
    null,
  );
  const [acknowledgePhoneNameMismatch, setAcknowledgePhoneNameMismatch] = useState(false);
  const [memberModalError, setMemberModalError] = useState("");
  const [staffModalError, setStaffModalError] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [memberNationalId, setMemberNationalId] = useState("");
  const [memberNationalIdNotApplicable, setMemberNationalIdNotApplicable] = useState(false);
  const [memberAccountNo, setMemberAccountNo] = useState("");
  const [memberClientId, setMemberClientId] = useState("");
  const [isCreatingMember, setIsCreatingMember] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [bulkRowErrors, setBulkRowErrors] = useState<string[]>([]);
  const [isBulkVerifying, setIsBulkVerifying] = useState(false);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [customerRows, setCustomerRows] = useState<SaccoCustomerMember[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [editingMember, setEditingMember] = useState<SaccoCustomerMember | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAccountNo, setEditAccountNo] = useState("");
  const [editClientId, setEditClientId] = useState("");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editModalError, setEditModalError] = useState("");
  const [isSavingMemberEdit, setIsSavingMemberEdit] = useState(false);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [updatingStaffRoleId, setUpdatingStaffRoleId] = useState<string | null>(null);
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
  const [withdrawalControlsOpen, setWithdrawalControlsOpen] = useState(false);
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

  const filteredCustomerRows = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customerRows;
    return customerRows.filter((row) => {
      const first = row.user?.profile?.firstName || "";
      const last = row.user?.profile?.lastName || "";
      const haystack = [
        first,
        last,
        row.displayName,
        row.user?.phone,
        row.user?.email,
        row.accountNo,
        row.clientId,
        row.user?.profile?.nationalId,
      ]
        .map((v) => String(v || "").toLowerCase())
        .join(" ");
      return haystack.includes(q);
    });
  }, [customerRows, customerSearch]);

  const bulkSummary = useMemo(() => {
    let pending = 0;
    let ok = 0;
    let mismatch = 0;
    let mismatchApproved = 0;
    let error = 0;
    let registered = 0;
    for (const row of previewRows) {
      const status = row.verifyStatus ?? "pending";
      if (status === "pending") pending += 1;
      else if (status === "ok") ok += 1;
      else if (status === "mismatch") {
        mismatch += 1;
        if (row.approvedMismatch) mismatchApproved += 1;
      } else if (status === "error") error += 1;
      else if (status === "registered") registered += 1;
    }
    const readyToRegister =
      ok + mismatchApproved;
    return {
      pending,
      ok,
      mismatch,
      mismatchApproved,
      error,
      registered,
      readyToRegister,
    };
  }, [previewRows]);

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
      setCustomerRows([]);
      return;
    }
    void loadSaccoStaff(selectedSaccoId);
    void loadSaccoCustomers(selectedSaccoId);
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

  async function loadSaccoCustomers(institutionId: string) {
    setIsLoadingCustomers(true);
    try {
      const data = await listSaccoUsers(institutionId);
      setCustomerRows((data?.members || []) as SaccoCustomerMember[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load SACCO customers");
    } finally {
      setIsLoadingCustomers(false);
    }
  }

  function exportCustomersCsv() {
    const rows = filteredCustomerRows;
    if (rows.length === 0) return;
    const header = [
      "firstName",
      "lastName",
      "displayName",
      "phone",
      "email",
      "nationalId",
      "accountNo",
      "clientId",
      "status",
    ];
    const lines = rows.map((row) => {
      const values = [
        row.user?.profile?.firstName || "",
        row.user?.profile?.lastName || "",
        row.displayName || "",
        row.user?.phone || "",
        row.user?.email || "",
        row.user?.profile?.nationalId || "N/A",
        row.accountNo || "",
        row.clientId || "",
        row.status || "",
      ];
      return values.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sacco-customers-${selectedSaccoId}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  function openEditMember(member: SaccoCustomerMember) {
    setEditingMember(member);
    setEditDisplayName(member.displayName || "");
    setEditEmail(member.user?.email || "");
    setEditAccountNo(member.accountNo || "");
    setEditClientId(member.clientId || "");
    setEditStatus(member.status || "ACTIVE");
    setEditModalError("");
  }

  async function handleSaveMemberEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedSaccoId || !editingMember) return;
    setEditModalError("");
    setIsSavingMemberEdit(true);
    try {
      await updateSaccoUser(selectedSaccoId, editingMember.id, {
        displayName: editDisplayName.trim() || undefined,
        email: editEmail.trim() || undefined,
        accountNo: editAccountNo.trim() || undefined,
        clientId: editClientId.trim() || undefined,
        status: editStatus,
      });
      setFeedback("Member updated successfully.");
      setEditingMember(null);
      await loadSaccoCustomers(selectedSaccoId);
      await loadSaccos();
    } catch (err) {
      setEditModalError(err instanceof Error ? err.message : "Failed to update member");
    } finally {
      setIsSavingMemberEdit(false);
    }
  }

  async function handleDeleteMember(memberId: string) {
    if (!selectedSaccoId) return;
    if (!window.confirm("Remove this member from the SACCO? This cannot be undone.")) return;
    setError("");
    setFeedback("");
    setDeletingMemberId(memberId);
    try {
      await deleteSaccoUser(selectedSaccoId, memberId);
      setFeedback("Member removed successfully.");
      await loadSaccoCustomers(selectedSaccoId);
      await loadSaccos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete member");
    } finally {
      setDeletingMemberId(null);
    }
  }

  async function handleStaffRoleChange(
    memberId: string,
    role: "OWNER" | "ADMIN" | "OPERATOR" | "VIEWER",
  ) {
    if (!selectedSaccoId) return;
    setUpdatingStaffRoleId(memberId);
    setError("");
    try {
      await updateSaccoStaff(selectedSaccoId, memberId, { role });
      setFeedback("Staff role updated.");
      await loadSaccoStaff(selectedSaccoId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update staff role");
    } finally {
      setUpdatingStaffRoleId(null);
    }
  }

  async function handleStaffAccountStatusChange(
    memberId: string,
    accountStatus: "ACTIVE" | "INACTIVE",
  ) {
    if (!selectedSaccoId) return;
    setUpdatingStaffRoleId(memberId);
    setError("");
    setFeedback("");
    try {
      await updateSaccoStaff(selectedSaccoId, memberId, { accountStatus });
      setFeedback(
        accountStatus === "INACTIVE"
          ? "Staff set to inactive (cannot log in)."
          : "Staff account activated.",
      );
      await loadSaccoStaff(selectedSaccoId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update staff status");
    } finally {
      setUpdatingStaffRoleId(null);
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
    const ninNotApplicable =
      memberNationalIdNotApplicable || isNationalIdNotApplicableValue(nationalId);

    if (!firstName) nextErrors.firstName = "First name is required";
    if (!lastName) nextErrors.lastName = "Last name is required";
    if (!normalizedPhone || phoneDigits.length < 9) {
      nextErrors.phone = "Enter a valid phone number";
    }
    const ninError = validateMemberNationalId(nationalId, ninNotApplicable);
    if (ninError) nextErrors.nationalId = ninError;
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
        nationalId: ninNotApplicable ? undefined : nationalId.toUpperCase(),
        nationalIdNotApplicable: ninNotApplicable || undefined,
        email: memberEmail.trim() || undefined,
        accountNo: accountNoTrimmed,
        clientId: memberClientId.trim() || undefined,
        acknowledgePhoneNameMismatch: acknowledgePhoneNameMismatch || undefined,
      });
      setFeedback("SACCO user created successfully.");
      setMemberFirstName("");
      setMemberLastName("");
      setMemberDisplayName("");
      setMemberPhone("");
      setMemberNationalId("");
      setMemberNationalIdNotApplicable(false);
      setMemberEmail("");
      setMemberAccountNo("");
      setMemberClientId("");
      setMemberPhoneMismatchOfficial(null);
      setAcknowledgePhoneNameMismatch(false);
      setMemberModalError("");
      setIsCreateMemberModalOpen(false);
      await loadSaccos();
      await loadSaccoCustomers(selectedSaccoId);
    } catch (err) {
      const apiErr = err as Error & { code?: string; officialName?: string };
      if (apiErr.code === "PHONE_NAME_MISMATCH") {
        setMemberPhoneMismatchOfficial(apiErr.officialName || null);
        setMemberFormErrors({
          firstName: "Legal names do not match the phone account holder",
          lastName: "Legal names do not match the phone account holder",
          form: apiErr.message,
        });
        setMemberModalError(
          apiErr.officialName
            ? `Mobile money account name: ${apiErr.officialName}. Confirm the legal names are correct, or check the box below to proceed after manual verification.`
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

  async function handleBulkVerify() {
    if (!selectedSaccoId) {
      setError("Please select a SACCO first");
      return;
    }
    if (previewRows.length === 0) {
      setError("Please choose an Excel file with valid rows first");
      return;
    }
    if (previewErrors.length > 0) {
      setError("Fix Excel validation errors before verifying phones");
      return;
    }

    setFeedback("");
    setError("");
    setBulkRowErrors([]);
    setIsBulkVerifying(true);

    const nextRows = [...previewRows];
    try {
      for (let i = 0; i < nextRows.length; i += 1) {
        const row = nextRows[i];
        if (row.verifyStatus === "registered") continue;

        try {
          const result = await validateSaccoMemberPhone(selectedSaccoId, {
            firstName: row.firstName,
            lastName: row.lastName,
            phone: row.phone,
          });
          if (result.status === "OK") {
            nextRows[i] = {
              ...row,
              verifyStatus: "ok",
              officialName: result.officialName,
              verifyError: undefined,
              approvedMismatch: false,
              registerError: undefined,
            };
          } else if (result.status === "MISMATCH") {
            nextRows[i] = {
              ...row,
              verifyStatus: "mismatch",
              officialName: result.officialName,
              verifyError: result.error,
              approvedMismatch: false,
              registerError: undefined,
            };
          } else {
            nextRows[i] = {
              ...row,
              verifyStatus: "error",
              officialName: result.officialName,
              verifyError: result.error || "Phone validation failed",
              approvedMismatch: false,
              registerError: undefined,
            };
          }
        } catch (err) {
          nextRows[i] = {
            ...row,
            verifyStatus: "error",
            verifyError: err instanceof Error ? err.message : "Phone validation failed",
            approvedMismatch: false,
            registerError: undefined,
          };
        }
      }

      setPreviewRows(nextRows);
      const summary = nextRows.reduce(
        (acc, row) => {
          const status = row.verifyStatus ?? "pending";
          if (status === "ok") acc.ok += 1;
          else if (status === "mismatch") acc.mismatch += 1;
          else if (status === "error") acc.error += 1;
          else if (status === "registered") acc.registered += 1;
          return acc;
        },
        { ok: 0, mismatch: 0, error: 0, registered: 0 },
      );
      setFeedback(
        `Phone verification complete: ${summary.ok} OK, ${summary.mismatch} mismatch, ${summary.error} error${summary.registered ? `, ${summary.registered} already registered` : ""}.`,
      );
    } finally {
      setIsBulkVerifying(false);
    }
  }

  function toggleBulkRowApproval(index: number, approved: boolean) {
    setPreviewRows((rows) =>
      rows.map((row, i) =>
        i === index && row.verifyStatus === "mismatch"
          ? { ...row, approvedMismatch: approved }
          : row,
      ),
    );
  }

  async function handleBulkRegister() {
    if (!selectedSaccoId) {
      setError("Please select a SACCO first");
      return;
    }
    if (previewRows.length === 0 || previewErrors.length > 0) {
      setError("Fix Excel validation errors before registering");
      return;
    }
    if (bulkSummary.pending > 0) {
      setError("Verify phone numbers for all rows before registering");
      return;
    }
    if (bulkSummary.readyToRegister === 0) {
      setError("No rows ready to register. Approve mismatches or fix errors first.");
      return;
    }

    setFeedback("");
    setError("");
    setBulkRowErrors([]);
    setIsBulkUploading(true);

    const indicesToRegister = previewRows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => {
        if (row.verifyStatus === "registered") return false;
        if (row.verifyStatus === "ok") return true;
        if (row.verifyStatus === "mismatch" && row.approvedMismatch) return true;
        return false;
      });

    const payloads = indicesToRegister.map(({ row }) => {
      const ninNa =
        row.nationalIdNotApplicable === true || isNationalIdNotApplicableValue(row.nationalId);
      return {
        firstName: row.firstName,
        lastName: row.lastName,
        displayName: row.displayName,
        phone: row.phone,
        nationalId: ninNa ? undefined : row.nationalId.toUpperCase(),
        nationalIdNotApplicable: ninNa || undefined,
        email: row.email,
        accountNo: row.accountNo,
        clientId: row.clientId,
        status: row.status,
        acknowledgePhoneNameMismatch: row.verifyStatus === "mismatch" || undefined,
      };
    });

    try {
      const result = await createSaccoUsersBulkSequential(selectedSaccoId, payloads);
      const nextRows = [...previewRows];
      const failures: string[] = [];

      result.results.forEach((outcome, resultIndex) => {
        const sourceIndex = indicesToRegister[resultIndex]?.index;
        if (sourceIndex === undefined) return;
        if (outcome.success) {
          nextRows[sourceIndex] = {
            ...nextRows[sourceIndex],
            verifyStatus: "registered",
            registerError: undefined,
          };
        } else {
          nextRows[sourceIndex] = {
            ...nextRows[sourceIndex],
            registerError: outcome.error || "Registration failed",
          };
          failures.push(
            `Row ${sourceIndex + 1} (${nextRows[sourceIndex].firstName} ${nextRows[sourceIndex].lastName}): ${outcome.error || "Failed"}`,
          );
        }
      });

      setPreviewRows(nextRows);
      setFeedback(
        `Registration complete: ${result.successCount ?? 0} created, ${result.failCount ?? 0} failed, ${previewRows.length - indicesToRegister.length} skipped (not approved or already registered).`,
      );
      setBulkRowErrors(failures.slice(0, 15));
      if (result.successCount > 0) {
        await loadSaccos();
        await loadSaccoCustomers(selectedSaccoId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register users");
    } finally {
      setIsBulkUploading(false);
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
      const parsedRows: PreviewRow[] = rows.map((row) => {
        const nationalIdRaw = String(
          row.nationalId ?? row.national_id ?? row.nin ?? row.ninNumber ?? row.nin_number ?? "",
        ).trim();
        const nationalIdNotApplicable =
          parseTruthyExcelFlag(
            row.nationalIdNotApplicable ??
              row.national_id_not_applicable ??
              row.ninNotApplicable ??
              row.nin_not_applicable,
          ) || isNationalIdNotApplicableValue(nationalIdRaw);
        return {
          firstName: String(row.firstName ?? row.first_name ?? "").trim(),
          lastName: String(row.lastName ?? row.last_name ?? "").trim(),
          displayName: String(row.displayName ?? row.display_name ?? "").trim() || undefined,
          phone: String(row.phone ?? row.phoneNumber ?? row.phone_number ?? "").trim(),
          nationalId: nationalIdRaw,
          nationalIdNotApplicable,
          verifyStatus: "pending" as BulkVerifyStatus,
          email: String(row.email ?? "").trim() || undefined,
          accountNo: String(row.accountNo ?? row.account_no ?? "").trim() || undefined,
          clientId: String(row.clientId ?? row.client_id ?? "").trim() || undefined,
          status: String(row.status ?? "ACTIVE").trim() || "ACTIVE",
        };
      });

      const validationErrors = parsedRows
        .map((row, index) => {
          const missingFields: string[] = [];
          if (!row.firstName) missingFields.push("firstName");
          if (!row.lastName) missingFields.push("lastName");
          if (!row.phone) missingFields.push("phone");
          if (!row.accountNo) missingFields.push("accountNo");
          const ninError = validateMemberNationalId(
            row.nationalId,
            row.nationalIdNotApplicable === true,
          );
          if (ninError) missingFields.push(`nationalId (${ninError})`);
          return missingFields.length > 0
            ? `Row ${index + 2}: ${missingFields.join(", ")}`
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">Withdrawal controls</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                USSD withdrawal settings for the selected SACCO.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setWithdrawalControlsOpen((open) => !open)}
              disabled={!selectedSaccoId}
              className={`${ipc.btnSecondary} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {withdrawalControlsOpen ? "Hide settings" : "Configure withdrawals"}
            </button>
          </div>
          {withdrawalControlsOpen && (
            <form className="mt-4 space-y-3 border-t border-slate-200 pt-4" onSubmit={handleSaveWithdrawalSettings}>
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
          )}
        </section>
      )}

      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">SACCO customer members</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Registered SACCO customers for the selected institution. Legal names cannot be edited after registration.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadSaccoCustomers(selectedSaccoId)}
              disabled={!selectedSaccoId || isLoadingCustomers}
              className={ipc.btnSecondary}
            >
              {isLoadingCustomers ? "Refreshing…" : "Refresh"}
            </button>
            <button
              type="button"
              onClick={exportCustomersCsv}
              disabled={filteredCustomerRows.length === 0}
              className={ipc.btnSecondary}
            >
              Export CSV
            </button>
          </div>
        </div>
        <div className="mt-4">
          <input
            type="search"
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            placeholder="Search by name, phone, email, account, NIN…"
            className="w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[var(--rukapay-primary)] focus:ring-2 focus:ring-[#08163d]/15"
          />
        </div>
        <div className={`mt-4 ${ipc.tableWrap}`}>
          <table className={ipc.table}>
            <thead>
              <tr className={ipc.theadRow}>
                <th className={ipc.th}>Name</th>
                <th className={ipc.th}>Phone</th>
                <th className={ipc.th}>Email</th>
                <th className={ipc.th}>NIN</th>
                <th className={ipc.th}>Account</th>
                <th className={ipc.th}>Client ID</th>
                <th className={ipc.th}>Status</th>
                <th className={ipc.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!selectedSaccoId ? (
                <tr>
                  <td className={`${ipc.td} text-slate-600`} colSpan={8}>
                    Select a SACCO to view customer members.
                  </td>
                </tr>
              ) : isLoadingCustomers ? (
                <tr>
                  <td className={`${ipc.td} text-slate-600`} colSpan={8}>
                    Loading customer members…
                  </td>
                </tr>
              ) : filteredCustomerRows.length === 0 ? (
                <tr>
                  <td className={`${ipc.td} text-slate-600`} colSpan={8}>
                    No SACCO customer members yet.
                  </td>
                </tr>
              ) : (
                filteredCustomerRows.map((row) => {
                  const first = row.user?.profile?.firstName || "";
                  const last = row.user?.profile?.lastName || "";
                  const display =
                    row.displayName?.trim() ||
                    `${first} ${last}`.trim() ||
                    "—";
                  return (
                    <tr key={row.id} className={ipc.tbodyRow}>
                      <td className={ipc.td}>{display}</td>
                      <td className={ipc.td}>{row.user?.phone || "—"}</td>
                      <td className={ipc.td}>{row.user?.email || "—"}</td>
                      <td className={ipc.td}>{row.user?.profile?.nationalId || "N/A"}</td>
                      <td className={ipc.td}>{row.accountNo || "—"}</td>
                      <td className={ipc.td}>{row.clientId || "—"}</td>
                      <td className={ipc.td}>{row.status || "—"}</td>
                      <td className={ipc.td}>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditMember(row)}
                            className="text-sm font-medium text-[var(--rukapay-primary)] hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteMember(row.id)}
                            disabled={deletingMemberId === row.id}
                            className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
                          >
                            {deletingMemberId === row.id ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Showing {filteredCustomerRows.length} of {customerRows.length} customer member(s).
        </p>
      </section>

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
                  const isPending =
                    s.accountStatus === "PENDING_INVITATION" ||
                    String(s.status) === "PENDING_INVITATION";
                  const isInactive =
                    s.accountStatus === "INACTIVE" || String(s.status) === "INACTIVE";
                  const badge = isPending
                    ? "Pending Invitation"
                    : isInactive
                      ? "Inactive"
                      : "Active";
                  const badgeClass =
                    badge === "Active"
                      ? "bg-emerald-50 text-emerald-800 ring-emerald-600/20"
                      : badge === "Inactive"
                        ? "bg-slate-100 text-slate-700 ring-slate-500/20"
                        : "bg-amber-50 text-amber-900 ring-amber-600/20";
                  const showResend = canManageMembers && isPending;
                  const showStatusToggle = canManageMembers && !isPending;
                  return (
                    <tr key={s.id} className={ipc.tbodyRow}>
                      <td className={ipc.td}>{`${first} ${last}`.trim() || "—"}</td>
                      <td className={ipc.td}>{s.user?.email || "—"}</td>
                      <td className={ipc.td}>{s.user?.phone || "—"}</td>
                      <td className={ipc.td}>
                        {canManageMembers ? (
                          <select
                            value={s.role || "VIEWER"}
                            disabled={updatingStaffRoleId === s.id}
                            onChange={(e) =>
                              void handleStaffRoleChange(
                                s.id,
                                e.target.value as "OWNER" | "ADMIN" | "OPERATOR" | "VIEWER",
                              )
                            }
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
                          >
                            <option value="OWNER">OWNER</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="OPERATOR">OPERATOR</option>
                            <option value="VIEWER">VIEWER</option>
                          </select>
                        ) : (
                          s.role || "VIEWER"
                        )}
                      </td>
                      <td className={ipc.td}>
                        <div className="flex flex-col gap-1.5">
                          <span
                            className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeClass}`}
                          >
                            {badge}
                          </span>
                          {showStatusToggle ? (
                            <select
                              value={isInactive ? "INACTIVE" : "ACTIVE"}
                              disabled={updatingStaffRoleId === s.id}
                              onChange={(e) =>
                                void handleStaffAccountStatusChange(
                                  s.id,
                                  e.target.value as "ACTIVE" | "INACTIVE",
                                )
                              }
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
                              title="Set inactive when staff is on leave"
                            >
                              <option value="ACTIVE">ACTIVE</option>
                              <option value="INACTIVE">INACTIVE</option>
                            </select>
                          ) : null}
                        </div>
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
            Upload Excel, verify each phone against legal names (same as single registration), approve any
            mismatches per row, then register. Required: firstName, lastName, phone, accountNo. NIN optional
            (use N/A or nationalIdNotApplicable=yes).
          </p>
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={handleDownloadTemplate} className={ipc.btnSecondary}>
                Download Excel template
              </button>
              <input
                ref={bulkFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="sr-only"
                onChange={(e) => void handleBulkFileChange(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                onClick={() => bulkFileInputRef.current?.click()}
                disabled={!selectedSaccoId}
                className={`${ipc.btnSecondary} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Choose Excel file
              </button>
              {bulkFile ? (
                <span className="text-sm text-slate-600">
                  Selected: <span className="font-medium text-slate-800">{bulkFile.name}</span>
                </span>
              ) : (
                <span className="text-sm text-slate-500">No file selected</span>
              )}
            </div>
            {isParsingFile && <p className="text-xs text-slate-500">Reading Excel file...</p>}
            {previewRows.length > 0 && (
              <p className="text-xs text-slate-600">
                {bulkSummary.readyToRegister} ready to register · {bulkSummary.mismatch - bulkSummary.mismatchApproved} mismatch
                need approval · {bulkSummary.error} error · {bulkSummary.registered} registered
                {bulkSummary.pending > 0 ? ` · ${bulkSummary.pending} not verified yet` : ""}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleBulkVerify}
                disabled={
                  !selectedSaccoId ||
                  previewRows.length === 0 ||
                  previewErrors.length > 0 ||
                  isBulkVerifying ||
                  isBulkUploading
                }
                className={`${ipc.btnSecondary} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {isBulkVerifying ? "Verifying phones…" : "1. Verify phone numbers"}
              </button>
              <button
                type="button"
                onClick={handleBulkRegister}
                disabled={
                  !selectedSaccoId ||
                  previewRows.length === 0 ||
                  previewErrors.length > 0 ||
                  bulkSummary.pending > 0 ||
                  bulkSummary.readyToRegister === 0 ||
                  isBulkVerifying ||
                  isBulkUploading
                }
                className={`${ipc.btnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {isBulkUploading ? "Registering…" : "2. Register verified rows"}
              </button>
            </div>

            {bulkFile && !isParsingFile && (
              <p className="text-xs text-slate-500">
                Preview loaded: {previewRows.length} row(s).
              </p>
            )}

            {previewRows.length > 0 && (
              <div className={`mt-3 ${ipc.tableWrap}`}>
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">Bulk preview & verification</p>
                  <p className="text-xs text-slate-600">
                    Approve mismatch rows after confirming identity manually (same as single member create).
                  </p>
                </div>
                <div className="max-h-96 overflow-auto">
                  <table className={ipc.table}>
                    <thead>
                      <tr className={ipc.theadRow}>
                        <th className={ipc.th}>#</th>
                        <th className={ipc.th}>Name</th>
                        <th className={ipc.th}>Phone</th>
                        <th className={ipc.th}>Account</th>
                        <th className={ipc.th}>MNO account name</th>
                        <th className={ipc.th}>Status</th>
                        <th className={ipc.th}>Approve</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, index) => {
                        const status = row.verifyStatus ?? "pending";
                        const statusClass =
                          status === "ok" || status === "registered"
                            ? "bg-emerald-50 text-emerald-800 ring-emerald-600/20"
                            : status === "mismatch"
                              ? "bg-amber-50 text-amber-900 ring-amber-600/20"
                              : status === "error"
                                ? "bg-red-50 text-red-800 ring-red-600/20"
                                : "bg-slate-100 text-slate-700 ring-slate-500/20";
                        const statusLabel =
                          status === "ok"
                            ? "OK"
                            : status === "mismatch"
                              ? "Mismatch"
                              : status === "error"
                                ? "Error"
                                : status === "registered"
                                  ? "Registered"
                                  : "Pending";
                        return (
                          <tr
                            key={`${row.firstName}-${row.lastName}-${row.phone}-${index}`}
                            className={ipc.tbodyRow}
                          >
                            <td className={ipc.tdNum}>{index + 1}</td>
                            <td className={ipc.td}>
                              {`${row.firstName} ${row.lastName}`.trim() || "—"}
                              {row.registerError ? (
                                <p className="mt-0.5 text-xs text-red-600">{row.registerError}</p>
                              ) : null}
                              {row.verifyError && status === "error" ? (
                                <p className="mt-0.5 text-xs text-red-600">{row.verifyError}</p>
                              ) : null}
                            </td>
                            <td className={ipc.td}>{row.phone || "—"}</td>
                            <td className={ipc.td}>{row.accountNo || "—"}</td>
                            <td className={ipc.td}>{row.officialName || "—"}</td>
                            <td className={ipc.td}>
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusClass}`}
                              >
                                {statusLabel}
                              </span>
                            </td>
                            <td className={ipc.td}>
                              {status === "mismatch" ? (
                                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(row.approvedMismatch)}
                                    onChange={(e) => toggleBulkRowApproval(index, e.target.checked)}
                                  />
                                  Verified manually
                                </label>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
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
        memberNationalIdNotApplicable={memberNationalIdNotApplicable}
        memberAccountNo={memberAccountNo}
        memberEmail={memberEmail}
        memberClientId={memberClientId}
        phoneMismatchOfficial={memberPhoneMismatchOfficial}
        acknowledgePhoneNameMismatch={acknowledgePhoneNameMismatch}
        onClose={() => setIsCreateMemberModalOpen(false)}
        onSubmit={handleCreateMember}
        onSaccoChange={(id) => {
          setSelectedSaccoId(id);
          setMemberFormErrors((prev) => ({ ...prev, sacco: undefined }));
        }}
        onFirstNameChange={(v) => {
          setMemberFirstName(v);
          setMemberFormErrors((prev) => ({ ...prev, firstName: undefined, form: undefined }));
          setMemberPhoneMismatchOfficial(null);
          setAcknowledgePhoneNameMismatch(false);
        }}
        onLastNameChange={(v) => {
          setMemberLastName(v);
          setMemberFormErrors((prev) => ({ ...prev, lastName: undefined, form: undefined }));
          setMemberPhoneMismatchOfficial(null);
          setAcknowledgePhoneNameMismatch(false);
        }}
        onDisplayNameChange={setMemberDisplayName}
        onPhoneChange={(v) => {
          setMemberPhone(v);
          setMemberFormErrors((prev) => ({ ...prev, phone: undefined, form: undefined }));
          setMemberPhoneMismatchOfficial(null);
          setAcknowledgePhoneNameMismatch(false);
        }}
        onNationalIdChange={(v) => {
          setMemberNationalId(v);
          setMemberFormErrors((prev) => ({ ...prev, nationalId: undefined }));
        }}
        onNationalIdNotApplicableChange={(v) => {
          setMemberNationalIdNotApplicable(v);
          if (v) setMemberNationalId("");
          setMemberFormErrors((prev) => ({ ...prev, nationalId: undefined }));
        }}
        onAccountNoChange={(v) => {
          setMemberAccountNo(v);
          setMemberFormErrors((prev) => ({ ...prev, accountNo: undefined }));
        }}
        onEmailChange={setMemberEmail}
        onClientIdChange={setMemberClientId}
        onAcknowledgeMismatchChange={setAcknowledgePhoneNameMismatch}
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

      <EditMemberModal
        open={Boolean(editingMember)}
        member={editingMember}
        isSubmitting={isSavingMemberEdit}
        error={editModalError}
        displayName={editDisplayName}
        email={editEmail}
        accountNo={editAccountNo}
        clientId={editClientId}
        status={editStatus}
        onClose={() => setEditingMember(null)}
        onSubmit={handleSaveMemberEdit}
        onDisplayNameChange={setEditDisplayName}
        onEmailChange={setEditEmail}
        onAccountNoChange={setEditAccountNo}
        onClientIdChange={setEditClientId}
        onStatusChange={setEditStatus}
      />

        </>
      )}
    </>
  );
}
