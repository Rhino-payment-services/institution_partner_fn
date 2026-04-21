"use client";

import { ChartTransactionVolume } from "@/components/insights-charts/chart-transaction-volume";
import { InsightsChartChrome } from "@/components/insights-charts/insights-chart-chrome";
import { InsightsFiltersPanel } from "@/components/insights-charts/insights-filters-panel";
import { usePartnerInsightsData } from "@/hooks/use-partner-insights-data";
import { ipc } from "@/lib/dashboard-ui";

export default function TransactionVolumeChartPage() {
  const data = usePartnerInsightsData();

  return (
    <div className={ipc.pageStack}>
      <InsightsChartChrome
        data={data}
        kicker="Live charts"
        title="Transaction volume & count"
        description="Recharts area + dual-axis line — absolute volume and transaction count over time. Uses the same filters as the main Insights hub."
      />
      <InsightsFiltersPanel data={data} />
      {data.error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {data.error}
        </p>
      )}
      <ChartTransactionVolume loading={data.loading} dailyTx={data.dailyTx} />
    </div>
  );
}
