import * as XLSX from "xlsx";
import type { ReportMember, ReportTransaction } from "./partner-reports";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportTransactionsCsv(rows: ReportTransaction[]) {
  const headers = [
    "Date",
    "SACCO code",
    "SACCO name",
    "Reference",
    "Type",
    "Status",
    "Amount",
    "Currency",
    "Member",
    "Description",
  ];
  const lines = [
    headers.join(","),
    ...rows.map((r) => {
      const name =
        [r.user?.profile?.firstName, r.user?.profile?.lastName].filter(Boolean).join(" ").trim() ||
        r.user?.email ||
        r.user?.phone ||
        "";
      const cells = [
        r.createdAt || "",
        r.saccoCode,
        r.saccoName,
        r.reference || "",
        r.type || "",
        r.status || "",
        String(r.amount ?? ""),
        r.currency || "",
        name.replace(/"/g, '""'),
        (r.description || "").replace(/"/g, '""'),
      ];
      return cells.map((c) => (typeof c === "string" && /[",\n]/.test(c) ? `"${c}"` : c)).join(",");
    }),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `partner-transactions-${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportTransactionsXlsx(rows: ReportTransaction[]) {
  const data = rows.map((r) => {
    const member =
      [r.user?.profile?.firstName, r.user?.profile?.lastName].filter(Boolean).join(" ").trim() ||
      r.user?.email ||
      r.user?.phone ||
      "";
    return {
      Date: r.createdAt || "",
      "SACCO code": r.saccoCode,
      "SACCO name": r.saccoName,
      Reference: r.reference || "",
      Type: r.type || "",
      Status: r.status || "",
      Amount: r.amount ?? "",
      Currency: r.currency || "",
      Member: member,
      Description: r.description || "",
    };
  });
  const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ Date: "" }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");
  XLSX.writeFile(wb, `partner-transactions-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportMembersCsv(rows: ReportMember[]) {
  const headers = ["Date added", "SACCO code", "SACCO name", "Name", "Phone", "Email", "Status"];
  const lines = [
    headers.join(","),
    ...rows.map((r) => {
      const name =
        [r.user?.profile?.firstName, r.user?.profile?.lastName].filter(Boolean).join(" ").trim() || "—";
      const cells = [
        r.createdAt || "",
        r.saccoCode,
        r.saccoName,
        name.replace(/"/g, '""'),
        r.user?.phone || "",
        r.user?.email || "",
        r.status || "",
      ];
      return cells.map((c) => (typeof c === "string" && /[",\n]/.test(c) ? `"${c}"` : c)).join(",");
    }),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `partner-members-${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportMembersXlsx(rows: ReportMember[]) {
  const data = rows.map((r) => {
    const name =
      [r.user?.profile?.firstName, r.user?.profile?.lastName].filter(Boolean).join(" ").trim() || "—";
    return {
      "Date added": r.createdAt || "",
      "SACCO code": r.saccoCode,
      "SACCO name": r.saccoName,
      Name: name,
      Phone: r.user?.phone || "",
      Email: r.user?.email || "",
      Status: r.status || "",
    };
  });
  const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ Name: "" }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Members");
  XLSX.writeFile(wb, `partner-members-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
