"use client";

import { ChartSaccoBalances } from "@/components/insights-charts/chart-sacco-balances";
import { InsightsChartChrome } from "@/components/insights-charts/insights-chart-chrome";
import { InsightsFiltersPanel } from "@/components/insights-charts/insights-filters-panel";
import { usePartnerInsightsData } from "@/hooks/use-partner-insights-data";
import { ipc } from "@/lib/dashboard-ui";

export default function SaccoBalancesChartPage() {
  const data = usePartnerInsightsData();

  return (
    <div className={ipc.pageStack}>
      <InsightsChartChrome
        data={data}
        kicker="Live charts"
        title="SACCO balances & members"
        description="Grouped bars comparing collected balance with member counts (scaled) per SACCO."
      />
      <InsightsFiltersPanel data={data} />
      {data.error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {data.error}
        </p>
      )}
      <ChartSaccoBalances loading={data.loading} balanceRows={data.balanceRows} />
    </div>
  );
}
