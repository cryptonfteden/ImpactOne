# Visual Unification — NOVA-MIGRATION-001

The standing rule this phase establishes for all future Nova-migration work, and the priority order a future phase should follow.

## The Rule: Alias, Don't Approximate

When migrating a legacy value to a Nova token:

1. **Compare the exact, literal value** (hex, rgba, px) — not "looks similar," a real byte-for-byte or numerically-equal comparison.
2. **If exact**: alias the legacy variable's definition to `var(--nova-*)`. This is zero-risk (no rendered output changes) and high-leverage (every call site of the legacy variable is migrated in one edit).
3. **If close but not exact**: do **not** alias. Log it (see `LEGACY_UI_REMAINING.md`'s table) as real, disclosed remaining work requiring either a genuine visual-verification tool or explicit design sign-off to actually change the rendered value — treating "close enough" as "the same" is exactly the kind of undisclosed micro-redesign this mission's "do not redesign" rules out.
4. **If no Nova equivalent exists at all** (e.g., `--glass`/`--glass-border`'s specific rgba surface colors): log it as a real gap in Nova's own token coverage, not a migration failure — Nova's token set may need to grow to genuinely replace every legacy value, which is a decision for whoever owns the design system, not something to force through an approximate substitution.

## Priority Order for Future Migration Work

Based on this phase's own real findings:

1. **Resolve the JS/CSS boundary duplicate** (`theme.js`'s `accent` constant) — the one concrete, named, already-scoped next step disclosed in `LEGACY_UI_REMAINING.md`.
2. **Extend Nova's token set to cover glass-surface colors** (`--glass`, `--glass-border`) — currently a real gap, not an approximation opportunity; a real design decision about what the "official" glass surface color should be, informed by (not overridden by) the legacy value already in production use.
3. **Text-color reconciliation** (`--text-0/1/2`, `--h3-text-*` vs. Nova's text-primary/secondary/tertiary) — the largest-leverage remaining opportunity (text color touches nearly every screen), but also the one most likely to produce a real, visible (if subtle) change across the entire app — this should be a deliberate, sign-off-backed decision, not a mechanical substitution.
4. **Status colors** (`--success`/`--danger`/`--h3-positive`/`--h3-negative`/`--h3-warning` vs. Nova's positive/negative) — lower priority than text color (narrower surface area: badges, pills, deltas) but the same "real color change, needs sign-off" caveat applies.

## What This Phase Proves Is Possible

The three real aliases made this phase (`TOKEN_MIGRATION_REPORT.md`) demonstrate the technique works cleanly at scale: a single `:root` variable definition change cascaded correctly to 17+ real call sites across the legacy stylesheet, verified safe by the full regression suite, with zero manual per-site edits required. The same technique, applied to the text-color and status-color opportunities above once a real value decision is made, would unify the vast majority of the legacy UI's remaining color usage in a handful of similarly small, high-leverage edits — the infrastructure and method are proven; what remains is the real design decision about which exact values to converge on.

## Test Coverage for This Class of Change

No new tests were added specifically for the variable aliases in this phase — they are provably zero-risk (identical computed values), and the existing test suite (which exercises real component rendering and behavior, not color values) is the correct and sufficient regression guard for a change of this exact shape. A future phase making a real value change (per the priority list above) should pair it with the same kind of CSS-structural regression test established in `MOBILE-FIXES-001`'s `styles.mobile.test.js` — reading the real stylesheet and asserting the new token reference is present — since no visual-regression tool exists in this environment to catch an unintended rendering difference any other way.
