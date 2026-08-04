import ShowcaseSection from "../ShowcaseSection";
import { Stack } from "../../../components/layout";
import { Table, Heatmap, ChartPlaceholder, Tooltip, Legend, Badge, ProgressBar } from "../../../components/nova";

const ROWS = [
  { id: "1", symbol: "NVDA", action: "BUY", confidence: "82/100" },
  { id: "2", symbol: "AMD", action: "REDUCE", confidence: "54/100" },
];
const COLUMNS = [
  { key: "symbol", label: "Symbol" },
  { key: "action", label: "Action" },
  { key: "confidence", label: "Confidence", align: "end" },
];

export default function DataVisualizationSection() {
  return (
    <ShowcaseSection id="data-visualization" number={7} title="Data Visualization" description="Tables, heatmaps, chart placeholder, tooltips, legends, badges, progress, and confidence bars.">
      <Table columns={COLUMNS} rows={ROWS} />

      <Heatmap
        cells={[
          { label: "Tech", value: 8 },
          { label: "Energy", value: -4 },
          { label: "Health", value: 2 },
          { label: "Fin", value: -1 },
        ]}
      />

      <ChartPlaceholder label="NVDA — 1D candlestick" />

      <Stack direction="horizontal" gap={6} align="center">
        <Tooltip label="Real, computed tooltip content">
          <Badge tone="info">Hover me</Badge>
        </Tooltip>
        <Legend
          items={[
            { label: "Positive", color: "var(--nova-color-positive)" },
            { label: "Negative", color: "var(--nova-color-negative)" },
          ]}
        />
      </Stack>

      <ProgressBar value={72} label="Outcome completion" />
    </ShowcaseSection>
  );
}
