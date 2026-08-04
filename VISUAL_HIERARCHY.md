# VISUAL_HIERARCHY.md — Typography, Spacing, Rhythm, Layout

**Phase:** CINEMATIC-EXPERIENCE-001. Companion to [CINEMATIC_GUIDELINES.md](CINEMATIC_GUIDELINES.md). Covers the mission's "Typography" and "Layout" focus areas together, since on the real Flagship Screen they are the same problem: 10 real panels sharing one visual system must resolve, at a glance, into a clear reading order — not 10 equally-loud widgets.

---

## Current state (real, in `flagshipScreen.css`/`workspace3d.css`)

- Panel content typography: `h3` at 16px/700 weight, body `p` at 13px/1.5 line-height, meta text at 12px, stat numbers at 22px/700, the Fear & Greed gauge at 32px/800 — a real, already-reasonable size scale, but with **no defined rhythm between panels**: each panel's internal spacing (`margin: 0 0 6px`/`8px`, `gap: 10px`/`8px`/`2px`) is set per-element rather than drawn from one shared spacing scale, so panel-to-panel density varies without any way to state or verify a version-controlled rule.
- Orbital node labels: 12px, no defined letter-spacing, no defined weight rule beyond "not otherwise specified."
- All 10 panels' identity colors (`panelConfig.js`) currently carry equal visual weight — nothing today distinguishes "the panel most likely to matter to this specific user right now" from the other 9 at a glance.

## The hierarchy problem this document solves

A control-room instrument panel is legible precisely because not everything is emphasized equally. Today's real flagship scene, correctly, avoids clutter — but it also does not yet actively *rank* its own 10 panels visually. This document establishes a real, disclosed 3-tier hierarchy so the scene's own real data can drive what the eye sees first.

## Tier system (visual weight, not new data)

| Tier | Applies to | Visual treatment |
|---|---|---|
| **Primary** | Exactly one panel at a time — whichever real panel currently has the most urgent real content (an active AI Recommendation, a triggered Alert, a real Portfolio delta past a threshold) | Larger orbital-node radius (proposed +20% over baseline), full-brightness identity glow, label rendered in the elevated display typeface at 13px |
| **Secondary** | Panels with real, current content worth noting but not urgent (a non-empty Global Events/Breaking News list, an active Watchlist) | Baseline node size/glow, label at 12px |
| **Ambient** | Panels currently honestly empty or unremarkable (e.g., no active alerts) | Slightly dimmed node (per the existing real dimming mechanism already used for unfocused nodes), label at 11px, reduced opacity |

**Critically, this tiering must be a real, disclosed function of each panel's own already-fetched real data** (`useFlagshipData.js`'s per-panel `{status, data}`), never a fixed, permanent per-panel rank — directly continuing this whole engagement's "never fabricate visual weight, always derive it from real data" discipline (`3D_EXPERIENCE_GUIDELINES.md` §4, restated here as binding for the Flagship Screen specifically). A panel that is Primary today because of a real active alert must return to Ambient once that alert clears — the system reflects reality continuously, not a first-impression snapshot.

## Spacing rhythm (a real, shared scale — replacing today's ad hoc values)

A single 4px-based rhythm scale, applied consistently everywhere panel content is laid out, replacing the current mix of `6px`/`8px`/`10px`/`2px` ad hoc values:

| Token | Value | Use |
|---|---|---|
| `rhythm-xs` | 4px | Between a stat number and its unit/label |
| `rhythm-sm` | 8px | Between list items, between a heading and its first line of body text |
| `rhythm-md` | 16px | Between distinct content blocks within one panel (e.g., headline block → meta row) |
| `rhythm-lg` | 24px | Between a panel's header and its body |

This is a direct, disclosed continuation of the real, existing NOVA system's own strict 8px spacing scale (`DESIGN_TOKENS.md`'s "Spacing (strict 8px scale)") — the Flagship Screen's own panel content CSS should converge onto the same real discipline rather than maintaining a second, looser, undocumented scale.

## Reading-order flow across the ring

The mission's own real panel order (`FLAGSHIP_LAYOUT.md`'s clock-position table) already places AI Market Summary at the natural "3 o'clock, first thing your eye meets" position — correct, and unchanged here. Elevation: the **connecting-line brightness itself becomes a secondary reading-order cue** — a Primary-tier panel's line to the Earth should render slightly brighter/thicker than an Ambient-tier panel's line (both already real, already-rendered elements per `FLAGSHIP_LAYOUT.md`'s "Connecting Lines" section — this is a value change on an existing real element, not a new one), so the eye is drawn along the brightest line first without needing to consciously scan all 10 panels in sequence.

## Negative space and panel proportions

The real glass panel (`workspace3d.css`'s `.workspace3d-glass-panel`, `min(560px, 44vw)`) is already reasonably proportioned. Elevation: enforce a **consistent internal content-to-whitespace ratio** across all 10 panels' real content — no panel's real content (per `FlagshipPanelContent.jsx`) should ever visually fill more than ~70% of the panel's own height even when its real data is dense (e.g., Global Events' 8-item real list) — the remaining ~30% is deliberate breathing room, achieved via the `rhythm-lg` token above between sections, never by artificially truncating real data. A panel with genuinely more real content (an 8-item list) is allowed to be visually denser than a panel with less (a single gauge number) — proportional density is honest; forced uniform whitespace on a data-dense panel is not.

## Readability

- Body text (13px, `#cdd8f5` on the real dark glass background) already passes a comfortable contrast ratio against the existing panel fill — kept unchanged.
- Elevation: cap real list-item text (Global Events, Breaking News, AI Recommendations) at 2 lines with a real, honest truncation affordance (never silently cutting off a real headline with no indication) — currently unbounded, risking a single very long real headline dominating a panel's whole visual weight disproportionately to its actual tier.
