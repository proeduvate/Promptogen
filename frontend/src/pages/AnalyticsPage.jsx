import { useState } from "react";
import { BarChart3, Calendar, ChevronDown, FlaskConical } from "lucide-react";
import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import Tabs from "../components/Tabs";
import EmptyState from "../components/EmptyState";
import SummaryCards from "../components/analytics/SummaryCards";
import StrengthLineChart from "../components/analytics/StrengthLineChart";
import BreakdownDonut from "../components/analytics/BreakdownDonut";
import RecentPerformanceTable from "../components/analytics/RecentPerformanceTable";
import TopSuggestions from "../components/analytics/TopSuggestions";
import QualityTrendsCard from "../components/analytics/QualityTrendsCard";
import InsightsCard from "../components/analytics/InsightsCard";
import { ANALYTICS_TABS, DATE_RANGE, SUMMARY_BASE, SUMMARY_META } from "../data/analytics";
import { PROMPTS } from "../data/library";
import useSettings from "../hooks/useSettings";
import { promptToText } from "../lib/promptText";
import { textOf } from "../lib/sections";
import { btn } from "../lib/ui";

const SEED_IDS = new Set(PROMPTS.map(({ id }) => id));
const sectionsOf = (prompt) => prompt.versions?.find(({ id }) => id === prompt.currentVersion)?.sections ?? prompt.versions?.[0]?.sections ?? [];
const average = (list) => Math.round(list.reduce((total, prompt) => total + prompt.score, 0) / list.length);

/* Overview numbers (spec §34): the period baseline plus this session's activity. */
function summaryCards(prompts, activity) {
  const added = prompts.filter((prompt) => !SEED_IDS.has(prompt.id) && !prompt.deleted);
  const session = activity.filter((entry) => !String(entry.id).startsWith("h"));
  const tests = session.filter((entry) => entry.type === "tested");
  const criteria = tests.map((entry) => entry.detail?.match(/(\d+) \/ (\d+)/)).filter(Boolean);
  const passed = SUMMARY_BASE.criteriaPassed + criteria.reduce((total, match) => total + Number(match[1]), 0);
  const run = SUMMARY_BASE.criteriaRun + criteria.reduce((total, match) => total + Number(match[2]), 0);
  const total = SUMMARY_BASE.total + added.length;
  const values = {
    total: total.toLocaleString("en-US"),
    tested: SUMMARY_BASE.tested + new Set(tests.map((entry) => entry.prompt)).size,
    quality: Math.round((SUMMARY_BASE.averageQuality * SUMMARY_BASE.total + added.reduce((sum, prompt) => sum + prompt.score, 0)) / total),
    success: `${Math.round((passed / run) * 100)}%`,
    reuse: SUMMARY_BASE.reuse + session.filter((entry) => /from template|Duplicated/i.test(entry.title)).length,
    time: `${(SUMMARY_BASE.hoursSaved + session.filter((entry) => entry.type === "created").length * 0.25).toFixed(1)} hrs`,
  };
  return SUMMARY_META.map((meta) => ({ ...meta, value: values[meta.id] }));
}

