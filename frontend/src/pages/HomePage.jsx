import PageShell from "../components/PageShell";
import Hero from "../components/Hero";
import QuickAccess from "../components/home/QuickAccess";
import ContextProfilesRail from "../components/home/ContextProfilesRail";
import FeatureCards from "../components/FeatureCards";
import StrengthPanel from "../components/StrengthPanel";
import WhyPanel from "../components/WhyPanel";

export default function HomePage({
  chrome,
  idea,
  onIdeaChange,
  onSubmitIdea,
  onViewAnalytics,
  attachments,
  onAttachmentsChange,
  contextProfiles,
  onManageProfiles,
  prompts,
  onOpenPrompt,
  onUseTemplate,
  onNavigate,
}) {
  return (
    <PageShell chrome={chrome}>
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_312px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Hero
            value={idea}
            onChange={onIdeaChange}
            onSubmit={onSubmitIdea}
            attachments={attachments}
            onAttachmentsChange={onAttachmentsChange}
            profiles={contextProfiles.profiles}
            activeProfileId={contextProfiles.activeId}
            onProfileChange={contextProfiles.setActiveId}
            onManageProfiles={onManageProfiles}
          />
          <QuickAccess
            prompts={prompts}
            onOpenPrompt={onOpenPrompt}
            onUseTemplate={onUseTemplate}
            onOpenHistory={() => onNavigate("history")}
            onOpenTemplates={() => onNavigate("templates")}
          />
          <FeatureCards />
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <StrengthPanel onViewAnalytics={onViewAnalytics} />
          <ContextProfilesRail
            profiles={contextProfiles.profiles}
            activeId={contextProfiles.activeId}
            onSetActive={contextProfiles.setActiveId}
            onManage={onManageProfiles}
          />
          <WhyPanel />
        </div>
      </div>
    </PageShell>
  );
}
