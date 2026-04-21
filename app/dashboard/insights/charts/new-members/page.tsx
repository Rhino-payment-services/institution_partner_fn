"use client";

import { ChartNewMembers } from "@/components/insights-charts/chart-new-members";
import { InsightsChartChrome } from "@/components/insights-charts/insights-chart-chrome";
import { InsightsFiltersPanel } from "@/components/insights-charts/insights-filters-panel";
import { usePartnerInsightsData } from "@/hooks/use-partner-insights-data";
import { ipc } from "@/lib/dashboard-ui";

export default function NewMembersChartPage() {
  const data = usePartnerInsightsData();

  return (
    <div className={ipc.pageStack}>
      <InsightsChartChrome
        data={data}
        kicker="Live charts"
        title="New members by day"
        description="Area trend for member creations with timestamps. Narrow the date range or SACCO filter as needed."
      />
      <InsightsFiltersPanel data={data} />
      {data.error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {data.error}
        </p>
      )}
      <ChartNewMembers loading={data.loading} dailyMembers={data.dailyMembers} />
    </div>
  );
}
