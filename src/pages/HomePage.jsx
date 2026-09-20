import PageShell from "../components/PageShell";
import Hero from "../components/Hero";
import FeatureCards from "../components/FeatureCards";
import StrengthPanel from "../components/StrengthPanel";
import WhyPanel from "../components/WhyPanel";

export default function HomePage({ chrome, idea, onIdeaChange, onSubmitIdea, onViewAnalytics }) {
  return (
    <PageShell chrome={chrome}>
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_312px]">
        <Hero value={idea} onChange={onIdeaChange} onSubmit={onSubmitIdea} />
        <StrengthPanel onViewAnalytics={onViewAnalytics} />
        <FeatureCards />
        <WhyPanel />
      </div>
    </PageShell>
  );
}
