import { useState } from "react";
import { BarChart3, Calendar, ChevronDown } from "lucide-react";
import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import Tabs from "../components/Tabs";
import EmptyState from "../components/EmptyState";
import SummaryCards from "../components/analytics/SummaryCards";
import StrengthLineChart from "../components/analytics/StrengthLineChart";
import StrengthTrendCard from "../components/analytics/StrengthTrendCard";
import BreakdownDonut from "../components/analytics/BreakdownDonut";
import RecentPerformanceTable from "../components/analytics/RecentPerformanceTable";
import TopSuggestions from "../components/analytics/TopSuggestions";
import { ANALYTICS_TABS, DATE_RANGE } from "../data/analytics";
import { btn } from "../lib/ui";

export default function AnalyticsPage({ chrome, onViewAllPrompts }) {
  const [tab, setTab] = useState("overview");
  const activeTab = ANALYTICS_TABS.find(({ id }) => id === tab);

  return (
    <PageShell
      chrome={chrome}
      header={
        <PageHeader
          title="Analytics Dashboard"
          subtitle="Track, analyze and improve the quality of your prompts."
        />
      }
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-b border-line">
        <Tabs tabs={ANALYTICS_TABS} active={tab} onChange={setTab} bordered={false} />
        {/* Hand-off point: date range picker once analytics come from the API */}
        <button type="button" className={`${btn("secondary", "sm")} mb-2.5`}>
          <Calendar className="size-4 text-muted" strokeWidth={1.75} />
          {DATE_RANGE}
          <ChevronDown className="size-4 text-muted" />
        </button>
      </div>

      {tab === "overview" ? (
        <div className="space-y-5">
          <SummaryCards />
          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex min-w-0 flex-col gap-5">
              <StrengthLineChart />
              <RecentPerformanceTable onViewAll={onViewAllPrompts} />
            </div>
            <div className="flex min-w-0 flex-col gap-5">
              <StrengthTrendCard />
              <BreakdownDonut />
              <TopSuggestions onViewAll={() => console.log("View all suggestions")} />
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={BarChart3}
          title={activeTab.label}
          body={`${activeTab.label} reports will appear here once there is enough prompt activity for ${DATE_RANGE}.`}
        />
      )}
    </PageShell>
  );
}
