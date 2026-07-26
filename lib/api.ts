"use client";

import { API_CONFIG, APP_CONFIG } from "./config";
import { clearSession } from "./auth";

type LoginPayload = {
  email: string;
  password: string;
  tenantCode?: string;
};

export async function loginInstitutionUser(payload: LoginPayload) {
  const requestPayload = {
    email: payload.email,
    password: payload.password,
    ...(payload.tenantCode ? { tenantCode: payload.tenantCode } : {}),
  };

  // Backend route for partner auth is /partner-auth/login in current rdbs_core.
  // Keep fallbacks for environments that expose versioned paths.
  const loginPaths = [
    "/partner-auth/login",
    "/api/v1/partner-auth/login",
    "/api/partner-auth/login",
  ];

  let response: Response | null = null;
  let data: any = {};

  for (const path of loginPaths) {
    response = await fetch(`${API_CONFIG.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload),
    });

    data = await response.json().catch(() => ({}));

    // Stop on any non-404 response.
    if (response.status !== 404) {
      break;
    }
  }

  if (!response || !response.ok) {
    throw new Error(data?.message || "Invalid credentials");
  }

  return {
    ...data,
    accessToken: data?.accessToken || data?.token,
  };
}

type CreateSaccoPayload = {
  code: string;
  name: string;
  externalOrgId?: string;
  /** Letters and digits only; optional */
  licenseNumber?: string;
  createInitialStaffLogin?: boolean;
  initialStaffEmail?: string;
  initialStaffPhone?: string;
  initialStaffFirstName?: string;
  initialStaffLastName?: string;
  initialStaffRole?: "OWNER" | "ADMIN" | "OPERATOR" | "VIEWER";
};

type CreateSaccoUserPayload = {
  firstName: string;
  lastName: string;
  displayName?: string;
  phone: string;
  nationalId?: string;
  nationalIdNotApplicable?: boolean;
  email?: string;
  accountNo?: string;
  clientId?: string;
  status?: string;
  acknowledgePhoneNameMismatch?: boolean;
};

type UpdateSaccoUserPayload = {
  displayName?: string;
  email?: string;
  accountNo?: string;
  clientId?: string;
  status?: string;
};

type UpdateSaccoStaffPayload = {
  role?: "OWNER" | "ADMIN" | "OPERATOR" | "VIEWER";
  accountStatus?: "ACTIVE" | "INACTIVE";
  canViewTransactions?: boolean;
  canManageMembers?: boolean;
  canManageInstitution?: boolean;
  canRequestLiquidation?: boolean;
};

type CreateSaccoStaffPayload = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role?: "OWNER" | "ADMIN" | "OPERATOR" | "VIEWER";
  canViewTransactions?: boolean;
  canManageMembers?: boolean;
  canManageInstitution?: boolean;
  canRequestLiquidation?: boolean;
};

type PartnerStaffRole = "OWNER" | "ADMIN" | "DEVELOPER" | "MEMBER" | "VIEWER";

type CreatePartnerStaffPayload = {
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role: PartnerStaffRole;
};

type UpdateSaccoWithdrawalSettingsPayload = {
  enabled?: boolean;
  savings?: boolean;
  shares?: boolean;
  minimumAmount?: number;
  maximumAmount?: number;
};

function getAuthHeaders() {
  const token = localStorage.getItem(APP_CONFIG.storageKeys.accessToken);
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token || ""}`,
  };
}

function logoutOnUnauthorized() {
  if (typeof window === "undefined") return;
  clearSession();
  if (window.location.pathname !== "/") {
    window.location.href = "/";
  }
}

async function authFetch(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  if (response.status === 401) {
    logoutOnUnauthorized();
    throw new Error("Session expired. Please login again.");
  }
  return response;
}

export async function listPartnerSaccos() {
  const response = await authFetch(`${API_CONFIG.baseUrl}/partner-institutions`, {
    headers: getAuthHeaders(),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Failed to fetch SACCOs");
  return data as Array<Record<string, unknown>>;
}

export async function changePartnerPassword(body: {
  currentPassword: string;
  newPassword: string;
}) {
  const response = await authFetch(`${API_CONFIG.baseUrl}/partner-auth/change-password`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data?.message === "string"
        ? data.message
        : data?.message?.message || "Failed to change password",
    );
  }
  return data as { success?: boolean; message?: string };
}

export async function createPartnerSacco(payload: CreateSaccoPayload) {
  const response = await authFetch(`${API_CONFIG.baseUrl}/partner-institutions`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      ...payload,
      status: "ACTIVE",
      settlementMode: "NEXEN_LEDGER",
      createSettlementWallet: true,
      walletCurrency: "UGX",
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Failed to create SACCO");
  return data;
}

export async function createSaccoStaff(institutionId: string, payload: CreateSaccoStaffPayload) {
  const response = await authFetch(
    `${API_CONFIG.baseUrl}/partner-institutions/${institutionId}/staff`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Failed to create SACCO staff");
  return data;
}

export async function listSaccoStaff(institutionId: string) {
  const response = await authFetch(
    `${API_CONFIG.baseUrl}/partner-institutions/${institutionId}/staff`,
    {
      headers: getAuthHeaders(),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Failed to fetch SACCO staff");
  return data as {
    institution?: { id?: string; name?: string; code?: string };
    total?: number;
    members?: Array<{
      id: string;
      status?: string;
      accountStatus?: string;
      role?: string;
      permissions?: Record<string, unknown> | null;
      createdAt?: string | null;
      user?: {
        email?: string | null;
        phone?: string | null;
        profile?: { firstName?: string | null; lastName?: string | null } | null;
      } | null;
    }>;
  };
}

export async function updateSaccoWithdrawalSettings(
  institutionId: string,
  payload: UpdateSaccoWithdrawalSettingsPayload,
) {
  const response = await authFetch(
    `${API_CONFIG.baseUrl}/partner-institutions/${institutionId}/withdrawal-settings`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || "Failed to update withdrawal settings");
  }
  return data as {
    institution?: { id?: string; name?: string; code?: string };
    withdrawals?: {
      enabled?: boolean;
      savings?: boolean;
      shares?: boolean;
      minimumAmount?: number;
      maximumAmount?: number;
    };
  };
}

export async function listPartnerTeamMembers(partnerId: string) {
  const response = await authFetch(`${API_CONFIG.baseUrl}/partner/${partnerId}/members`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Failed to fetch partner staff");
  return data as {
    members?: Array<{
      id: string;
      email?: string;
      firstName?: string | null;
      lastName?: string | null;
      role?: string;
      status?: string;
      accountStatus?: string;
      canManageMembers?: boolean;
      canManageApiKeys?: boolean;
      canViewTransactions?: boolean;
      canViewAnalytics?: boolean;
      canConfigureTariffs?: boolean;
      createdAt?: string;
      updatedAt?: string;
    }>;
    totalMembers?: number;
    activeMembers?: number;
    pendingInvitations?: number;
  };
}

export async function createPartnerStaff(
  partnerId: string,
  payload: CreatePartnerStaffPayload,
) {
  const response = await authFetch(
    `${API_CONFIG.baseUrl}/partner/${partnerId}/members/add-direct`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        partnerId,
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        phoneNumber: payload.phoneNumber,
        role: payload.role,
      }),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Failed to create partner staff");
  return data;
}

export async function updatePartnerStaff(
  memberId: string,
  payload: {
    role?: PartnerStaffRole;
    canViewTransactions?: boolean;
    canManageApiKeys?: boolean;
    canViewAnalytics?: boolean;
    canManageMembers?: boolean;
    canConfigureTariffs?: boolean;
  },
) {
  const response = await authFetch(`${API_CONFIG.baseUrl}/partner/members/${memberId}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Failed to update partner staff");
  return data;
}

export async function createSaccoUser(institutionId: string, payload: CreateSaccoUserPayload) {
  const response = await authFetch(
    `${API_CONFIG.baseUrl}/partner-institutions/${institutionId}/users`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        ...payload,
        status: payload.status || "ACTIVE",
      }),
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(
      typeof data?.message === "string"
        ? data.message
        : Array.isArray(data?.message)
          ? data.message.join(", ")
          : "Failed to create user",
    ) as Error & { code?: string; officialName?: string };
    if (data?.code) err.code = String(data.code);
    if (data?.officialName) err.officialName = String(data.officialName);
    throw err;
  }
  return data;
}

export async function listSaccoUsers(institutionId: string) {
  const response = await authFetch(
    `${API_CONFIG.baseUrl}/partner-institutions/${institutionId}/users`,
    {
      headers: getAuthHeaders(),
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Failed to fetch SACCO users");
  return data as {
    institution?: { id?: string; name?: string; code?: string };
    total?: number;
    members?: Array<{
      id: string;
      accountNo?: string | null;
      clientId?: string | null;
      displayName?: string | null;
      status?: string;
      createdAt?: string | null;
      user?: {
        email?: string | null;
        phone?: string | null;
        profile?: {
          firstName?: string | null;
          lastName?: string | null;
          nationalId?: string | null;
        } | null;
      } | null;
    }>;
  };
}

export async function updateSaccoUser(
  institutionId: string,
  memberId: string,
  payload: UpdateSaccoUserPayload,
) {
  const response = await authFetch(
    `${API_CONFIG.baseUrl}/partner-institutions/${institutionId}/users/${memberId}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Failed to update SACCO member");
  return data;
}

export async function deleteSaccoUser(institutionId: string, memberId: string) {
  const response = await authFetch(
    `${API_CONFIG.baseUrl}/partner-institutions/${institutionId}/users/${memberId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Failed to delete SACCO member");
  return data as { success?: boolean; message?: string };
}

export async function updateSaccoStaff(
  institutionId: string,
  memberId: string,
  payload: UpdateSaccoStaffPayload,
) {
  const response = await authFetch(
    `${API_CONFIG.baseUrl}/partner-institutions/${institutionId}/staff/${memberId}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Failed to update SACCO staff role");
  return data;
}

export type SaccoMemberPhoneValidation = {
  status: "OK" | "MISMATCH" | "ERROR";
  matchStatus?: "MATCHED" | "FLEXIBLE";
  officialName?: string;
  error?: string;
};

export async function validateSaccoMemberPhone(
  institutionId: string,
  payload: { firstName: string; lastName: string; phone: string },
) {
  const response = await authFetch(
    `${API_CONFIG.baseUrl}/partner-institutions/${institutionId}/users/validate-phone`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Failed to validate phone");
  return data as SaccoMemberPhoneValidation;
}

export async function createSaccoUsersBulkSequential(
  institutionId: string,
  rows: CreateSaccoUserPayload[],
) {
  const results: Array<{
    index: number;
    success: boolean;
    error?: string;
  }> = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    try {
      await createSaccoUser(institutionId, row);
      results.push({ index: i + 1, success: true });
    } catch (err) {
      const apiErr = err as Error;
      results.push({
        index: i + 1,
        success: false,
        error: apiErr.message || "Failed to create user",
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  return {
    total: results.length,
    successCount,
    failCount: results.length - successCount,
    results,
  };
}

export async function listSaccoTransactions(institutionId: string) {
  const response = await authFetch(
    `${API_CONFIG.baseUrl}/partner-institutions/${institutionId}/transactions`,
    {
      headers: getAuthHeaders(),
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Failed to fetch SACCO transactions");
  return data as {
    institution?: { id?: string; name?: string; code?: string };
    total?: number;
    transactions?: Array<{
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
        profile?: {
          firstName?: string | null;
          lastName?: string | null;
        } | null;
      } | null;
    }>;
  };
}

export async function uploadSaccoUsersExcel(institutionId: string, file: File) {
  const token = localStorage.getItem(APP_CONFIG.storageKeys.accessToken);
  const formData = new FormData();
  formData.append("file", file);

  const response = await authFetch(
    `${API_CONFIG.baseUrl}/partner-institutions/${institutionId}/users/upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token || ""}`,
      },
      body: formData,
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Failed to upload users file");
  return data;
}

export function getSaccoUsersTemplateUrl() {
  return `${API_CONFIG.baseUrl}/partner-institutions/users/template`;
}

export type PartnerLiquidation = {
  id: string;
  reference?: string;
  institutionId?: string;
  saccoCode?: string;
  saccoName?: string;
  status?: string;
  amount?: number;
  currency?: string;
  requestedAt?: string;
  updatedAt?: string;
  notes?: string;
  payoutMethod?: string;
  payoutDetails?: Record<string, unknown>;
  processingStatus?: string;
  approvalStatus?: string;
};

function deriveLiquidationDisplayStatus(row: Record<string, unknown>): string {
  const raw = String(row.status ?? "PENDING").toUpperCase();
  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};
  const processing = String(metadata.liquidationProcessingStatus || "").toUpperCase();
  const approval = String(metadata.liquidationApprovalStatus || "").toUpperCase();
  if (approval === "APPROVED" && raw === "PENDING") return "APPROVED";
  if (processing === "SUCCESS_AUTO_PROCESSED") return "SUCCESS (Auto-Processed)";
  if (processing === "SUCCESS_MANUAL_PROCESSING_REQUIRED")
    return "SUCCESS (Manual Processing Required)";
  return raw;
}

export type LiquidationMethod = "RUKAPAY_WALLET" | "MOBILE_MONEY" | "BANK_TRANSFER";

export type LiquidationRequestPayload = {
  walletId: string;
  amount: number;
  currency?: string;
  reason?: string;
  manualSettlementNote?: string;
  payoutMethod: LiquidationMethod;
  destinationWalletId?: string;
  mobileMoneyPhone?: string;
  mobileMoneyNetwork?: string;
  mobileMoneyRecipientName?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
};

type SaccoWithWallets = {
  id?: string;
  code?: string;
  name?: string;
  wallets?: Array<{
    id?: string;
    walletType?: string;
    balance?: unknown;
    currency?: string;
  }>;
};

function toWalletBalance(raw: unknown): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  if (typeof raw === "string") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof raw === "object" && raw !== null && "toString" in raw) {
    const n = Number(String((raw as { toString: () => string }).toString()));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Wallet used for liquidation: PARTNER settlement wallet when present, else first wallet (legacy). */
export function getSettlementWalletPreview(institution: SaccoWithWallets): {
  walletId: string;
  balance: number;
  currency: string;
  walletType: string;
  isPartnerWallet: boolean;
} | null {
  const wallets = institution.wallets;
  if (!Array.isArray(wallets) || !wallets.length) return null;
  const partner = wallets.find((w) => String(w.walletType || "").toUpperCase() === "PARTNER");
  const chosen = partner ?? wallets[0];
  if (!chosen?.id) return null;
  return {
    walletId: String(chosen.id),
    balance: toWalletBalance(chosen.balance),
    currency: String(chosen.currency || "UGX"),
    walletType: String(chosen.walletType || ""),
    isPartnerWallet: String(chosen.walletType || "").toUpperCase() === "PARTNER",
  };
}

function pickSettlementWalletId(institution: SaccoWithWallets): string | undefined {
  return getSettlementWalletPreview(institution)?.walletId;
}

/**
 * Request wallet liquidation (rdbs_core: POST /transactions/liquidation/request).
 * Creates a PENDING LIQUIDATION transaction; admin approves before debit.
 */
export async function requestWalletLiquidation(payload: LiquidationRequestPayload) {
  const paths = ["/transactions/liquidation/request", "/api/v1/transactions/liquidation/request"];
  let lastMessage = "Could not submit liquidation request";
  for (const path of paths) {
    const response = await authFetch(`${API_CONFIG.baseUrl}${path}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 404) continue;
    if (!response.ok) {
      lastMessage =
        (typeof data?.message === "string" && data.message) ||
        (Array.isArray(data?.message) && data.message[0]) ||
        lastMessage;
      if (response.status >= 500) continue;
      throw new Error(lastMessage);
    }
    return data as {
      success?: boolean;
      transactionId?: string;
      reference?: string;
      status?: string;
      message?: string;
    };
  }
  throw new Error(lastMessage);
}

/**
 * Aggregates LIQUIDATION rows from each SACCO’s wallet transactions (rdbs_core).
 */
export async function listPartnerLiquidations(): Promise<PartnerLiquidation[]> {
  const institutions = (await listPartnerSaccos()) as SaccoWithWallets[];
  if (!Array.isArray(institutions) || !institutions.length) return [];

  const batches = await Promise.all(
    institutions.map(async (inst) => {
      const institutionId = inst.id ? String(inst.id) : "";
      if (!institutionId) return [] as PartnerLiquidation[];

      const response = await authFetch(
        `${API_CONFIG.baseUrl}/partner-institutions/${institutionId}/transactions`,
        {
          headers: getAuthHeaders(),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return [];

      const txs = data.transactions;
      if (!Array.isArray(txs)) return [];

      const code = inst.code ? String(inst.code) : "";
      const name = inst.name ? String(inst.name) : "";
      const out: PartnerLiquidation[] = [];

      for (const t of txs) {
        const row = t as Record<string, unknown>;
        if (String(row.type || "").toUpperCase() !== "LIQUIDATION") continue;

        const amountRaw = row.amount;
        const amount =
          typeof amountRaw === "number"
            ? amountRaw
            : amountRaw != null
              ? Number(amountRaw)
              : undefined;

        out.push({
          id: String(row.id ?? ""),
          reference: row.reference != null ? String(row.reference) : undefined,
          institutionId,
          saccoCode: code || undefined,
          saccoName: name || undefined,
          status: deriveLiquidationDisplayStatus(row),
          amount: Number.isFinite(amount) ? amount : undefined,
          currency: row.currency != null ? String(row.currency) : undefined,
          requestedAt: row.createdAt != null ? String(row.createdAt) : undefined,
          updatedAt: row.createdAt != null ? String(row.createdAt) : undefined,
          notes: row.description != null ? String(row.description) : undefined,
          payoutMethod:
            row.metadata &&
            typeof row.metadata === "object" &&
            !Array.isArray(row.metadata)
              ? String((row.metadata as Record<string, unknown>).payoutMethod || "")
              : undefined,
          payoutDetails:
            row.metadata &&
            typeof row.metadata === "object" &&
            !Array.isArray(row.metadata)
              ? (((row.metadata as Record<string, unknown>).payoutDetails as Record<
                  string,
                  unknown
                >) || undefined)
              : undefined,
          processingStatus:
            row.metadata &&
            typeof row.metadata === "object" &&
            !Array.isArray(row.metadata)
              ? String(
                  (row.metadata as Record<string, unknown>)
                    .liquidationProcessingStatus || "",
                ) || undefined
              : undefined,
          approvalStatus:
            row.metadata &&
            typeof row.metadata === "object" &&
            !Array.isArray(row.metadata)
              ? String(
                  (row.metadata as Record<string, unknown>).liquidationApprovalStatus ||
                    "",
                ) || undefined
              : undefined,
        });
      }
      return out;
    }),
  );

  const results = batches.flat();

  results.sort((a, b) => {
    const ta = a.requestedAt ? new Date(a.requestedAt).getTime() : 0;
    const tb = b.requestedAt ? new Date(b.requestedAt).getTime() : 0;
    return tb - ta;
  });

  return results;
}

/**
 * Submit liquidation for a SACCO’s settlement wallet (PARTNER wallet when present).
 */
export async function createPartnerLiquidationRequest(payload: {
  institutionId: string;
  amount: number;
  currency?: string;
  reason?: string;
  manualSettlementNote?: string;
  payoutMethod: LiquidationMethod;
  destinationWalletId?: string;
  mobileMoneyPhone?: string;
  mobileMoneyNetwork?: string;
  mobileMoneyRecipientName?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
}) {
  const institutions = (await listPartnerSaccos()) as SaccoWithWallets[];
  const inst = institutions.find((i) => String(i.id) === String(payload.institutionId));
  if (!inst) {
    throw new Error("SACCO not found");
  }
  const walletId = pickSettlementWalletId(inst);
  if (!walletId) {
    throw new Error("No settlement wallet for this SACCO. Create the SACCO with a settlement wallet first.");
  }

  return requestWalletLiquidation({
    walletId,
    amount: payload.amount,
    currency: payload.currency || "UGX",
    reason: payload.reason,
    manualSettlementNote: payload.manualSettlementNote,
    payoutMethod: payload.payoutMethod,
    destinationWalletId: payload.destinationWalletId,
    mobileMoneyPhone: payload.mobileMoneyPhone,
    mobileMoneyNetwork: payload.mobileMoneyNetwork,
    mobileMoneyRecipientName: payload.mobileMoneyRecipientName,
    bankName: payload.bankName,
    bankAccountNumber: payload.bankAccountNumber,
    bankAccountName: payload.bankAccountName,
  });
}

export async function cancelLiquidationRequest(transactionId: string, reason?: string) {
  const paths = [
    `/transactions/liquidation/${transactionId}/cancel`,
    `/api/v1/transactions/liquidation/${transactionId}/cancel`,
  ];
  let lastMessage = "Could not cancel liquidation request";
  for (const path of paths) {
    const response = await authFetch(`${API_CONFIG.baseUrl}${path}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 404) continue;
    if (!response.ok) {
      lastMessage =
        (typeof data?.message === "string" && data.message) ||
        (Array.isArray(data?.message) && data.message[0]) ||
        lastMessage;
      throw new Error(lastMessage);
    }
    return data as { success?: boolean; message?: string; status?: string };
  }
  throw new Error(lastMessage);
}

type ValidatePartnerDestinationPayload = {
  transactionType: "WALLET_TO_BANK" | "WALLET_TO_MNO";
  accountNumber?: string;
  bankCode?: string;
  phoneNumber?: string;
  network?: string;
};

type ValidatePartnerDestinationResponse = {
  success?: boolean;
  message?: string;
  beneficiary?: { name?: string; isValid?: boolean };
  validationResult?: { data?: { name?: string } };
  error?: string;
};

export async function validatePartnerDestination(
  payload: ValidatePartnerDestinationPayload,
): Promise<ValidatePartnerDestinationResponse> {
  const response = await authFetch(`${API_CONFIG.baseUrl}/transactions/validate`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (typeof data?.message === "string" && data.message) ||
      (Array.isArray(data?.message) && data.message[0]) ||
      "Destination validation failed";
    throw new Error(message);
  }
  return data as ValidatePartnerDestinationResponse;
}

export async function downloadSaccoUsersTemplate() {
  const token = localStorage.getItem(APP_CONFIG.storageKeys.accessToken);
  const response = await authFetch(getSaccoUsersTemplateUrl(), {
    headers: {
      Authorization: `Bearer ${token || ""}`,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.message || "Failed to download template");
  }

  return response.blob();
}

export type InvitationVerifyResponse = {
  valid: boolean;
  reason?: "INVALID" | "EXPIRED" | "ALREADY_USED" | "CANCELLED";
  email?: string;
  kind?: "PARTNER_TEAM" | "INSTITUTION_STAFF";
};

export async function verifyInvitationToken(invitationToken: string): Promise<InvitationVerifyResponse> {
  const paths = ["/partner-auth/invitations/verify", "/api/v1/partner-auth/invitations/verify"];
  let lastMessage = "Verification failed";
  for (const path of paths) {
    const response = await fetch(`${API_CONFIG.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationToken }),
    });
    const data = (await response.json().catch(() => ({}))) as InvitationVerifyResponse & { message?: string };
    if (response.status === 404) continue;
    if (!response.ok) {
      lastMessage = typeof data?.message === "string" ? data.message : lastMessage;
      if (response.status >= 500) continue;
      throw new Error(lastMessage);
    }
    return data;
  }
  throw new Error(lastMessage);
}

export async function completeInvitationWithPassword(
  invitationToken: string,
  password: string,
): Promise<{ success?: boolean; message?: string }> {
  const paths = ["/partner-auth/invitations/complete", "/api/v1/partner-auth/invitations/complete"];
  let lastMessage = "Could not complete invitation";
  for (const path of paths) {
    const response = await fetch(`${API_CONFIG.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationToken, password }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 404) continue;
    if (!response.ok) {
      lastMessage =
        (typeof data?.message === "string" && data.message) ||
        (Array.isArray(data?.message) && data.message[0]) ||
        lastMessage;
      throw new Error(lastMessage);
    }
    return data as { success?: boolean; message?: string };
  }
  throw new Error(lastMessage);
}

export async function resendPartnerTeamInvitation(partnerId: string, memberId: string) {
  const response = await authFetch(
    `${API_CONFIG.baseUrl}/partner/${partnerId}/members/${memberId}/resend-invitation`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg =
      (typeof data?.message === "string" && data.message) ||
      (typeof data?.message === "object" && data?.message?.message) ||
      "Failed to resend invitation";
    throw new Error(msg);
  }
  return data as { success?: boolean; message?: string };
}

export async function resendSaccoStaffInvitation(institutionId: string, memberId: string) {
  const response = await authFetch(
    `${API_CONFIG.baseUrl}/partner-institutions/${institutionId}/staff/${memberId}/resend-invitation`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg =
      (typeof data?.message === "string" && data.message) ||
      (typeof data?.message === "object" && data?.message?.message) ||
      "Failed to resend invitation";
    throw new Error(msg);
  }
  return data as { success?: boolean; message?: string };
}
