"use client";

import { API_CONFIG, APP_CONFIG } from "./config";

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
};

type CreateSaccoUserPayload = {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  accountNo?: string;
  clientId?: string;
  status?: string;
};

function getAuthHeaders() {
  const token = localStorage.getItem(APP_CONFIG.storageKeys.accessToken);
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token || ""}`,
  };
}

export async function listPartnerSaccos() {
  const response = await fetch(`${API_CONFIG.baseUrl}/partner-institutions`, {
    headers: getAuthHeaders(),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Failed to fetch SACCOs");
  return data as Array<Record<string, unknown>>;
}

export async function createPartnerSacco(payload: CreateSaccoPayload) {
  const response = await fetch(`${API_CONFIG.baseUrl}/partner-institutions`, {
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

export async function createSaccoUser(institutionId: string, payload: CreateSaccoUserPayload) {
  const response = await fetch(
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
  if (!response.ok) throw new Error(data?.message || "Failed to create user");
  return data;
}

export async function listSaccoUsers(institutionId: string) {
  const response = await fetch(
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
      status?: string;
      createdAt?: string | null;
      user?: {
        email?: string | null;
        phone?: string | null;
        profile?: { firstName?: string | null; lastName?: string | null } | null;
      } | null;
    }>;
  };
}

export async function listSaccoTransactions(institutionId: string) {
  const response = await fetch(
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

  const response = await fetch(
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
export async function requestWalletLiquidation(payload: {
  walletId: string;
  amount: number;
  currency?: string;
  reason?: string;
  manualSettlementNote?: string;
}) {
  const paths = ["/transactions/liquidation/request", "/api/v1/transactions/liquidation/request"];
  let lastMessage = "Could not submit liquidation request";
  for (const path of paths) {
    const response = await fetch(`${API_CONFIG.baseUrl}${path}`, {
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

      const response = await fetch(
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
          status: row.status != null ? String(row.status) : undefined,
          amount: Number.isFinite(amount) ? amount : undefined,
          currency: row.currency != null ? String(row.currency) : undefined,
          requestedAt: row.createdAt != null ? String(row.createdAt) : undefined,
          updatedAt: row.createdAt != null ? String(row.createdAt) : undefined,
          notes: row.description != null ? String(row.description) : undefined,
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
  });
}

export async function downloadSaccoUsersTemplate() {
  const token = localStorage.getItem(APP_CONFIG.storageKeys.accessToken);
  const response = await fetch(getSaccoUsersTemplateUrl(), {
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
