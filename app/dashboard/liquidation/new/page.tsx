"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createPartnerLiquidationRequest,
  getSettlementWalletPreview,
  listPartnerSaccos,
  type LiquidationMethod,
  validatePartnerDestination,
} from "@/lib/api";
import { ipc } from "@/lib/dashboard-ui";
import { LIQUIDATION_BANK_OPTIONS } from "@/lib/liquidation-banks";

type SaccoRow = {
  id: string;
  code?: string;
  name?: string;
  wallets?: Array<{ id?: string; walletType?: string; balance?: unknown; currency?: string }>;
};

function formatMoney(n: number, ccy = "UGX") {
  return `${ccy} ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function NewDashboardLiquidationPage() {
  const [saccos, setSaccos] = useState<SaccoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [institutionId, setInstitutionId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [manualSettlementNote, setManualSettlementNote] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<LiquidationMethod>("RUKAPAY_WALLET");
  const [destinationWalletId, setDestinationWalletId] = useState("");
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState("");
  const [mobileMoneyNetwork, setMobileMoneyNetwork] = useState("");
  const [mobileMoneyRecipientName, setMobileMoneyRecipientName] = useState("");
  const [selectedBankCode, setSelectedBankCode] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isDestinationValidated, setIsDestinationValidated] = useState(false);
  const [validationBusy, setValidationBusy] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const list = (await listPartnerSaccos()) as SaccoRow[];
        setSaccos(Array.isArray(list) ? list : []);
      } catch {
        setFormError("Unable to load SACCO list.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const settlementPreview = useMemo(() => {
    if (!institutionId) return null;
    const inst = saccos.find((s) => String(s.id) === institutionId);
    return inst ? getSettlementWalletPreview(inst) : null;
  }, [institutionId, saccos]);

  useEffect(() => {
    setIsDestinationValidated(false);
    setValidationMessage("");
  }, [
    payoutMethod,
    destinationWalletId,
    mobileMoneyPhone,
    mobileMoneyNetwork,
    selectedBankCode,
    bankAccountNumber,
  ]);

  async function runDestinationLookup() {
    setFormError("");
    setValidationMessage("");
    try {
      setValidationBusy(true);
      if (payoutMethod === "BANK_TRANSFER") {
        if (!selectedBankCode || !bankAccountNumber.trim()) {
          throw new Error("Select bank and enter account number before lookup.");
        }
        const result = await validatePartnerDestination({
          transactionType: "WALLET_TO_BANK",
          accountNumber: bankAccountNumber.trim(),
          bankCode: selectedBankCode,
        });
        const name =
          result?.beneficiary?.name ||
          result?.validationResult?.data?.name ||
          "Account validated";
        if (!bankAccountName.trim() && name !== "Account validated") {
          setBankAccountName(name);
        }
        setValidationMessage(`Validated: ${name}`);
        setIsDestinationValidated(true);
        return;
      }
      if (payoutMethod === "MOBILE_MONEY") {
        if (!mobileMoneyPhone.trim() || !mobileMoneyNetwork.trim()) {
          throw new Error("Enter phone and network before lookup.");
        }
        const result = await validatePartnerDestination({
          transactionType: "WALLET_TO_MNO",
          phoneNumber: mobileMoneyPhone.trim(),
          network: mobileMoneyNetwork.trim(),
        });
        const name =
          result?.beneficiary?.name ||
          result?.validationResult?.data?.name ||
          "Mobile number validated";
        setMobileMoneyRecipientName(name);
        setValidationMessage(`Validated: ${name}`);
        setIsDestinationValidated(true);
        return;
      }
      if (!destinationWalletId.trim()) {
        throw new Error("Enter wallet identifier before lookup.");
      }
      const looksValid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          destinationWalletId.trim(),
        ) || /^[A-Z]{3,5}\d{4,}$/.test(destinationWalletId.trim());
      if (!looksValid) {
        throw new Error("Wallet identifier format is invalid.");
      }
      setValidationMessage("Wallet identifier format validated.");
      setIsDestinationValidated(true);
    } catch (err) {
      setIsDestinationValidated(false);
      setValidationMessage(err instanceof Error ? err.message : "Lookup failed.");
    } finally {
      setValidationBusy(false);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const amt = Number(amount);
    if (!institutionId || !Number.isFinite(amt) || amt <= 0) {
      setFormError("Please select SACCO and enter a valid amount.");
      return;
    }
    if (payoutMethod === "RUKAPAY_WALLET" && !destinationWalletId.trim()) {
      setFormError("Destination wallet ID is required.");
      return;
    }
    if (payoutMethod === "MOBILE_MONEY" && (!mobileMoneyPhone.trim() || !mobileMoneyNetwork.trim())) {
      setFormError("Phone number and network are required for mobile money.");
      return;
    }
    if (payoutMethod === "BANK_TRANSFER" && (!selectedBankCode || !bankAccountNumber.trim())) {
      setFormError("Please select a bank and account number.");
      return;
    }
    if (!isDestinationValidated) {
      setFormError("Please lookup and validate the destination before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      const bank = LIQUIDATION_BANK_OPTIONS.find((b) => b.code === selectedBankCode);
      const res = await createPartnerLiquidationRequest({
        institutionId,
        amount: amt,
        currency: "UGX",
        reason: reason.trim() || undefined,
        manualSettlementNote: manualSettlementNote.trim() || undefined,
        payoutMethod,
        destinationWalletId: destinationWalletId.trim() || undefined,
        mobileMoneyPhone: mobileMoneyPhone.trim() || undefined,
        mobileMoneyNetwork: mobileMoneyNetwork.trim() || undefined,
        mobileMoneyRecipientName: mobileMoneyRecipientName.trim() || undefined,
        bankName: bank?.name,
        bankAccountNumber: bankAccountNumber.trim() || undefined,
        bankAccountName: bankAccountName.trim() || undefined,
      });
      setFeedback(res?.message || "Liquidation request submitted.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not submit request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={`${ipc.card} ${ipc.cardPad}`}>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">New liquidation request</h2>
        <Link href="/dashboard/liquidation" className={`${ipc.btnSecondary} no-underline`}>Back</Link>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        {formError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
        {feedback && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{feedback}</p>}
        <label className="block text-sm">
          <span className={ipc.formLabel}>SACCO</span>
          <select value={institutionId} onChange={(e) => setInstitutionId(e.target.value)} className={ipc.input} disabled={loading} required>
            <option value="">Select SACCO</option>
            {saccos.map((s) => <option key={String(s.id)} value={String(s.id)}>{String(s.code || "")} — {String(s.name || "")}</option>)}
          </select>
        </label>
        {settlementPreview && (
          <p className="text-sm text-slate-600">
            Settlement wallet available: <span className="font-semibold text-slate-900">{formatMoney(settlementPreview.balance, settlementPreview.currency)}</span>
          </p>
        )}
        <label className="block text-sm">
          <span className={ipc.formLabel}>Amount (UGX)</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} className={ipc.input} required />
        </label>
        <label className="block text-sm">
          <span className={ipc.formLabel}>Liquidation method</span>
          <select value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value as LiquidationMethod)} className={ipc.input}>
            <option value="RUKAPAY_WALLET">RukaPay Wallet</option>
            <option value="MOBILE_MONEY">Mobile Money</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </select>
        </label>
        {payoutMethod === "RUKAPAY_WALLET" && <input value={destinationWalletId} onChange={(e) => setDestinationWalletId(e.target.value)} placeholder="Destination wallet ID" className={ipc.input} />}
        {payoutMethod === "MOBILE_MONEY" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={mobileMoneyPhone} onChange={(e) => setMobileMoneyPhone(e.target.value)} placeholder="Phone number" className={ipc.input} />
            <select value={mobileMoneyNetwork} onChange={(e) => setMobileMoneyNetwork(e.target.value)} className={ipc.input}>
              <option value="">Select network</option>
              <option value="MTN">MTN</option>
              <option value="Airtel">Airtel</option>
            </select>
            <input
              value={mobileMoneyRecipientName}
              onChange={(e) => setMobileMoneyRecipientName(e.target.value)}
              placeholder="Recipient name (filled after lookup)"
              className={`${ipc.input} sm:col-span-2`}
            />
          </div>
        )}
        {payoutMethod === "BANK_TRANSFER" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={selectedBankCode} onChange={(e) => setSelectedBankCode(e.target.value)} className={ipc.input}>
              <option value="">Select bank</option>
              {LIQUIDATION_BANK_OPTIONS.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
            </select>
            <input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} placeholder="Account number" className={ipc.input} />
            <input value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} placeholder="Account name (optional)" className={`${ipc.input} sm:col-span-2`} />
          </div>
        )}
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" className={ipc.input} rows={2} />
        <textarea value={manualSettlementNote} onChange={(e) => setManualSettlementNote(e.target.value)} placeholder="Manual settlement note (optional)" className={ipc.input} rows={3} />
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => void runDestinationLookup()} disabled={validationBusy} className={ipc.btnSecondary}>
            {validationBusy ? "Looking up..." : "Lookup destination"}
          </button>
          {validationMessage && (
            <span className={`text-sm ${isDestinationValidated ? "text-emerald-700" : "text-amber-700"}`}>
              {validationMessage}
            </span>
          )}
        </div>
        <button type="submit" disabled={submitting} className={ipc.btnPrimary}>{submitting ? "Submitting..." : "Submit liquidation request"}</button>
      </form>
    </section>
  );
}
