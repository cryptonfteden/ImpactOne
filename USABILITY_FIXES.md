# Usability Fixes — REAL-WORLD-USAGE-001 — Exact Diff Record

One real fix this phase, applied to two files. No other production code was changed.

## `frontend/src/screens/HomeScreen.jsx`

**Import block** — added the already-existing, already-shared cache utility (no new utility written):

```diff
 import { homeApi, priceAlertsApi } from "../services/api";
+import { withRequestCache } from "../services/requestCache";
 import useWatchlist from "../hooks/useWatchlist";
```

**The fetch itself**, inside the existing data-loading effect:

```diff
       setIsLoading(true);
       try {
-        const data = await homeApi.getSummary(watchlist);
+        const data = await withRequestCache(`home:summary:${watchlist.join(",")}`, () => homeApi.getSummary(watchlist));
```

Everything else in the effect (the `catch`/`finally`, the dependency array `[watchlist.join(",")]`, the component's render/JSX) is untouched.

**Why this exact key**: `"home:summary:<watchlist>"` matches the real naming convention already used by the three other cached screens (`"<screen>:<datatype>:<params>"`) — not a new convention invented for this fix.

## `frontend/src/screens/HomeScreen.test.jsx`

**Import block** — added the matching cleanup helper:

```diff
-import { describe, expect, it, vi } from "vitest";
+import { describe, expect, it, vi, beforeEach } from "vitest";
 import { render, screen, waitFor, fireEvent } from "@testing-library/react";
 import HomeScreen from "./HomeScreen";
 import { homeApi } from "../services/api";
+import { clearRequestCache } from "../services/requestCache";
 import { I18nProvider } from "../i18n/I18nProvider";
```

**Test isolation** — cleared the now-shared cache between tests, the same way the other 3 cached screens' own tests already do:

```diff
+beforeEach(() => {
+  vi.clearAllMocks();
+  clearRequestCache();
+});
```

## Why This Is the Whole Fix

No other file needed to change. `withRequestCache` and `clearRequestCache` already existed (built in `PLATFORM-INTEGRATION-001`) and are already proven correct by three other screens' passing tests — this fix is exclusively "apply an existing, validated pattern to the one screen that was missing it," not new logic.

## Verification

- `HomeScreen.test.jsx`: 14/14 passing after the change.
- Production build: succeeded, no new warnings.
- Full frontend regression suite: see commit message for the exact pass count.
