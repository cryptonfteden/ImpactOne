# Motion Foundation (Phase X12B — Part 5)

## What it is

Reusable animation tokens and utilities — no component may ever write a raw `transition-duration` or `cubic-bezier` value; every real duration/curve is one of `DESIGN_TOKENS.md`'s `--nova-motion-*` tokens, consumed through one of the presets below.

## Files

- `frontend/src/styles/motion.css` — CSS transition-preset classes + the one signature looping "AI Thinking" gradient-sweep animation.
- `frontend/src/utils/motion.js` — the JS-side mirror (`MOTION_DURATION_MS`, `MOTION_CURVE`, `prefersReducedMotion()`, `resolveDurationMs()`), for any animation driven by JS (Canvas charts, a JS-orchestrated stagger) rather than a CSS transition.
- `frontend/src/utils/motion.test.js` — 7 tests.

## No duplicated animation values

Four durations (`micro` 120ms, `standard` 200ms, `screen` 320ms, `ai-thinking-loop` 1800ms) and two curves (`enter`, `exit`) — defined exactly once in `tokens.css`, referenced by both `motion.css`'s presets and `motion.js`'s JS constants. `motion.js`'s header comment discloses the one known limitation: there is no build-time codegen bridging CSS and JS in this project, so the two are kept numerically identical by convention, not by a single generated source — a real, documented tradeoff, not a silent one.

## Reduced motion — honored globally, two real signals

Every transition preset and the AI-thinking animation collapse to a 1ms/no-op under **either**:

1. The standard `@media (prefers-reduced-motion: reduce)` query, **or**
2. `ThemeProvider`'s explicit `data-motion="reduced"` override — for a user on a shared/borrowed device who can't change OS settings.

Neither takes priority over the other; either being true is sufficient. `motion.js`'s `prefersReducedMotion()` checks both in the same order, so a JS-driven animation and a CSS one always agree on whether motion is reduced for a given user, regardless of which mechanism triggered it. `resolveDurationMs()` returns `0` under reduced motion so a caller's animation logic can jump straight to the end state without a separate branch.

## The AI Thinking signature animation

`NOVA_DESIGN_BIBLE.md` §8/§11's signature motion — a slow (1.8s loop) gradient-position sweep across the brand-signal → brand-violet gradient — implemented once as `.nova-ai-thinking` so no future AI widget reimplements a slightly different version.

## Tests

`motion.test.js` — 7 tests: the real duration/curve constants match `tokens.css`, default (not-reduced) state, the explicit in-app override taking effect regardless of OS setting, the real OS-level signal, and `resolveDurationMs`'s real-value vs. zero behavior.
