import ShowcaseSection from "../ShowcaseSection";
import { Grid } from "../../../components/layout";
import { AiThinking, AiLearning, AiUpdated, AiMemory, AiConfidence, AiRecommendation, ConfidenceBadge, EvidenceBadge } from "../../../components/nova";

export default function AiComponentsSection() {
  return (
    <ShowcaseSection id="ai-components" number={6} title="AI Components" description="Thinking, Learning, Updated, Memory, Confidence, Recommendation — the product's single most differentiating visual language (NOVA_DESIGN_BIBLE.md §11).">
      <Grid>
        <div style={{ gridColumn: "span 4" }}>
          <AiThinking />
        </div>
        <div style={{ gridColumn: "span 4" }}>
          <AiLearning sampleSize={8} minimumSampleSize={15} />
        </div>
        <div style={{ gridColumn: "span 4" }}>
          <AiUpdated minutesAgo={12} />
        </div>
        <div style={{ gridColumn: "span 6" }}>
          <AiMemory headline="NVDA earnings beat, Q3 2025" relevanceConfidence={78} />
        </div>
        <div style={{ gridColumn: "span 6" }}>
          <AiConfidence score={91} />
        </div>
        <div style={{ gridColumn: "span 6" }}>
          <AiRecommendation symbol="AMD" action="REDUCE" confidence={54} />
        </div>
        <div style={{ gridColumn: "span 6" }}>
          <ConfidenceBadge score={38} />
          <div style={{ height: "var(--nova-space-2)" }} />
          <EvidenceBadge count={5} />
        </div>
      </Grid>
    </ShowcaseSection>
  );
}
