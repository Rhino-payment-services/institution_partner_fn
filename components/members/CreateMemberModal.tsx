"use client";

import { ipc } from "@/lib/dashboard-ui";
import type { MemberFormErrors } from "./member-form-types";

type SaccoOption = { id: string; code?: string; name?: string };

type Props = {
  open: boolean;
  isPartnerScope: boolean;
  saccos: SaccoOption[];
  selectedSaccoId: string;
  selectedSaccoName: string;
  isSubmitting: boolean;
  modalError: string;
  formErrors: MemberFormErrors;
  memberFirstName: string;
  memberLastName: string;
  memberDisplayName: string;
  memberPhone: string;
  memberNationalId: string;
  memberNationalIdNotApplicable: boolean;
  memberAccountNo: string;
  memberEmail: string;
  memberClientId: string;
  phoneMismatchOfficial: string | null;
  acknowledgePhoneNameMismatch: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onSaccoChange: (id: string) => void;
  onFirstNameChange: (v: string) => void;
  onLastNameChange: (v: string) => void;
  onDisplayNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onNationalIdChange: (v: string) => void;
  onNationalIdNotApplicableChange: (v: boolean) => void;
  onAccountNoChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onClientIdChange: (v: string) => void;
  onAcknowledgeMismatchChange: (v: boolean) => void;
};

