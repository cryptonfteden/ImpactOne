# First-Time User Flow — Phase E1

Walked against the actual current code (`frontend/src`), not a mockup. No code was modified to produce this.

## Landing → Login

There is no landing page and no login screen. `AppRoot.jsx` calls `useInvestorProfile()`; while it loads, the user sees a blank `aria-busy` div (no spinner, no branding, no explanation). If no investor profile exists yet (true for every new install), the app drops straight into `OnboardingFlow` full-screen, with only age required and no visible skip option. Auth is entirely stubbed — there is no account, no session, no sign-in step at all. A beta user will never see a "Welcome to ImpactOne" moment; the first thing they see is either a blank div or an onboarding form.

## Dashboard (Home)

Once onboarded, the default screen is `HomeScreen.jsx` — a "Morning Brief" composed of up to 6 cards (morning brief, today-for-you, portfolio, beliefs, recommendations, intelligence timeline), fetched in one call and shown with a real `LoadingSpinner` while pending. For a brand-new user with an empty portfolio and zero recommendations, no dedicated "you're new, here's what to do first" copy was found — the screen simply renders whatever the API returns for an empty state, which may read as sparse or confusing rather than welcoming.

## First Recommendation

`RecommendationsScreen.jsx` does have a real, considered empty state: *"No active recommendations. Run the engine or wait for the next scheduled pass."* This is honest but not actionable for a beta user — there is no button, no explanation of *when* the next pass runs, and no way for a first-time user to trigger one themselves. Given D1.6–D1.8's own findings (the engine currently needs either strong real market/news signal or a deliberately concentrated portfolio to produce anything), a beta user starting from zero positions may see this empty state for a long, unpredictable time with no visibility into why.

## AI Analysis

`AiAnalysisScreen.jsx` requires a selected ticker before most of its content is meaningful — for a user who hasn't picked a symbol yet, several parallel data sources (OpenAI analysis, comparison, committee, alt-data, intelligence engine) simply have nothing to show. Each has its own error state and degrades independently rather than crashing (a good sign), and the whole screen is wrapped in a dedicated `ScreenErrorBoundary` — the only screen in the app with that extra protection, suggesting past instability here specifically.

## Charts

There is no charting library anywhere in the frontend (`recharts`/`chart.js`/`d3`/`victory`/`nivo` — none present) and no dedicated visualization component. Every screen that shows portfolio value, price history, or performance does so as numbers/pills/text, not graphs. A beta user expecting a price chart or portfolio-value-over-time line — a near-universal expectation for a financial product — will not find one anywhere in the current build.

## Portfolio

Two implementations exist behind a flag. The **default (legacy) `PortfolioScreen.jsx`** is what every beta user sees unless `VITE_PORTFOLIO_ENGINE=api` is explicitly set — and it does not clearly reuse the shared `Skeleton`/`LoadingSpinner`/`ErrorState` components used elsewhere in the app, so its loading/error behavior is the least verified of any screen in this audit. The **new `PortfolioEngineScreen.jsx`** (opt-in only) is materially better: real `ErrorState` on fetch failure, inline error text on failed orders, a disabled "Placing..." button state during submission, and a confirmation step before the destructive Reset action. Today's default beta experience is the *weaker* of the two.

## Settings

`SettingsScreen.jsx` is 53 lines and mostly not real. Only the language selector is a live, functional control. "Appearance" (theme) and "Notifications" sections are static bullet text describing defaults — *"Premium Dark theme is enabled by default," "Breakout alerts: Enabled"* — with no toggle behind them. A beta user who tries to change a setting they can see written on the page will find nothing to click.

## Exit

No sign-out, no session, nothing to "exit" from — consistent with there being no login in the first place. This is internally consistent, but means there is also no way to reset one's own identity/profile from the UI short of clearing local storage or using the (currently hidden, dev-console-only) reset path.
