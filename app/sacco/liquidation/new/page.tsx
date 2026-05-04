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
import { useAuth } from "@/lib/auth-context";
import { ipc } from "@/lib/dashboard-ui";
import { LIQUIDATION_BANK_OPTIONS } from "@/lib/liquidation-banks";

type SaccoSummary = {
  id: string;
  code?: string;
  name?: string;
  wallets?: Array<{ id?: string; walletType?: string; balance?: unknown; currency?: string }>;
};

function formatMoney(value: number | undefined, currency = "UGX") {
  const n = Number(value || 0);
  return `${currency} ${Number.isFinite(n) ? n.toLocaleString() : "0"}`;
}

export default function SaccoLiquidationNewPage() {
  const { user } = useAuth();
  const institutionId = user?.institution?.id ? String(user.institution.id) : "";
  const [sacco, setSacco] = useState<SaccoSummary | null>(null);
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
    if (!institutionId) return;
    void (async () => {
      try {
        const saccos = (await listPartnerSaccos()) as SaccoSummary[];
        const own = Array.isArray(saccos)
          ? saccos.find((item) => String(item.id) === institutionId) || null
          : null;
        setSacco(own);
      } catch {
        setFormError("Unable to load SACCO details.");
      }
    })();
  }, [institutionId]);

  const settlementPreview = useMemo(() => (sacco ? getSettlementWalletPreview(sacco) : null), [sacco]);

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
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return setFormError("Enter a valid amount.");
    if (payoutMethod === "RUKAPAY_WALLET" && !destinationWalletId.trim()) return setFormError("Enter destination wallet ID.");
    if (payoutMethod === "MOBILE_MONEY" && (!mobileMoneyPhone.trim() || !mobileMoneyNetwork.trim())) return setFormError("Phone and network are required.");
    if (payoutMethod === "BANK_TRANSFER" && (!selectedBankCode || !bankAccountNumber.trim())) return setFormError("Select a bank and enter account number.");
    if (!isDestinationValidated) return setFormError("Please lookup and validate destination first.");
    setFormError("");
    setSubmitting(true);
    try {
      const bank = LIQUIDATION_BANK_OPTIONS.find((b) => b.code === selectedBankCode);
      const res = await createPartnerLiquidationRequest({
        institutionId,
        amount: amt,
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
      setFormError(err instanceof Error ? err.message : "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={`${ipc.card} ${ipc.cardPad}`}>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">New liquidation request</h2>
        <Link href="/sacco/liquidation" className={`${ipc.btnSecondary} no-underline`}>Back</Link>
      </div>
      {settlementPreview && (
        <p className="mb-4 text-sm text-slate-600">
          Available settlement balance: <span className="font-semibold text-slate-900">{formatMoney(settlementPreview.balance, settlementPreview.currency)}</span>
        </p>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        {formError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
        {feedback && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{feedback}</p>}
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (UGX)" className={ipc.input} required />
        <select value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value as LiquidationMethod)} className={ipc.input}>
          <option value="RUKAPAY_WALLET">RukaPay Wallet</option>
          <option value="MOBILE_MONEY">Mobile Money</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
        </select>
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
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" className={ipc.input} />
        <textarea value={manualSettlementNote} onChange={(e) => setManualSettlementNote(e.target.value)} placeholder="Manual settlement note (optional)" rows={3} className={ipc.input} />
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
        <button type="submit" disabled={submitting} className={ipc.btnPrimary}>{submitting ? "Submitting..." : "Submit request"}</button>
      </form>
    </section>
  );
}