/* Patterns across the user's prompts and feedback (spec §36). */
function buildInsights(prompts, feedback) {
  const live = prompts.filter((prompt) => !prompt.deleted);
  const insights = [];
  const development = live.filter((prompt) => prompt.domain === "development" || prompt.folder === "development");
  const noEdgeCases = development.filter((prompt) => !/edge case/i.test(promptToText(sectionsOf(prompt))));
  if (noEdgeCases.length) {
    insights.push({
      id: "edge-cases",
      text: "Your development prompts frequently omit edge-case requirements. Consider asking about edge cases for Development prompts.",
      basis: `${noEdgeCases.length} of ${development.length} development prompts don't mention edge cases.`,
      setting: "askEdgeCases",
      action: "Ask about edge cases",
    });
  }
  const withFormat = live.filter((prompt) => /format/i.test(textOf(sectionsOf(prompt), "output", "preferences")));
  const withoutFormat = live.filter((prompt) => !withFormat.includes(prompt));
  insights.push({
    id: "output-format",
    text: "Your prompts often improve significantly after defining an output format. Would you like Promptogen to ask about output format by default?",
    basis: withFormat.length && withoutFormat.length ? `Prompts with a defined format average ${average(withFormat)} quality, against ${average(withoutFormat)} without.` : null,
    setting: "askOutputFormat",
    action: "Ask about output format",
  });
  const reasons = feedback.filter((entry) => !entry.helpful).flatMap((entry) => entry.reasons);
  const top = Object.entries(reasons.reduce((counts, reason) => ({ ...counts, [reason]: (counts[reason] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1])[0];
  const advice = {
    generic: "Prompts you marked “too generic” were missing audience and concrete numbers. Promptogen now suggests those first.",
    missing: "Prompts that missed information usually lacked context. Using a Context Profile fills most of it automatically.",
    verbose: "Responses felt too long. Try a Concise detail level, or Make More Concise in the optimizer.",
    format: "Responses came back in the wrong format. Defining the output format explicitly fixes most of these.",
    instructions: "Responses ignored instructions. Numbered requirements and a self-check constraint help.",
    incorrect: "Some results were incorrect. Asking the AI to state assumptions and not invent facts reduces this.",
  };
  if (top && advice[top[0]]) insights.push({ id: "feedback", text: advice[top[0]], basis: `From ${top[1]} piece${top[1] === 1 ? "" : "s"} of your feedback.` });
  return insights;
}

/* What successful prompts have in common (spec §54). The counts include
   the period's history. Hand-off point: the learning service. */
function learnedPreferences(feedback) {
  const helpful = feedback.filter((entry) => entry.helpful);
  const count = (re) => helpful.filter((entry) => re.test(textOf(entry.sections ?? [], "output", "preferences", "constraints"))).length;
  return [
    { label: "Structured output", setting: "outputStyle", value: "structured", evidence: `${6 + count(/structured|headings|sections/i)} successful prompts` },
    { label: "Short explanations", setting: "length", value: "concise", evidence: `${4 + count(/concise|short/i)} successful prompts` },
    { label: "Examples", setting: "preferExamples", value: true, evidence: `${5 + count(/example/i)} successful prompts` },
    { label: "Step-by-step instructions", setting: "preferSteps", value: true, evidence: `${3 + count(/step/i)} successful prompts` },
  ];
}

export default function AnalyticsPage({ chrome, prompts, activity, feedback, onViewAllPrompts, onNavigate }) {
  const [tab, setTab] = useState("overview");
  const [settings, updateSettings] = useSettings();
  const activeTab = ANALYTICS_TABS.find(({ id }) => id === tab);
  const preferences = learnedPreferences(feedback);
  const insightsCard = (
    <InsightsCard
      insights={buildInsights(prompts, feedback)}
      preferences={preferences}
      settings={settings}
      onEnable={(key) => updateSettings(key, true)}
      onApplyPreferences={() => preferences.forEach(({ setting, value }) => updateSettings(setting, value))}
      onOpenDefaults={() => onNavigate("settings", "defaults")}
    />
  );

  let body;
  if (tab === "overview") {
    body = (
      <div className="space-y-5">
        <SummaryCards cards={summaryCards(prompts, activity)} />
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-5">
            <StrengthLineChart />
            <QualityTrendsCard />
            <RecentPerformanceTable onViewAll={onViewAllPrompts} />
          </div>
          <div className="flex min-w-0 flex-col gap-5">
            {insightsCard}
            <BreakdownDonut />
            <TopSuggestions onViewAll={onViewAllPrompts} />
          </div>
        </div>
      </div>
    );
  } else if (tab === "performance") {
    body = (
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
        <QualityTrendsCard />
        <RecentPerformanceTable onViewAll={onViewAllPrompts} />
      </div>
    );
  } else if (tab === "usage") {
    body = <div className="max-w-[760px]">{insightsCard}</div>;
  } else {
    body = (
      <EmptyState icon={BarChart3} title={activeTab.label} body="Compare models side by side on the same prompt in Model Lab. Comparisons you run there will be summarised here.">
        <button type="button" onClick={() => onNavigate("model-lab")} className={btn("secondary", "sm")}>
          <FlaskConical className="size-4" />
          Open Model Lab
        </button>
      </EmptyState>
    );
  }

  return (
    <PageShell chrome={chrome} header={<PageHeader title="Analytics Dashboard" subtitle="Track, analyze and improve the quality of your prompts." />}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-b border-line">
        <Tabs tabs={ANALYTICS_TABS} active={tab} onChange={setTab} bordered={false} />
        {/* Hand-off point: date range picker once analytics come from the API */}
        <button type="button" className={`${btn("secondary", "sm")} mb-2.5`}>
          <Calendar className="size-4 text-muted" strokeWidth={1.75} />
          {DATE_RANGE}
          <ChevronDown className="size-4 text-muted" />
        </button>
      </div>
      {body}
    </PageShell>
  );
}
