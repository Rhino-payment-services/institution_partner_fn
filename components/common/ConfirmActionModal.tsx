import { ipc } from "@/lib/dashboard-ui";

type Props = {
  open: boolean;
  title: string;
  explanation: string;
  confirmLabel: string;
  danger?: boolean;
  requireReason?: boolean;
  reason: string;
  isSubmitting?: boolean;
  error?: string;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmActionModal({
  open,
  title,
  explanation,
  confirmLabel,
  danger,
  requireReason,
  reason,
  isSubmitting,
  error,
  onReasonChange,
  onClose,
  onConfirm,
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
        className={ipc.modalPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-action-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={ipc.modalHeader}>
          <div className="flex items-start justify-between gap-4">
            <h3 id="confirm-action-title" className="text-lg font-semibold tracking-tight text-slate-900">
              {title}
            </h3>
            <button type="button" onClick={onClose} className={ipc.modalClose} disabled={isSubmitting}>
              Close
            </button>
          </div>
        </div>
        <div className={`${ipc.modalBody} space-y-4`}>
          {error ? (
            <p className={ipc.formAlert} role="alert">
              {error}
            </p>
          ) : null}
          <p className="text-sm leading-relaxed text-slate-700">{explanation}</p>
          <div>
            <label htmlFor="confirm-reason" className={ipc.formLabel}>
              Reason {requireReason ? "" : <span className="font-normal text-slate-500">(optional)</span>}
            </label>
            <textarea
              id="confirm-reason"
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              rows={3}
              maxLength={500}
              className={`${ipc.input} mt-1.5`}
              placeholder="Add a short note for the audit trail"
            />
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
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting || (requireReason && !reason.trim())}
            className={`${
              danger
                ? "inline-flex cursor-pointer items-center justify-center rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800 disabled:pointer-events-none disabled:opacity-50"
                : ipc.btnPrimary
            } w-full sm:w-auto`}
          >
            {isSubmitting ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
