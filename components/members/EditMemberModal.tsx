"use client";

import { ipc } from "@/lib/dashboard-ui";

export type SaccoCustomerMember = {
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
};

type Props = {
  open: boolean;
  member: SaccoCustomerMember | null;
  isSubmitting: boolean;
  error: string;
  displayName: string;
  email: string;
  accountNo: string;
  clientId: string;
  status: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onDisplayNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onAccountNoChange: (v: string) => void;
  onClientIdChange: (v: string) => void;
  onStatusChange: (v: string) => void;
};

export function EditMemberModal({
  open,
  member,
  isSubmitting,
  error,
  displayName,
  email,
  accountNo,
  clientId,
  status,
  onClose,
  onSubmit,
  onDisplayNameChange,
  onEmailChange,
  onAccountNoChange,
  onClientIdChange,
  onStatusChange,
}: Props) {
  if (!open || !member) return null;

  const first = member.user?.profile?.firstName || "";
  const last = member.user?.profile?.lastName || "";
  const nationalId = member.user?.profile?.nationalId;

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
        aria-labelledby="edit-member-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={ipc.modalHeader}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 id="edit-member-title" className="text-lg font-semibold tracking-tight text-slate-900">
                Edit SACCO member
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                Legal names and phone are tied to mobile money verification and cannot be changed here.
              </p>
            </div>
            <button type="button" onClick={onClose} className={ipc.modalClose} disabled={isSubmitting}>
              Close
            </button>
          </div>
        </div>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className={`${ipc.modalBody} space-y-4`}>
            {error ? (
              <p className={ipc.formAlert} role="alert">
                {error}
              </p>
            ) : null}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={ipc.formLabel}>Legal first name</label>
                <input value={first} disabled className={`${ipc.input} mt-1.5 bg-slate-100 text-slate-600`} />
              </div>
              <div>
                <label className={ipc.formLabel}>Legal last name</label>
                <input value={last} disabled className={`${ipc.input} mt-1.5 bg-slate-100 text-slate-600`} />
              </div>
            </div>
            <div>
              <label className={ipc.formLabel}>Phone</label>
              <input
                value={member.user?.phone || "—"}
                disabled
                className={`${ipc.input} mt-1.5 bg-slate-100 text-slate-600`}
              />
            </div>
            <div>
              <label className={ipc.formLabel}>National ID / NIN</label>
              <input
                value={nationalId || "Not applicable"}
                disabled
                className={`${ipc.input} mt-1.5 bg-slate-100 text-slate-600`}
              />
            </div>
            <div>
              <label htmlFor="edit-display-name" className={ipc.formLabel}>
                Display name
              </label>
              <input
                id="edit-display-name"
                value={displayName}
                onChange={(e) => onDisplayNameChange(e.target.value)}
                className={`${ipc.input} mt-1.5`}
              />
            </div>
            <div>
              <label htmlFor="edit-email" className={ipc.formLabel}>
                Email
              </label>
              <input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                className={`${ipc.input} mt-1.5`}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edit-account-no" className={ipc.formLabel}>
                  SACCO account number
                </label>
                <input
                  id="edit-account-no"
                  value={accountNo}
                  onChange={(e) => onAccountNoChange(e.target.value)}
                  className={`${ipc.input} mt-1.5`}
                />
              </div>
              <div>
                <label htmlFor="edit-client-id" className={ipc.formLabel}>
                  Client ID
                </label>
                <input
                  id="edit-client-id"
                  value={clientId}
                  onChange={(e) => onClientIdChange(e.target.value)}
                  className={`${ipc.input} mt-1.5`}
                />
              </div>
            </div>
            <div>
              <label htmlFor="edit-status" className={ipc.formLabel}>
                Status
              </label>
              <select
                id="edit-status"
                value={status}
                onChange={(e) => onStatusChange(e.target.value)}
                className={`${ipc.input} mt-1.5`}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
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
            <button type="submit" className={`${ipc.btnPrimary} w-full sm:w-auto`} disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
