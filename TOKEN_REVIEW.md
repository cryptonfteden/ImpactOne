# Token Review — Phase X12B (Re-Audit)

**Scope:** `frontend/src/styles/tokens.css` (v1.1.0) and `frontend/src/styles/theme.css`, checked against the prior REVISE verdict's three required fixes, plus independent recomputation of every contrast claim — not a re-read of the completion report's own math.

---

## 1. Primitive/semantic split — fixed and structurally sound

`tokens.css` now has exactly the two-layer architecture the prior review required:

- **Primitive layer** (`--nova-primitive-ink-950` through `-400`, `--nova-primitive-paper-*`, `--nova-primitive-blue-*`, etc.) — raw, theme-independent, named after palette position, and explicitly commented as "never referenced directly by components."
- **Semantic layer** (`--nova-surface-base/1/2/3`, `--nova-color-text-primary/secondary/tertiary`, `--nova-color-brand-signal`, etc.) — each one a `var()` reference to a primitive, and it is this layer alone that `theme.css` re-points per `data-theme`, and the layer the header comment explicitly designates as "the only layer components should ever reference."

This is verified structurally sound, not just well-intentioned: `theme.css`'s `[data-theme="light"]` block redefines `--nova-surface-base` to `#ffffff` and `--nova-color-brand-signal` to `#1660c7` — entirely different literal values from the dark defaults — while never touching the primitive layer at all. A component referencing `var(--nova-color-brand-signal)` genuinely repaints correctly across all three themes with zero of its own code changed. This directly resolves the prior finding that a flat, scale-named token layer would structurally block theme-swapping.

---

## 2. The computed WCAG contrast failure — fixed, independently re-verified

The prior review computed real WCAG relative-luminance contrast ratios (not eyeballed) and found `color.text.tertiary` (`#6B7488`) failed 4.5:1 against every real dark surface. This review recomputed the **new** value (`#8894aa`, now `--nova-primitive-slate-400` → `--nova-color-text-tertiary`) against the same three surfaces, independently, using the identical WCAG 2.1 relative-luminance formula:

| Background | Hex | Old value (`#6B7488`) contrast | New value (`#8894aa`) contrast | AA (4.5:1) |
|---|---|---|---|---|
| `space-900` | `#0A0E16` | 4.12 : 1 ❌ | **6.32 : 1** | ✅ |
| `surface-800` | `#11151F` | 3.89 : 1 ❌ | **5.97 : 1** | ✅ |
| `surface-700` (worst case) | `#1A2030` | 3.46 : 1 ❌ | **5.31 : 1** | ✅ |

All three independently recomputed values match `DESIGN_TOKENS.md`'s own claimed numbers (5.31:1 worst case) exactly — this was verified by hand, not assumed. The fix is also now backed by a real, reusable, tested tool: `frontend/src/utils/contrast.js` (`relativeLuminance`/`contrastRatio`/`meetsWcagAA`) plus `contrast.test.js`, which contains a dedicated test asserting the **old** value still fails and the **new** value now passes — meaning a future regression back to the old value (or an equally bad one) would be caught by the test suite, not just by a future manual audit. This directly closes the prior finding that "no tooling exists anywhere in this codebase to enforce contrast."

The light-theme brand-signal re-lightening claim was also independently recomputed: the shipped `#6fb6ff` accent on white computes to **2.14:1** (fails badly, confirmed), and the new light-mode value `#1660c7` computes to **5.94:1** (passes, confirmed) — both match the document's own stated numbers.

---

## 3. Brand accent reconciliation — fixed and verified against the real, unmodified codebase

The prior finding: NOVA's originally-proposed Signal Blue (`#3B82F6`) was a fourth, unreconciled accent-blue value against three already-agreeing real ones. Verified directly: `tokens.css`'s `--nova-primitive-blue-300` is now `#6fb6ff`, with an explicit code comment ("= shipped `--accent` / `--h3-accent` / `theme.js` accent") recording the decision. Cross-checked against the real, still-unmodified `frontend/src/styles.css` (`--accent: #6fb6ff`, `--h3-accent: #6fb6ff`) and `frontend/src/context/theme.js` (`accent: "#6fb6ff"`) — all three real, shipped values are confirmed unchanged and now correctly cited rather than ignored. This is exactly the "deliberate decision, recorded, not a silent change" the prior review required.

---

## 4. Light-mode values — no longer missing

The prior finding: §4 of `NOVA_DESIGN_BIBLE.md` claimed light mode was "fully-designed" while §16's token table had zero light-mode values — a direct contradiction. Verified fixed: `theme.css`'s `[data-theme="light"]` block has a real, populated value for every semantic token category (surfaces, borders, brand, semantic state, text, elevation, glow) — not a partial or placeholder set. Every light-mode text/brand color checked above passes real, computed AA contrast against its real light surface.

---

## 5. Amber alias — fixed

The prior finding: `accent-amber` and `semantic.warning` were the same hex with no reachable non-semantic alias. Verified fixed: `--nova-color-brand-amber` now exists as `tokens.css`'s own token, independent of `--nova-color-warning` (same underlying primitive value today, per the comment, but independently overridable per theme later — exactly the flexibility the prior finding asked for).

---

## 6. Governance — fixed, and already exercised once for real

The prior finding: no versioning or change-governance existed for the tokens. Verified fixed, and not just in principle: `tokens.css`'s header comment carries a real schema version (`1.1.0`, up from an implied `1.0.0` for the Bible's original, unreviewed table) with a dated, itemized changelog explaining exactly what changed and why, cross-referencing the specific prior review findings each item closes. `DESIGN_TOKENS.md` states the ongoing process explicitly (bump version, add a changelog entry, update the doc table) — this is a real, if lightweight, governance loop, and this very v1.0.0→v1.1.0 transition is itself the first real, verifiable instance of the process working, not just a promise of a process.

---

## 7. Remaining, non-blocking items

1. **No stated AI-Thinking concurrency budget.** `motion.css`/`motion.js` define the signature looping animation and its reduced-motion fallback correctly, but nothing states a cap on how many `.nova-ai-thinking` surfaces may animate simultaneously. Low real-world risk today (nothing consumes these tokens/classes in a live screen yet), but worth a one-line addition before the first AI widget ships.
2. **`DESIGN_TOKENS.md`'s §4/§16 cross-reference risk, inherited from the Bible, is now much smaller in practice** — the real source of truth is unambiguously `tokens.css` itself (a single CSS file), not a markdown table duplicated across two document sections. The remaining duplication is only between `tokens.css` and `DESIGN_TOKENS.md`'s own prose restating some values for readability — a normal, low-risk doc/code relationship, not the structural doc-vs-doc drift risk found previously.

Neither item blocks approval; both are named directly rather than omitted.

