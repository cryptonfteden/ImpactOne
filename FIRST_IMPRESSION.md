# FIRST_IMPRESSION.md — The First 10 Seconds

**Phase:** CINEMATIC-EXPERIENCE-001. Companion to [CINEMATIC_GUIDELINES.md](CINEMATIC_GUIDELINES.md). A literal, timed storyboard of what happens between opening the real Flagship Screen and 10 seconds later, engineered against one goal: the mission's own emotional target — *"the user should feel they entered the control room of global financial intelligence."*

---

## Why this must be scripted precisely, not left to "it'll look cool"

A "wow" moment that happens by accident is not repeatable across devices, screenshots, or a product demo. Every beat below is tied to a real, already-existing element (`Earth.jsx`, `OrbitalNode.jsx`, `FlagshipEarthScene.jsx`, `MissionControlChain.jsx`) with a precise, disclosed trigger — nothing here invents a new component; it sequences and times real, existing ones (plus the small, named elevations from `PREMIUM_POLISH.md`) deliberately.

## The sequence

### 0.0s – 0.6s: Darkness with a single point of light
The scene mounts on the elevated void background (`CINEMATIC_GUIDELINES.md`'s wide gradient sweep) with nothing else visible yet except a single, small, growing point of light at the origin — the Earth about to resolve. This half-second of near-emptiness is deliberate: it is the single cheapest, highest-leverage "cinematic" technique available (a beat of restraint before reveal) and costs zero additional render complexity.

### 0.6s – 2.0s: The Earth resolves
The real Earth (`Earth.jsx`'s three stacked meshes) fades/scales in from the point of light — its own real, already-continuous rotation (`delta * 0.05`) is already running by the time it becomes visible, so it never reads as "starting up," only as "was already alive, now visible." The camera is not yet at `OVERVIEW_CAMERA` — per `CINEMATIC_GUIDELINES.md`'s scripted entrance move, it begins its own lerp toward the overview position during this same window, arriving gradually rather than already being in place.

### 2.0s – 4.5s: The panels arrive, one register at a time
The 10 real panels (`panelConfig.js`) do not all appear simultaneously. They resolve in **their own real mission order** (`FLAGSHIP_LAYOUT.md`'s index 0-9, AI Market Summary first), each with a small, staggered delay (proposed: 120ms between panels) — a real, disclosed sequencing rule, not randomized. Each panel's own real connecting line (`FLAGSHIP_LAYOUT.md`'s "Connecting Lines") draws in alongside it, from the Earth outward — visually reinforcing "these all belong to, and emanate from, one center."

### 4.5s – 6.0s: The camera settles, the scene breathes
By this point the camera has fully arrived at `OVERVIEW_CAMERA` and all 10 panels are visible and stable. This is the first genuinely still moment — deliberately held for at least a second with **no new motion introduced**, so the user has a real beat to take in the whole composition before anything asks for their attention again. This is the moment a static screenshot/press image should be captured from (directly reusable for `FLAGSHIP_VISUAL.md`'s App Store/press guidance).

### 6.0s – 8.5s: One real signal draws the eye
If — and only if — there is real, current data warranting it (a real active Alert, a real Portfolio delta past threshold, a real active AI Recommendation), the corresponding panel's Primary-tier treatment (per [VISUAL_HIERARCHY.md](VISUAL_HIERARCHY.md)) activates now: its node brightens, its connecting line sharpens, exactly as it will continue to do for as long as that real condition holds. **If no such real condition currently holds, nothing happens here** — a fabricated "something is always urgent" cue would be a real trust violation, directly the same category of error this whole engagement has repeatedly found and fixed elsewhere (Daily Feed's fabricated-explanation bug). An honestly calm first impression is correct when the real data is calm.

### 8.5s – 10.0s: Invitation, not instruction
No tooltip, no onboarding overlay, no "click a panel to begin" text appears during this window — the scene's own real affordances (glowing, slightly-pulsing nodes, per `OrbitalNode.jsx`'s existing hover/focus behavior) are the entire invitation. The mission's "wow" goal is undermined by a UI chrome element breaking the illusion in the first 10 seconds; any first-time guidance the product genuinely needs belongs after this window, not during it.

## What must NOT happen in this window

- No loading spinners visible during the entrance — `useFlagshipData.js`'s real `Promise.allSettled` fetches should be initiated as early as possible (ideally before or during the 0.0s-2.0s beats) so that by the time a panel visually resolves at its scripted moment, its real data (or an honest empty/error state) is already available to render — never a generic spinner replacing a scripted entrance beat.
- No panel is ever shown with fabricated placeholder content "to look fuller" during the entrance — an honestly sparse real panel (e.g., no real active Alerts) resolves exactly as sparse as its real data, at its scripted moment, same as any other panel.
- No sound is specified or assumed — this document describes a purely visual sequence; audio design (if ever pursued) is explicitly out of scope here.

## Measuring success

The concrete test for this document: a person unfamiliar with ImpactOne, shown the app for the first time with the sound off, should be able to say — unprompted, within these 10 seconds — some version of "this feels like a live command center," using only what actually renders. If the honest, real first-load conditions (an empty watchlist, no active alerts) ever make that feel closer to "empty diagram" than "control room," the fix is in the compositional/atmosphere elevations of `CINEMATIC_GUIDELINES.md` and `PREMIUM_POLISH.md` — never in fabricating data to look more impressive than the account's real, current state.
