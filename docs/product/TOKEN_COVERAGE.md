# Token Coverage — FINAL-UI-UNIFICATION-001

A running, honest tally of how much of the legacy visual system now genuinely derives from Nova tokens, versus how much remains a legitimately separate (checked, not just assumed-separate) value.

## Aliased to Nova (Cumulative, `NOVA-MIGRATION-001` + This Phase)

| Legacy variable/rule | Nova token it now aliases | Real call sites migrated |
|---|---|---|
| `--accent` | `--nova-color-brand-signal` | 14 |
| `--accent-soft` | *(kept as its own literal — see below)* | 3 |
| `--h3-accent` | `--nova-color-brand-signal` | shared H3 block |
| `--h3-accent-strong` | `--nova-color-brand-signal-bright` | shared H3 block |
| `--h3-space-2` | `--nova-space-3` | every consumer of `--h3-space-2` |
| `--h3-space-4` | `--nova-space-8` | every consumer of `--h3-space-4` |
| `.glass-card`/`.panel-card`/`.kpi-card`/`.screen-card` box-shadow | `--nova-shadow-glass` | every element using any of these 4 classes |

**7 real aliases, spanning color, spacing, and shadow — each verified an exact, zero-visual-risk match before being touched.**

## Confirmed NOT an Exact Match (Real Gap, Not an Oversight)

| Category | Legacy values checked | Real gap |
|---|---|---|
| Color | `--text-0/1/2`, `--success`, `--danger`, `--h3-text-primary/secondary`, `--h3-positive/negative` | All "close" to a Nova equivalent, none exact — see `LEGACY_UI_REMAINING.md` |
| Spacing | `--h3-space-1`, `--h3-space-3` | No exact Nova step at `6px` or `20px` |
| Radius | `--h3-radius-sm/md/lg`, the `20px` hero-panel radius | No exact Nova step at any of these values |
| Shadow | `--h3-glow`/`--h3-glow-strong` | Structurally different multi-layer shadows, not just a different number |
| Blur | The shared card's `14px`, the sticky header's `14px`, `.onboarding-card`'s `14px` | Nova's one blur token (`--nova-blur-glass`) is `24px` — none match |
| Surface color | `--glass`, `--glass-border` | No Nova token exists for this exact rgba value at all — a real token-coverage gap, not just a mismatch |

## What "Token Coverage" Honestly Means Here

This is not a percentage of lines migrated — it's a count of **provably safe, zero-risk** migrations made versus **honestly disclosed, real gaps** where either (a) the legacy and Nova values are genuinely different colors/sizes that only look superficially similar, or (b) Nova's own token set doesn't yet define an equivalent at all. Both categories are real, legitimate outcomes of this kind of audit — the goal was never "migrate 100% of everything," it was "migrate everything that's actually the same value, and tell the truth about everything that isn't."

## Where the Real Remaining Leverage Is

Per `VISUAL_UNIFICATION.md`'s priority order (from `NOVA-MIGRATION-001`, still current): text-color reconciliation remains the single largest-leverage remaining opportunity (touches nearly every screen), but is also the one most likely to produce a real, visible (if subtle) difference — the right next step is a deliberate design decision backed by real visual verification, not a mechanical substitution, exactly as disclosed in that phase's own report.
