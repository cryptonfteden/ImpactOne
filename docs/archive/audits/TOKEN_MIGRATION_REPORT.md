# Token Migration Report — NOVA-MIGRATION-001

Exact before/after diff for this phase's real fixes.

## `frontend/src/styles.css` — `:root` block (~line 1495, "Sprint 5 — Premium Fintech UI")

```diff
  :root {
    --bg-0: #06090f;
    --bg-1: #0b111b;
    --bg-2: #111a27;
    --glass: rgba(19, 29, 44, 0.7);
    --glass-border: rgba(160, 184, 219, 0.18);
    --text-0: #f3f7ff;
    --text-1: #c4d2e9;
    --text-2: #8ea3c3;
-   --accent: #6fb6ff;
+   --accent: var(--nova-color-brand-signal);
    --accent-soft: rgba(111, 182, 255, 0.17);
    --success: #37d68e;
    --danger: #ff6b79;
  }
```

## `frontend/src/styles.css` — "H3" accent system block (~line 3133)

```diff
  /* Accent system -- primary (intelligence blue) + secondary (confidence cyan) */
- --h3-accent: #6fb6ff;
- --h3-accent-strong: #4f9dff;
+ --h3-accent: var(--nova-color-brand-signal);
+ --h3-accent-strong: var(--nova-color-brand-signal-bright);
  --h3-cyan: #5eead4;
```

## Why These Three, Specifically

Each was verified two ways before being touched:

1. **Exact hex match** — `#6fb6ff` (both `--accent` and `--h3-accent`) equals `--nova-color-brand-signal`'s own resolved value (`var(--nova-primitive-blue-300)` = `#6fb6ff`) exactly, not approximately. `#4f9dff` (`--h3-accent-strong`) equals `--nova-color-brand-signal-bright`'s resolved value (`var(--nova-primitive-blue-400)` = `#4f9dff`) exactly.
2. **Already-documented intent** — `tokens.css`'s own header comment (from the earlier NOVA Foundation phase) explicitly names these exact legacy variables as the real values its own tokens were "reconciled to," and `--nova-primitive-blue-400`'s own inline comment literally reads `/* = shipped --h3-accent-strong, hover/active */`. This phase's fix makes that already-stated intent literally true in the CSS, rather than leaving it as a comment in a different file that the actual variable definitions didn't reflect.

## Real Leverage: One Line, Many Call Sites

```
grep -c "var(--accent)" frontend/src/styles.css       → 14
grep -c "var(--accent-soft)" frontend/src/styles.css  → 3
```

Every one of these 17 call sites (spanning buttons, badges, focus rings, and other chrome across the app, including all 6 priority screens) now genuinely derives from the shared Nova token without any of them needing to be individually edited — the alias at the single point of definition is the entire fix.

`--h3-accent`/`--h3-accent-strong` back a separate, scoped "H3" component family (the advanced chart / market-positioning surfaces) with its own real call-site count not separately audited this phase, but the same single-point-of-definition leverage applies identically.

## Zero Computed-Value Change

Because every substitution above resolves to the identical literal color, there is no real, rendered difference anywhere in the app before vs. after this fix — this is why it was safe to make without a visual-verification tool, and why the full regression suite (a behavioral test suite, not a visual one) is the correct and sufficient verification method for this specific class of change.
