# ImpactOne Release Checklist

**Phase:** RELEASE-GATE-001
**Purpose:** The permanent, standing quality gate every future feature must pass before release — regardless of who or what built it. This is a policy document, not a review of current code or implementation status. It exists so future reviews have a fixed standard to check the product against, rather than each phase inventing its own bar.

**How to use this document:** For every category, three tiers are defined (Mandatory, Recommended, Nice to have) plus a list of Blocking Issues — specific, concrete conditions that halt release outright, no matter how good everything else is. A release with even one Blocking Issue present, in any category, is not ready, full stop. Mandatory items are the pass/fail bar; Recommended and Nice to have items inform prioritization but do not by themselves block release.

Several Blocking Issues below are written the way they are — specific rather than generic — because they describe failure patterns this platform has produced in the past. Naming them precisely is deliberate: vague criteria get argued around, specific ones don't.

---

## 1. UX Quality

**Mandatory**
- Every screen has exactly one obvious visual starting point — the eye should not have to search for where to begin.
- Every screen is fully interactive (clickable, scrollable, navigable) within a bounded, short time of load — no indefinite reflow or layout instability.
- Every interactive element (button, toggle, link) produces a visible or functional effect when activated. An element that responds to a click with no observable change is a defect, not a low-priority polish item.
- Every asynchronous section has a real loading state distinguishable from "empty" and from "finished."

**Recommended**
- A single, consistent motion/animation language reused across the product rather than one-off effects per screen.
- Progressive disclosure for dense content (collapse-by-default with a real, working expand affordance) rather than showing everything at once.
- Empty states explain *why* they're empty, not just that they are.

**Nice to have**
- Micro-interactions/delight animations on key moments.
- Guided onboarding tours for first-time flows.

**Blocking Issues**
- A screen that is unreachable, unusable, or unstable (uncontrolled reflow, layout thrashing) on first load.
- Any interactive element that is inert — does nothing when triggered.
- A primary/"hero" screen presenting fixed demo or mock content with no in-UI disclosure that it is not live, personalized data.

---

## 2. Information Integrity

**Mandatory**
- Any claim about the user's own data (holdings, exposure, overlap, concentration, history) is checked against that user's real, current state before being displayed. There is no acceptable severity level for a false claim about a user's own account — it is always release-blocking.
- No two unrelated items may share byte-identical explanatory or analytical text. Distinct claims require distinct, evidence-grounded language.
- Every number presented as a fact is traceable to a real computation or data source, not a static placeholder dressed up as output.

**Recommended**
- Visible, clickable source links on evidentiary claims.
- Disclosed methodology version alongside any claim derived from a scored or modeled process.

**Nice to have**
- Confidence intervals or sample-size disclosure alongside statistical claims.
- A user-facing changelog of what changed in how claims are generated.

**Blocking Issues**
- Any specific, checkable factual claim about a user's own account that is false (e.g., stating a position, overlap, or concentration that does not exist in that account's real data).
- Two or more items on the same or related screens sharing identical explanatory text despite describing unrelated events.
- Any statistic or count that treats duplicate-content records as independent observations.

---

## 3. AI Honesty

**Mandatory**
- Confidence, uncertainty, probability, and relevance/attention are distinct concepts and must never share a label, visual instrument, or accessible name that implies they are the same thing.
- A composite or headline verdict (e.g., a recommendation) must never contradict its own disclosed supporting reasoning (e.g., a panel of sub-analyses) without an explicit, visible reconciliation explaining the gap.
- Any value derived from a stub, fallback, or placeholder data source must be labeled as such wherever it is shown — never presented indistinguishably from a live, real value.
- "Why" and "what would change this" must be answerable for every AI-generated verdict a user is expected to act on.

**Recommended**
- Disclosed model/methodology version per verdict.
- A visible calibration or track-record view showing how past verdicts of this type actually performed.

**Nice to have**
- User-facing explanation of what changed between model versions.
- Drill-down from a verdict to the exact evidence rows that produced it.

**Blocking Issues**
- Any user-facing verdict that contradicts its own shown reasoning with no explanation (e.g., every sub-analysis says one direction, the headline says another).
- Any score whose displayed or accessible label does not match what it actually measures.
- Any screen showing data from a permanently-stubbed or non-functional data source without disclosing that it isn't live.

---

## 4. Accessibility

**Mandatory**
- Every interactive element is reachable by keyboard and has an accessible name that accurately describes what it is and does.
- Every major screen exposes real landmark regions (not generic, unlabeled containers) to assistive technology.
- Color is never the sole carrier of meaning — every color-coded state has a text or icon equivalent.
- Layout is correct under RTL using logical CSS properties; no physical left/right leakage.

**Recommended**
- WCAG AA contrast ratios across all text/background pairings.
- Visible, non-suppressed focus indicators on all interactive elements.
- Respect for `prefers-reduced-motion`.

**Nice to have**
- WCAG AAA compliance where feasible.
- Automated screen-reader smoke testing in CI.

**Blocking Issues**
- Any accessible name that misrepresents what the element actually shows or does (this is both an accessibility and an AI-honesty failure simultaneously and should be treated with the same severity as §3).
- Any critical action reachable only via mouse/touch, with no keyboard path.
- RTL layout breakage caused by hardcoded physical direction instead of logical properties.

