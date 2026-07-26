// Phase X12B — NOVA Foundation, Part 4. An explicit, token-driven gap —
// for the rare case a Stack's uniform `gap` isn't the right shape (e.g.
// one deliberately larger gap between two specific children). Renders a
// single-axis block; never itself carries content or a background, so it
// can never be mistaken for a real layout container in devtools.
const SPACE_TOKEN = {
  1: "var(--nova-space-1)",
  2: "var(--nova-space-2)",
  3: "var(--nova-space-3)",
  4: "var(--nova-space-4)",
  6: "var(--nova-space-6)",
  8: "var(--nova-space-8)",
  12: "var(--nova-space-12)",
  16: "var(--nova-space-16)",
  24: "var(--nova-space-24)",
};

export default function Spacer({ size = 4, axis = "vertical" }) {
  const value = SPACE_TOKEN[size] || SPACE_TOKEN[4];
  return (
    <div
      aria-hidden="true"
      style={axis === "vertical" ? { blockSize: value, inlineSize: "100%" } : { inlineSize: value, blockSize: "1px" }}
    />
  );
}
