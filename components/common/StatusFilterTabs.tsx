type StatusTab = "" | "ACTIVE" | "INACTIVE" | "DELETED";

type Props = {
  value: StatusTab;
  onChange: (value: StatusTab) => void;
};

const TABS: Array<{ id: StatusTab; label: string }> = [
  { id: "", label: "All" },
  { id: "ACTIVE", label: "Active" },
  { id: "INACTIVE", label: "Inactive" },
  { id: "DELETED", label: "Deleted" },
];

export function StatusFilterTabs({ value, onChange }: Props) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
      {TABS.map((tab) => {
        const selected = value === tab.id;
        return (
          <button
            key={tab.label}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              selected
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export type { StatusTab };
