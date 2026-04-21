"use client";

import { useId } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LiveDailyMembers } from "./types";
import { chartShortDate, trimChartSeries } from "./chart-utils";

const ACCENT = "#14b8a6";
const MUTED = "#94a3b8";

export function ChartNewMembers({ loading, dailyMembers }: { loading: boolean; dailyMembers: LiveDailyMembers[] }) {
  const gid = useId().replace(/:/g, "");
  const gradId = `memGrad-${gid}`;

  const memData = trimChartSeries(dailyMembers).map((r) => ({
    ...r,
    label: chartShortDate(r.day),
    newMembers: r.count,
  }));

  return (
    <div className="min-h-[320px] rounded-xl border border-slate-100 bg-white p-4 sm:p-6">
      {loading ? (
        <p className="py-20 text-center text-sm text-slate-500">Loading chart data…</p>
      ) : memData.length === 0 ? (
        <p className="py-20 text-center text-sm text-slate-600">No dated member creations in this range.</p>
      ) : (
        <div className="h-[min(420px,55vh)] w-full min-h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={memData} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 11 }} axisLine={{ stroke: "#e2e8f0" }} />
              <YAxis tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 10px 40px -12px rgba(15,23,42,0.15)",
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="newMembers"
                name="New members"
                stroke={ACCENT}
                strokeWidth={2.5}
                fill={`url(#${gradId})`}
                dot={{ r: 2, fill: ACCENT }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
