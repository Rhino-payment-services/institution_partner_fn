import { ipc } from "@/lib/dashboard-ui";

type Props = {
  open: boolean;
  isSubmitting: boolean;
  error: string;
  code: string;
  externalOrgId: string;
  name: string;
  licenseNumber: string;
  onCodeChange: (value: string) => void;
  onExternalOrgIdChange: (value: string) => void;
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
  onCodeChange,
  onExternalOrgIdChange,
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
                Changing the SACCO code or external org ID affects staff login, USSD routing, and Nexen
                integration. Use a unique code and org ID for this partner.
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
              <label htmlFor="edit-sacco-code" className={ipc.formLabel}>
                SACCO code
              </label>
              <input
                id="edit-sacco-code"
                value={code}
                onChange={(e) => onCodeChange(e.target.value.replace(/\s+/g, "").toUpperCase())}
                className={`${ipc.input} mt-1.5`}
                minLength={2}
                maxLength={50}
                required
              />
            </div>
            <div>
              <label htmlFor="edit-sacco-org" className={ipc.formLabel}>
                External org ID
              </label>
              <input
                id="edit-sacco-org"
                value={externalOrgId}
                onChange={(e) => onExternalOrgIdChange(e.target.value.trimStart())}
                className={`${ipc.input} mt-1.5`}
                maxLength={100}
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
