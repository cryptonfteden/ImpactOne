import ShowcaseSection from "../ShowcaseSection";
import { Grid } from "../../../components/layout";
import { Card, Badge, AiRecommendation } from "../../../components/nova";

export default function CardsSection() {
  return (
    <ShowcaseSection id="cards" number={5} title="Cards" description="Default, Glass, AI, Recommendation, News, KPI, Portfolio, Expandable, and Loading — all the same Panel primitive.">
      <Grid>
        <div style={{ gridColumn: "span 4" }}>
          <Card eyebrow="Default" title="Standard card">
            <p className="nova-text-sm">Elevation 1, the default surface for most content.</p>
          </Card>
        </div>
        <div style={{ gridColumn: "span 4" }}>
          <Card variant="glass" eyebrow="Glass" title="Overlay surface">
            <p className="nova-text-sm">Level 3 — opt-in only, used for drawers/dialogs.</p>
          </Card>
        </div>
        <div style={{ gridColumn: "span 4" }}>
          <Card variant="ai" eyebrow="AI" title="AI-authored content">
            <p className="nova-text-sm">Violet border marks this as AI-originated.</p>
          </Card>
        </div>
        <div style={{ gridColumn: "span 6" }}>
          <AiRecommendation symbol="NVDA" action="BUY" confidence={82} />
        </div>
        <div style={{ gridColumn: "span 6" }}>
          <Card eyebrow="News" meta="2h ago" title="Fed holds rates steady">
            <p className="nova-text-sm">Reuters — real, matched market event summary.</p>
          </Card>
        </div>
        <div style={{ gridColumn: "span 4" }}>
          <Card eyebrow="KPI">
            <span className="nova-text-numeric-hero">$128.4K</span>
            <Badge tone="positive">+2.4%</Badge>
          </Card>
        </div>
        <div style={{ gridColumn: "span 4" }}>
          <Card eyebrow="Portfolio" title="Total Value">
            <span className="nova-text-3xl nova-text-numeric">$100,000.00</span>
          </Card>
        </div>
        <div style={{ gridColumn: "span 4" }}>
          <Card eyebrow="Expandable" title="Reasoning" expandable>
            <p className="nova-text-sm">
              A long AI-generated explanation that gets truncated by default and expands on demand — this line is intentionally long enough to
              demonstrate the collapsed clipping behavior before the user taps &quot;Show more.&quot;
            </p>
          </Card>
        </div>
        <div style={{ gridColumn: "span 4" }}>
          <Card loading eyebrow="Loading" />
        </div>
      </Grid>
    </ShowcaseSection>
  );
}