export function CreateMemberModal({
  open,
  isPartnerScope,
  saccos,
  selectedSaccoId,
  selectedSaccoName,
  isSubmitting,
  modalError,
  formErrors,
  memberFirstName,
  memberLastName,
  memberDisplayName,
  memberPhone,
  memberNationalId,
  memberNationalIdNotApplicable,
  memberAccountNo,
  memberEmail,
  memberClientId,
  phoneMismatchOfficial,
  acknowledgePhoneNameMismatch,
  onClose,
  onSubmit,
  onSaccoChange,
  onFirstNameChange,
  onLastNameChange,
  onDisplayNameChange,
  onPhoneChange,
  onNationalIdChange,
  onNationalIdNotApplicableChange,
  onAccountNoChange,
  onEmailChange,
  onClientIdChange,
  onAcknowledgeMismatchChange,
}: Props) {
  if (!open) return null;

  return (
    <div
      className={ipc.modalOverlay}
      role="presentation"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        className={ipc.modalPanelLg}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-member-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={ipc.modalHeader}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 id="create-member-title" className="text-lg font-semibold tracking-tight text-slate-900">
                Create SACCO member
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                Add member to {selectedSaccoName || "selected SACCO"}. Legal names verify identity;
                display name is shown on Nexen.
              </p>
            </div>
            <button type="button" onClick={onClose} className={ipc.modalClose} disabled={isSubmitting}>
              Close
            </button>
          </div>
        </div>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className={`${ipc.modalBody} space-y-4`}>
            {modalError ? (
              <p className={ipc.formAlert} role="alert">
                {modalError}
              </p>
            ) : null}
            {isPartnerScope ? (
              <div>
                <label htmlFor="member-sacco" className={ipc.formLabel}>
                  SACCO
                </label>
                <select
                  id="member-sacco"
                  value={selectedSaccoId}
                  onChange={(e) => onSaccoChange(e.target.value)}
                  className={`${ipc.input} mt-1.5 ${formErrors.sacco ? ipc.inputError : ""}`}
                  aria-invalid={Boolean(formErrors.sacco)}
                >
                  <option value="">Select SACCO</option>
                  {saccos.map((item) => (
                    <option key={String(item.id)} value={String(item.id)}>
                      {String(item.code || "")} - {String(item.name || "")}
                    </option>
                  ))}
                </select>
                {formErrors.sacco ? <p className={ipc.fieldError}>{formErrors.sacco}</p> : null}
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="member-first-name" className={ipc.formLabel}>
                  Legal first name
                </label>
                <input
                  id="member-first-name"
                  value={memberFirstName}
                  onChange={(e) => onFirstNameChange(e.target.value)}
                  className={`${ipc.input} mt-1.5 ${formErrors.firstName ? ipc.inputError : ""}`}
                  aria-invalid={Boolean(formErrors.firstName)}
                />
                {formErrors.firstName ? <p className={ipc.fieldError}>{formErrors.firstName}</p> : null}
              </div>
              <div>
                <label htmlFor="member-last-name" className={ipc.formLabel}>
                  Legal last name
                </label>
                <input
                  id="member-last-name"
                  value={memberLastName}
                  onChange={(e) => onLastNameChange(e.target.value)}
                  className={`${ipc.input} mt-1.5 ${formErrors.lastName ? ipc.inputError : ""}`}
                  aria-invalid={Boolean(formErrors.lastName)}
                />
                {formErrors.lastName ? <p className={ipc.fieldError}>{formErrors.lastName}</p> : null}
              </div>
            </div>
            <div>
              <label htmlFor="member-display-name" className={ipc.formLabel}>
                Display name
              </label>
              <input
                id="member-display-name"
                value={memberDisplayName}
                onChange={(e) => onDisplayNameChange(e.target.value)}
                placeholder="Name shown on Nexen (optional)"
                className={`${ipc.input} mt-1.5`}
              />
              <p className={ipc.formHint}>Public-facing name; leave blank to use legal name.</p>
            </div>
            <div>
              <label htmlFor="member-phone" className={ipc.formLabel}>
                Phone
              </label>
              <input
                id="member-phone"
                value={memberPhone}
                onChange={(e) => onPhoneChange(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
                className={`${ipc.input} mt-1.5 ${formErrors.phone ? ipc.inputError : ""}`}
                aria-invalid={Boolean(formErrors.phone)}
              />
              {formErrors.phone ? <p className={ipc.fieldError}>{formErrors.phone}</p> : null}
            </div>
            {phoneMismatchOfficial ? (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={acknowledgePhoneNameMismatch}
                  onChange={(e) => onAcknowledgeMismatchChange(e.target.checked)}
                />
                <span>
                  I have verified this member&apos;s identity manually and understand the legal names may
                  differ from the mobile money account holder ({phoneMismatchOfficial}).
                </span>
              </label>
            ) : null}
            <div>
              <label htmlFor="member-national-id" className={ipc.formLabel}>
                National ID / NIN
              </label>
              <input
                id="member-national-id"
                value={memberNationalId}
                onChange={(e) => onNationalIdChange(e.target.value)}
                disabled={memberNationalIdNotApplicable}
                placeholder={memberNationalIdNotApplicable ? "Not applicable" : undefined}
                className={`${ipc.input} mt-1.5 ${formErrors.nationalId ? ipc.inputError : ""} disabled:bg-slate-100 disabled:text-slate-500`}
                aria-invalid={Boolean(formErrors.nationalId)}
              />
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={memberNationalIdNotApplicable}
                  onChange={(e) => onNationalIdNotApplicableChange(e.target.checked)}
                />
                NIN not available / not applicable
              </label>
              {formErrors.nationalId ? <p className={ipc.fieldError}>{formErrors.nationalId}</p> : null}
            </div>
            <div>
              <label htmlFor="member-account-no" className={ipc.formLabel}>
                SACCO account number
              </label>
              <input
                id="member-account-no"
                value={memberAccountNo}
                onChange={(e) => onAccountNoChange(e.target.value)}
                autoComplete="off"
                className={`${ipc.input} mt-1.5 ${formErrors.accountNo ? ipc.inputError : ""}`}
                aria-invalid={Boolean(formErrors.accountNo)}
              />
              {formErrors.accountNo ? <p className={ipc.fieldError}>{formErrors.accountNo}</p> : null}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="member-email" className={ipc.formLabel}>
                  Email (optional)
                </label>
                <input
                  id="member-email"
                  type="email"
                  value={memberEmail}
                  onChange={(e) => onEmailChange(e.target.value)}
                  className={`${ipc.input} mt-1.5`}
                />
              </div>
              <div>
                <label htmlFor="member-client-id" className={ipc.formLabel}>
                  Client ID (optional)
                </label>
                <input
                  id="member-client-id"
                  value={memberClientId}
                  onChange={(e) => onClientIdChange(e.target.value)}
                  className={`${ipc.input} mt-1.5`}
                />
              </div>
            </div>
          </div>
          <div className={ipc.modalFooter}>
            <button
              type="button"
              onClick={onClose}
              className={`${ipc.btnSecondary} w-full sm:w-auto`}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`${ipc.btnPrimary} w-full sm:w-auto`}
              disabled={
                isSubmitting || (Boolean(phoneMismatchOfficial) && !acknowledgePhoneNameMismatch)
              }
            >
              {isSubmitting ? "Validating & creating…" : "Create member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
