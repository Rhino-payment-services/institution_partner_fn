"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LiveBalanceRow } from "./types";

const PRIMARY = "#08163d";
const ACCENT = "#14b8a6";
const MUTED = "#94a3b8";

export function ChartSaccoBalances({ loading, balanceRows }: { loading: boolean; balanceRows: LiveBalanceRow[] }) {
  const barData = balanceRows.slice(0, 14).map((r) => ({
    name: r.code.length > 8 ? `${r.code.slice(0, 7)}…` : r.code,
    fullName: r.name,
    balance: Math.round(r.balance),
    members: r.members,
  }));

  const maxBal = Math.max(...barData.map((d) => d.balance), 1);
  const maxMembers = Math.max(...barData.map((x) => x.members), 1);
  const barCombo = barData.map((d) => ({
    ...d,
    membersScaled: maxBal > 0 ? Math.round((d.members / maxMembers) * maxBal * 0.85) : 0,
  }));

  return (
    <div className="min-h-[360px] rounded-xl border border-slate-100 bg-white p-4 sm:p-6">
      {loading ? (
        <p className="py-20 text-center text-sm text-slate-500">Loading chart data…</p>
      ) : barCombo.length === 0 ? (
        <p className="py-20 text-center text-sm text-slate-600">No SACCO rows for the current filters.</p>
      ) : (
        <div className="h-[min(440px,60vh)] w-full min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barCombo} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 10 }} axisLine={{ stroke: "#e2e8f0" }} />
              <YAxis
                tick={{ fill: MUTED, fontSize: 11 }}
                axisLine={false}
                tickFormatter={(v) =>
                  v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : `${v}`
                }
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 10px 40px -12px rgba(15,23,42,0.15)",
                }}
                formatter={(value: number | string, name: string, item: { payload?: { members?: number } }) => {
                  if (name === "balance") return [Number(value).toLocaleString(), "Balance (UGX)"];
                  if (name === "membersScaled") {
                    const m = item?.payload?.members ?? "—";
                    return [String(m), "Members"];
                  }
                  return [value, name];
                }}
                labelFormatter={(_label, payload) => {
                  const p = payload?.[0]?.payload as { fullName?: string; name?: string } | undefined;
                  return p?.fullName || p?.name || "";
                }}
              />
              <Legend />
              <Bar dataKey="balance" name="Balance" fill={PRIMARY} radius={[8, 8, 0, 0]} maxBarSize={32} />
              <Bar dataKey="membersScaled" name="Members (scaled)" fill={ACCENT} radius={[8, 8, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
