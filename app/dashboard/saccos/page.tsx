"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createPartnerSacco, listPartnerSaccos } from "@/lib/api";
import { ipc } from "@/lib/dashboard-ui";

type SaccoItem = {
  id: string;
  code?: string;
  name?: string;
  totalCollectedBalance?: number;
  balanceCurrency?: string;
  _count?: {
    members?: number;
  };
};

export default function SaccosPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [saccoCode, setSaccoCode] = useState("");
  const [saccoName, setSaccoName] = useState("");
  const [externalOrgId, setExternalOrgId] = useState("");
  const [saccos, setSaccos] = useState<SaccoItem[]>([]);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    void loadSaccos();
  }, []);

  async function loadSaccos() {
    setError("");
    try {
      const data = (await listPartnerSaccos()) as SaccoItem[];
      setSaccos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load SACCOs");
    }
  }

  async function handleCreateSacco(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback("");
    setError("");
    try {
      await createPartnerSacco({
        code: saccoCode.trim().toUpperCase(),
        name: saccoName.trim(),
        externalOrgId: externalOrgId.trim() || undefined,
      });
      setFeedback("SACCO created successfully.");
      setSaccoCode("");
      setSaccoName("");
      setExternalOrgId("");
      setIsCreateModalOpen(false);
      await loadSaccos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create SACCO");
    }
  }

  function formatMoney(value: number | undefined, currency?: string) {
    const amount = Number(value || 0);
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    const ccy = currency || "UGX";
    return `${ccy} ${safeAmount.toLocaleString()}`;
  }

  return (
    <div className={ipc.pageStack}>
      <section className={`${ipc.card} ${ipc.cardPad}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">SACCO management</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Create and manage SACCO institutions here.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setError("");
              setFeedback("");
              setIsCreateModalOpen(true);
            }}
            className={ipc.btnPrimary}
          >
            Create SACCO
          </button>
        </div>
      </section>

      {(error || feedback) && (
        <section className="space-y-2">
          {error && !isCreateModalOpen && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {feedback && (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {feedback}
            </p>
          )}
        </section>
      )}

      <section>
        <article className={`${ipc.card} ${ipc.cardPad}`}>
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">Existing SACCOs</h3>
          <div className={`mt-4 ${ipc.tableWrap}`}>
            <table className={ipc.table}>
              <thead>
                <tr className={ipc.theadRow}>
                  <th className={ipc.th}>Code</th>
                  <th className={ipc.th}>Name</th>
                  <th className={ipc.th}>Collected balance</th>
                  <th className={ipc.th}>Members</th>
                  <th className={`${ipc.th} text-right`}>Open</th>
                </tr>
              </thead>
              <tbody>
                {saccos.map((item) => (
                  <tr key={String(item.id)} className={ipc.tbodyRow}>
                    <td className={`${ipc.td} font-medium`}>{String(item.code || "—")}</td>
                    <td className={ipc.td}>{String(item.name || "—")}</td>
                    <td className={ipc.tdNum}>{formatMoney(item.totalCollectedBalance, item.balanceCurrency)}</td>
                    <td className={ipc.tdNum}>{Number(item?._count?.members || 0)}</td>
                    <td className={`${ipc.td} text-right`}>
                      <Link href={`/dashboard/saccos/${String(item.id)}`} className={ipc.link}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {isCreateModalOpen && (
        <div
          className={ipc.modalOverlay}
          role="presentation"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className={ipc.modalPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-sacco-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={ipc.modalHeader}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 id="create-sacco-title" className="text-lg font-semibold tracking-tight text-slate-900">
                    Create SACCO
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    Register a new savings and credit co-operative linked to your partner account. All fields
                    except external ID are required.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className={ipc.modalClose}
                >
                  Close
                </button>
              </div>
            </div>
            <form onSubmit={handleCreateSacco}>
              <div className={`${ipc.modalBody} space-y-5`}>
                {error && (
                  <div
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                    role="alert"
                  >
                    {error}
                  </div>
                )}
                <div>
                  <label htmlFor="sacco-code" className={ipc.formLabel}>
                    SACCO code
                  </label>
                  <input
                    id="sacco-code"
                    value={saccoCode}
                    onChange={(e) => setSaccoCode(e.target.value)}
                    placeholder="e.g. NAMASUBA"
                    autoComplete="off"
                    className={`${ipc.input} mt-2`}
                    required
                  />
                  <p className="mt-1.5 text-xs text-slate-500">Unique code, stored in uppercase.</p>
                </div>
                <div>
                  <label htmlFor="sacco-name" className={ipc.formLabel}>
                    SACCO name
                  </label>
                  <input
                    id="sacco-name"
                    value={saccoName}
                    onChange={(e) => setSaccoName(e.target.value)}
                    placeholder="Institution display name"
                    autoComplete="organization"
                    className={`${ipc.input} mt-2`}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="external-org" className={ipc.formLabel}>
                    External org ID <span className="font-normal normal-case text-slate-400">(optional)</span>
                  </label>
                  <input
                    id="external-org"
                    value={externalOrgId}
                    onChange={(e) => setExternalOrgId(e.target.value)}
                    placeholder="Link to your core banking or ERP reference"
                    className={`${ipc.input} mt-2`}
                  />
                </div>
              </div>
              <div className={ipc.modalFooter}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className={`${ipc.btnSecondary} w-full rounded-xl sm:w-auto`}
                >
                  Cancel
                </button>
                <button type="submit" className={`${ipc.btnPrimary} w-full rounded-xl px-6 sm:w-auto`}>
                  Create SACCO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
