import { recordStatusBadgeClass, recordStatusLabel } from "@/lib/dashboard-ui";

type Props = {
  status?: string | null;
};

export function StatusBadge({ status }: Props) {
  return <span className={recordStatusBadgeClass(status)}>{recordStatusLabel(status)}</span>;
}
