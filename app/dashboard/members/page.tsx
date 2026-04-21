"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createSaccoUser,
  downloadSaccoUsersTemplate,
  listPartnerSaccos,
  uploadSaccoUsersExcel,
} from "@/lib/api";
import { ipc } from "@/lib/dashboard-ui";

type SaccoItem = {
  id: string;
  code?: string;
  name?: string;
};

type PreviewRow = {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  accountNo?: string;
  clientId?: string;
  status?: string;
};

export default function MembersPage() {
  const [saccos, setSaccos] = useState<SaccoItem[]>([]);
  const [isCreateMemberModalOpen, setIsCreateMemberModalOpen] = useState(false);
  const [selectedSaccoId, setSelectedSaccoId] = useState("");
  const [memberFirstName, setMemberFirstName] = useState("");
  const [memberLastName, setMemberLastName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [memberAccountNo, setMemberAccountNo] = useState("");
  const [memberClientId, setMemberClientId] = useState("");
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [bulkRowErrors, setBulkRowErrors] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const selectedSacco = useMemo(
    () => saccos.find((item) => String(item.id) === selectedSaccoId) || null,
    [saccos, selectedSaccoId],
  );

  useEffect(() => {
    void loadSaccos();
  }, []);

  async function loadSaccos() {
    setError("");
    try {
      const data = (await listPartnerSaccos()) as SaccoItem[];
      setSaccos(data);
      if (data[0]?.id) {
        setSelectedSaccoId((prev) => prev || String(data[0].id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load SACCOs");
    }
  }

  async function handleCreateMember(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedSaccoId) {
      setError("Please select a SACCO first");
      return;
    }

    setError("");
    setFeedback("");
    try {
      await createSaccoUser(selectedSaccoId, {
        firstName: memberFirstName.trim(),
        lastName: memberLastName.trim(),
        phone: memberPhone.trim(),
        email: memberEmail.trim() || undefined,
        accountNo: memberAccountNo.trim() || undefined,
        clientId: memberClientId.trim() || undefined,
      });
      setFeedback("SACCO user created successfully.");
      setMemberFirstName("");
      setMemberLastName("");
      setMemberPhone("");
      setMemberEmail("");
      setMemberAccountNo("");
      setMemberClientId("");
      setIsCreateMemberModalOpen(false);
      await loadSaccos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create SACCO user");
    }
  }

  async function handleDownloadTemplate() {
    setError("");
    try {
      const blob = await downloadSaccoUsersTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "sacco-users-template.xlsx";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download template");
    }
  }

  async function handleBulkUpload() {
    if (!selectedSaccoId) {
      setError("Please select a SACCO first");
      return;
    }
    if (!bulkFile) {
      setError("Please choose an Excel file first");
      return;
    }
    setFeedback("");
    setError("");
    setBulkRowErrors([]);
    try {
      const result = await uploadSaccoUsersExcel(selectedSaccoId, bulkFile);
      setFeedback(
        `Bulk upload complete: ${result.successCount ?? 0} success, ${result.failCount ?? 0} failed.`,
      );
      const failures = Array.isArray(result?.results)
        ? result.results
            .filter((row: any) => !row?.success)
            .slice(0, 10)
            .map((row: any) => `Row ${row.index}: ${row.error || "Failed"}`)
        : [];
      setBulkRowErrors(failures);
      setBulkFile(null);
      setPreviewRows([]);
      setPreviewErrors([]);
      await loadSaccos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload users file");
    }
  }

  async function handleBulkFileChange(file: File | null) {
    setBulkFile(file);
    setPreviewRows([]);
    setPreviewErrors([]);
    setBulkRowErrors([]);
    if (!file) {
      return;
    }

    setIsParsingFile(true);
    setError("");
    setFeedback("");
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;

      if (!sheet) {
        setPreviewErrors(["No worksheet found in selected file."]);
        return;
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const parsedRows: PreviewRow[] = rows.map((row) => ({
        firstName: String(row.firstName ?? row.first_name ?? "").trim(),
        lastName: String(row.lastName ?? row.last_name ?? "").trim(),
        phone: String(row.phone ?? row.phoneNumber ?? row.phone_number ?? "").trim(),
        email: String(row.email ?? "").trim() || undefined,
        accountNo: String(row.accountNo ?? row.account_no ?? "").trim() || undefined,
        clientId: String(row.clientId ?? row.client_id ?? "").trim() || undefined,
        status: String(row.status ?? "ACTIVE").trim() || "ACTIVE",
      }));

      const validationErrors = parsedRows
        .map((row, index) => {
          const missingFields: string[] = [];
          if (!row.firstName) missingFields.push("firstName");
          if (!row.lastName) missingFields.push("lastName");
          if (!row.phone) missingFields.push("phone");
          return missingFields.length > 0
            ? `Row ${index + 2}: missing ${missingFields.join(", ")}`
            : null;
        })
        .filter((msg): msg is string => Boolean(msg))
        .slice(0, 20);

      setPreviewRows(parsedRows);
      setPreviewErrors(validationErrors);
    } catch {
      setPreviewErrors(["Failed to parse Excel file. Please use the template and try again."]);
    } finally {
      setIsParsingFile(false);
    }
  }

  return (
    <>
      <div className={ipc.pageStack}>
      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Member management</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Create SACCO users and bulk register local members by Excel.
            </p>
          </div>
          <button type="button" onClick={() => setIsCreateMemberModalOpen(true)} className={ipc.btnPrimary}>
            Create member
          </button>
        </div>
      </section>

      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <label className="mb-2 block text-sm font-semibold text-slate-800">Select SACCO</label>
        <select
          value={selectedSaccoId}
          onChange={(e) => setSelectedSaccoId(e.target.value)}
          className="w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[var(--rukapay-primary)] focus:ring-2 focus:ring-[#08163d]/15"
        >
          <option value="">Select SACCO</option>
          {saccos.map((item) => (
            <option key={String(item.id)} value={String(item.id)}>
              {String(item.code || "")} - {String(item.name || "")}
            </option>
          ))}
        </select>
      </section>

      {(error || feedback || previewErrors.length > 0 || bulkRowErrors.length > 0) && (
        <section className="space-y-2">
          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {feedback && (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {feedback}
            </p>
          )}
          {bulkRowErrors.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {bulkRowErrors.map((msg) => (
                <p key={msg}>{msg}</p>
              ))}
            </div>
          )}
          {previewErrors.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {previewErrors.map((msg) => (
                <p key={msg}>{msg}</p>
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <article className={`${ipc.card} ${ipc.cardPad}`}>
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">Bulk register by Excel</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Required columns: firstName, lastName, phone.
          </p>
          <div className="mt-4 space-y-3">
            <button type="button" onClick={handleDownloadTemplate} className={ipc.btnSecondary}>
              Download Excel template
            </button>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => void handleBulkFileChange(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-700"
            />
            {isParsingFile && <p className="text-xs text-slate-500">Reading Excel file...</p>}
            <button
              type="button"
              onClick={handleBulkUpload}
              disabled={!selectedSaccoId || !bulkFile || previewRows.length === 0 || previewErrors.length > 0}
              className={`${ipc.btnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Confirm and register
            </button>

            {bulkFile && !isParsingFile && (
              <p className="text-xs text-slate-500">
                Preview loaded: {previewRows.length} row(s).
              </p>
            )}

            {previewRows.length > 0 && (
              <div className={`mt-3 ${ipc.tableWrap}`}>
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">Excel preview</p>
                  <p className="text-xs text-slate-600">
                    Showing first {Math.min(previewRows.length, 20)} row(s) before registration.
                  </p>
                </div>
                <div className="max-h-72 overflow-auto">
                  <table className={ipc.table}>
                    <thead>
                      <tr className={ipc.theadRow}>
                        <th className={ipc.th}>#</th>
                        <th className={ipc.th}>First name</th>
                        <th className={ipc.th}>Last name</th>
                        <th className={ipc.th}>Phone</th>
                        <th className={ipc.th}>Email</th>
                        <th className={ipc.th}>Account no</th>
                        <th className={ipc.th}>Client ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.slice(0, 20).map((row, index) => (
                        <tr
                          key={`${row.firstName}-${row.lastName}-${row.phone}-${index}`}
                          className={ipc.tbodyRow}
                        >
                          <td className={ipc.tdNum}>{index + 1}</td>
                          <td className={ipc.td}>{row.firstName || "—"}</td>
                          <td className={ipc.td}>{row.lastName || "—"}</td>
                          <td className={ipc.td}>{row.phone || "—"}</td>
                          <td className={ipc.td}>{row.email || "—"}</td>
                          <td className={ipc.td}>{row.accountNo || "—"}</td>
                          <td className={ipc.td}>{row.clientId || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </article>
      </section>
      </div>

      {isCreateMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-[2px]">
          <div className={`w-full max-w-xl ${ipc.card} ${ipc.cardPad} shadow-xl`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Create Single User</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Add member to {selectedSacco ? String(selectedSacco.name) : "selected SACCO"}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateMemberModalOpen(false)}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>
            <form className="mt-4 space-y-3" onSubmit={handleCreateMember}>
              <input
                value={memberFirstName}
                onChange={(e) => setMemberFirstName(e.target.value)}
                placeholder="First Name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[var(--rukapay-primary)] focus:ring-2 focus:ring-[#08163d]/15"
                required
              />
              <input
                value={memberLastName}
                onChange={(e) => setMemberLastName(e.target.value)}
                placeholder="Last Name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[var(--rukapay-primary)] focus:ring-2 focus:ring-[#08163d]/15"
                required
              />
              <input
                value={memberPhone}
                onChange={(e) => setMemberPhone(e.target.value)}
                placeholder="Phone (required)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[var(--rukapay-primary)] focus:ring-2 focus:ring-[#08163d]/15"
                required
              />
              <input
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="Email (optional)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[var(--rukapay-primary)] focus:ring-2 focus:ring-[#08163d]/15"
              />
              <input
                value={memberAccountNo}
                onChange={(e) => setMemberAccountNo(e.target.value)}
                placeholder="Account No (optional)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[var(--rukapay-primary)] focus:ring-2 focus:ring-[#08163d]/15"
              />
              <input
                value={memberClientId}
                onChange={(e) => setMemberClientId(e.target.value)}
                placeholder="Client ID (optional)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[var(--rukapay-primary)] focus:ring-2 focus:ring-[#08163d]/15"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateMemberModalOpen(false)}
                  className={ipc.btnSecondary}
                >
                  Cancel
                </button>
                <button type="submit" className={ipc.btnPrimary}>
                  Create user
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
