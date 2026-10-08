import { ipc } from "@/lib/dashboard-ui";

type Props = {
  open: boolean;
  isSubmitting: boolean;
  error: string;
  code: string;
  externalOrgId: string;
  name: string;
  licenseNumber: string;
  onNameChange: (value: string) => void;
  onLicenseNumberChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

export function EditSaccoModal({
  open,
  isSubmitting,
  error,
  code,
  externalOrgId,
  name,
  licenseNumber,
  onNameChange,
  onLicenseNumberChange,
  onClose,
  onSubmit,
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
        aria-labelledby="edit-sacco-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={ipc.modalHeader}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 id="edit-sacco-title" className="text-lg font-semibold tracking-tight text-slate-900">
                Edit SACCO details
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                Code and external org ID cannot be changed because staff login and routing depend on them.
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
            <div>
              <label className={ipc.formLabel}>SACCO code</label>
              <input value={code || "—"} disabled className={`${ipc.input} mt-1.5 bg-slate-100 text-slate-600`} />
            </div>
            <div>
              <label className={ipc.formLabel}>External org ID</label>
              <input
                value={externalOrgId || "—"}
                disabled
                className={`${ipc.input} mt-1.5 bg-slate-100 text-slate-600`}
              />
            </div>
            <div>
              <label htmlFor="edit-sacco-name" className={ipc.formLabel}>
                SACCO name
              </label>
              <input
                id="edit-sacco-name"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                className={`${ipc.input} mt-1.5`}
                required
              />
            </div>
            <div>
              <label htmlFor="edit-sacco-license" className={ipc.formLabel}>
                License number <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <input
                id="edit-sacco-license"
                value={licenseNumber}
                onChange={(e) =>
                  onLicenseNumberChange(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())
                }
                maxLength={64}
                className={`${ipc.input} mt-1.5`}
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
            <button type="submit" className={`${ipc.btnPrimary} w-full sm:w-auto`} disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
