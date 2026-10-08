import Link from "next/link";

type Props = {
  status?: string | null;
  canEdit: boolean;
  canChangeStatus: boolean;
  viewHref?: string;
  onEdit: () => void;
  onMakeInactive: () => void;
  onMakeActive: () => void;
  onDelete: () => void;
  onRestore: () => void;
};

const linkClass = "text-sm font-medium text-[var(--rukapay-primary)] hover:underline";
const dangerClass = "text-sm font-medium text-red-700 hover:underline";

export function SaccoLifecycleActions({
  status,
  canEdit,
  canChangeStatus,
  viewHref,
  onEdit,
  onMakeInactive,
  onMakeActive,
  onDelete,
  onRestore,
}: Props) {
  const current = String(status || "ACTIVE").toUpperCase();
  const isDeleted = current === "DELETED";

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
      {viewHref ? (
        <Link href={viewHref} className={linkClass}>
          View
        </Link>
      ) : null}
      {canEdit && !isDeleted ? (
        <button type="button" onClick={onEdit} className={linkClass}>
          Edit
        </button>
      ) : null}
      {canChangeStatus && isDeleted ? (
        <button type="button" onClick={onRestore} className={linkClass}>
          Restore
        </button>
      ) : null}
      {canChangeStatus && current === "ACTIVE" ? (
        <button type="button" onClick={onMakeInactive} className={linkClass}>
          Make Inactive
        </button>
      ) : null}
      {canChangeStatus && current === "INACTIVE" ? (
        <button type="button" onClick={onMakeActive} className={linkClass}>
          Make Active
        </button>
      ) : null}
      {canChangeStatus && !isDeleted ? (
        <button type="button" onClick={onDelete} className={dangerClass}>
          Delete
        </button>
      ) : null}
    </div>
  );
}

export const DELETED_RECORD_COPY =
  "This marks the record as DELETED. It will be hidden from active lists, but all transactions, balances, accounts and history are preserved and remain linked to this ID.";
