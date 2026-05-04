/**
 * Shared Institution Partner Console layout tokens (Tailwind class strings).
 * Keeps cards, tables, and actions aligned with RukaPay primary (#08163d).
 */
export const ipc = {
  pageBg: "bg-[#f8f9fb]",
  /** Vertical gap between major page blocks (cards, sections). */
  pageStack: "flex flex-col gap-6",
  card: "rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.04]",
  cardPad: "p-6",
  /** Metric tiles: neutral surface, no strong accent stripe */
  metricTile:
    "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.03]",
  metricIcon:
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-slate-50 text-slate-600",
  btnPrimary:
    "inline-flex cursor-pointer items-center justify-center rounded-lg bg-[var(--rukapay-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--rukapay-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#08163d]/35 disabled:pointer-events-none disabled:opacity-50",
  btnSecondary:
    "inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50",
  /** Modal shell — use with inner sections for header / body / footer */
  modalOverlay:
    "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm sm:p-6",
  modalPanel:
    "w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/20",
  modalHeader:
    "border-b border-slate-100 bg-slate-50/40 px-6 py-5 sm:px-8",
  modalBody: "px-6 py-6 sm:px-8",
  modalFooter: "flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/30 px-6 py-4 sm:flex-row sm:justify-end sm:px-8",
  formLabel: "text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500",
  input:
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm shadow-slate-900/[0.02] outline-none transition placeholder:text-slate-400 focus:border-[var(--rukapay-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--rukapay-primary)_18%,transparent)]",
  modalClose:
    "inline-flex shrink-0 items-center justify-center rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300",
  tableWrap: "overflow-x-auto rounded-lg border border-slate-200 bg-white",
  table: "min-w-full border-collapse text-sm",
  theadRow: "border-b border-slate-200 bg-slate-50",
  th: "whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700",
  tbodyRow: "border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/80",
  td: "px-4 py-3 align-middle text-slate-900",
  tdNum: "px-4 py-3 align-middle tabular-nums text-slate-900",
  link: "font-medium text-[var(--rukapay-primary)] underline-offset-2 hover:underline",
  /** Subtle status chips — use sparingly */
  badgeSuccess:
    "inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200/70",
  badgeWarning:
    "inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200/70",
  badgeNeutral:
    "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800 ring-1 ring-slate-200/80",
  statCard:
    "relative overflow-hidden rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-900/[0.04] before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:rounded-l-xl before:bg-[var(--rukapay-primary)]",
} as const;

/** Soft status chip for institution / member rows */
export function institutionStatusBadgeClass(status: string | undefined | null): string {
  const s = String(status || "").toUpperCase();
  if (s === "ACTIVE") return ipc.badgeSuccess;
  if (s.includes("PENDING")) return ipc.badgeWarning;
  return ipc.badgeNeutral;
}