---

## 5. Performance

**Mandatory**
- No unbounded layout thrashing or reflow on initial load of any screen.
- Every screen becomes interactive within a defined, tested time budget.
- Long-running or network-bound operations show a real, bounded loading indicator — never an indefinite spinner with no timeout or fallback.

**Recommended**
- Route-level code splitting for heavy screens.
- Caching with correct invalidation and correct scoping (never shared across different users/tenants).

**Nice to have**
- Automated performance budgets enforced in CI (e.g., Lighthouse).
- Real-user-monitoring dashboards.

**Blocking Issues**
- A screen that fails to become interactive within a reasonable, agreed bound due to reflow or layout instability.
- Any cache implementation that leaks one user's or tenant's data into another's session.

---

## 6. Visual Consistency

**Mandatory**
- Every recurring concept (score, status, confidence, risk level) has exactly one canonical visual representation reused everywhere it appears — never two or three competing indicators for the same idea on one screen.
- All net-new UI is built from the shared design-system component library, not one-off styles that duplicate existing components.
- Spacing, elevation, and type scale follow the design system's defined tokens.

**Recommended**
- Design tokens used exclusively; no hardcoded colors/spacing values in component code.
- A single documented source of truth for when each elevation tier or motion treatment applies.

**Nice to have**
- Automated visual regression testing across key screens.

**Blocking Issues**
- Two different visual indicators representing the same underlying concept with different values on the same screen.
- A shared visual primitive that is reused for multiple distinct metrics without a mechanism to tell them apart (cross-reference §3, AI Honesty).

---

## 7. Data Integrity

**Mandatory**
- All relationships between records (recommendation → trace, outcome → recommendation, evidence → claim, etc.) are real, enforced references — not string IDs that can silently point to nothing.
- Any table intended to be an immutable audit trail is provably immutable (enforced, not just convention-based).
- No duplicate-content records may be counted as independent observations in any user-facing or model-facing statistic.

**Recommended**
- Database-level constraints enforcing key invariants, not application-level convention alone.
- Scheduled integrity audits comparing live data against expected invariants.

**Nice to have**
- Automated data-quality dashboards.
- Automated duplicate-content and anomaly detection.

**Blocking Issues**
- Any confirmed broken reference in production data (a foreign-key-like field pointing to a record that does not exist).
- Any confirmed instance of near-duplicate-content records being tallied as independent statistical evidence in a metric shown to users or fed back into a model.
- An audit-trail table that has been altered after creation.

---

## 8. Error Handling

**Mandatory**
- Every asynchronous load path has a real, honest failure state — never a silent blank screen.
- Screens showing related data during the same underlying outage must degrade consistently — one screen handling a failure honestly while a sibling screen goes silently blank for the identical cause is not acceptable.
- Invalid or unparseable user input must never silently produce a confident-looking but unrelated "successful" result.

**Recommended**
- Retry affordances on failed loads.
- Offline/degraded-mode banners that clearly state what is stale and what still works.

**Nice to have**
- Automatic background retry with backoff.
- Centralized error telemetry dashboards.

**Blocking Issues**
- Any screen that renders fully blank with no explanation during a known failure condition, while another screen displaying related data handles the same failure honestly.
- Invalid input silently producing a confident, seemingly valid but incorrect result instead of a visible error.

---

## 9. Mobile Readiness

**Mandatory**
- No horizontal overflow at any standard mobile breakpoint (360–430px width).
- Every primary flow is reachable through the mobile navigation.
- Both portrait and landscape orientations are explicitly tested every release — landscape layout must not silently fall back to a desktop-style layout.
- Safe-area insets are respected on notched/rounded-corner devices.

**Recommended**
- Touch targets meet minimum recommended size.
- Reduced motion respected on mobile as well as desktop.

**Nice to have**
- Installed-PWA parity with the web experience.
- Native-feeling transitions between mobile screens.

**Blocking Issues**
- Any regression to a desktop-style layout (e.g., a full-height sidebar replacing the mobile nav) at a phone-landscape aspect ratio. This exact defect has recurred multiple times in this product's history and must be explicitly retested, not assumed fixed, on every release.
- Primary content pushed entirely below the fold on first load by fixed header chrome.

---

## 10. Production Readiness

**Mandatory**
- The health check endpoint verifies real critical dependencies (database, primary data providers) — not just process liveness.
- Graceful shutdown is implemented for all long-running processes.
- No secrets are committed to source control, ever, in any branch or history.
- Public endpoints have rate limiting and input validation.
- The automated test suite runs and passes before any change is merged.

**Recommended**
- Structured logging, monitoring, and error tracking (APM) in place.
- A documented backup-and-restore runbook.
- A documented rollback procedure for any release.

**Nice to have**
- Blue/green or canary deployment capability.
- Automated dependency vulnerability scanning.

**Blocking Issues**
- Any secret present in git history, committed or not yet rotated.
- A health check that reports healthy while a critical dependency (database, primary provider) is actually unavailable.
- Merging a change without the automated test suite having been run against it.
