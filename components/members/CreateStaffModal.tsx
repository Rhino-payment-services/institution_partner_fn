"use client";

import { ipc } from "@/lib/dashboard-ui";

type StaffFormErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
};

type Props = {
  open: boolean;
  selectedSaccoName: string;
  selectedSaccoId: string;
  isSubmitting: boolean;
  modalError: string;
  formErrors: StaffFormErrors;
  staffFirstName: string;
  staffLastName: string;
  staffEmail: string;
  staffPhone: string;
  staffRole: "OWNER" | "ADMIN" | "OPERATOR" | "VIEWER";
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onFirstNameChange: (v: string) => void;
  onLastNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onRoleChange: (v: "OWNER" | "ADMIN" | "OPERATOR" | "VIEWER") => void;
};

export function CreateStaffModal({
  open,
  selectedSaccoName,
  selectedSaccoId,
  isSubmitting,
  modalError,
  formErrors,
  staffFirstName,
  staffLastName,
  staffEmail,
  staffPhone,
  staffRole,
  onClose,
  onSubmit,
  onFirstNameChange,
  onLastNameChange,
  onEmailChange,
  onPhoneChange,
  onRoleChange,
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
        aria-labelledby="create-staff-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={ipc.modalHeader}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 id="create-staff-title" className="text-lg font-semibold tracking-tight text-slate-900">
                Invite SACCO staff
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                Add staff for {selectedSaccoName || "selected SACCO"}. An invitation email will be sent
                so they can choose their own password.
              </p>
            </div>
            <button type="button" onClick={onClose} className={ipc.modalClose} disabled={isSubmitting}>
              Close
            </button>
          </div>
        </div>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className={`${ipc.modalBody} grid grid-cols-1 gap-4 md:grid-cols-2`}>
            {modalError ? (
              <p className={`${ipc.formAlert} md:col-span-2`} role="alert">
                {modalError}
              </p>
            ) : null}
            <div>
              <label htmlFor="staff-first-name" className={ipc.formLabel}>
                First name
              </label>
              <input
                id="staff-first-name"
                value={staffFirstName}
                onChange={(e) => onFirstNameChange(e.target.value)}
                className={`${ipc.input} mt-1.5 ${formErrors.firstName ? ipc.inputError : ""}`}
                aria-invalid={Boolean(formErrors.firstName)}
              />
              {formErrors.firstName ? <p className={ipc.fieldError}>{formErrors.firstName}</p> : null}
            </div>
            <div>
              <label htmlFor="staff-last-name" className={ipc.formLabel}>
                Last name
              </label>
              <input
                id="staff-last-name"
                value={staffLastName}
                onChange={(e) => onLastNameChange(e.target.value)}
                className={`${ipc.input} mt-1.5 ${formErrors.lastName ? ipc.inputError : ""}`}
                aria-invalid={Boolean(formErrors.lastName)}
              />
              {formErrors.lastName ? <p className={ipc.fieldError}>{formErrors.lastName}</p> : null}
            </div>
            <div>
              <label htmlFor="staff-email" className={ipc.formLabel}>
                Email
              </label>
              <input
                id="staff-email"
                value={staffEmail}
                onChange={(e) => onEmailChange(e.target.value)}
                type="email"
                className={`${ipc.input} mt-1.5 ${formErrors.email ? ipc.inputError : ""}`}
                aria-invalid={Boolean(formErrors.email)}
              />
              {formErrors.email ? <p className={ipc.fieldError}>{formErrors.email}</p> : null}
            </div>
            <div>
              <label htmlFor="staff-phone" className={ipc.formLabel}>
                Phone
              </label>
              <input
                id="staff-phone"
                value={staffPhone}
                onChange={(e) => onPhoneChange(e.target.value)}
                inputMode="tel"
                className={`${ipc.input} mt-1.5 ${formErrors.phone ? ipc.inputError : ""}`}
                aria-invalid={Boolean(formErrors.phone)}
              />
              {formErrors.phone ? <p className={ipc.fieldError}>{formErrors.phone}</p> : null}
            </div>
            <div className="md:col-span-2">
              <label htmlFor="staff-role" className={ipc.formLabel}>
                Role
              </label>
              <select
                id="staff-role"
                value={staffRole}
                onChange={(e) =>
                  onRoleChange(e.target.value as "OWNER" | "ADMIN" | "OPERATOR" | "VIEWER")
                }
                className={`${ipc.input} mt-1.5`}
              >
                <option value="OWNER">OWNER</option>
                <option value="ADMIN">ADMIN</option>
                <option value="OPERATOR">OPERATOR</option>
                <option value="VIEWER">VIEWER</option>
              </select>
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
              disabled={!selectedSaccoId || isSubmitting}
              className={`${ipc.btnPrimary} w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {isSubmitting ? "Sending invitation…" : "Send invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
