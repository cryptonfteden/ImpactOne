# FLAGSHIP_EXPERIENCE.md — How the Flagship Screen Is Used and Felt

**Phase:** FLAGSHIP-UI-001. Companion to [FLAGSHIP_VISUAL.md](FLAGSHIP_VISUAL.md). Covers how the designated flagship screen (Mission Control's 3D overview, per `FLAGSHIP_VISUAL.md`) performs across every channel the mission names, and the live, interactive experience behind the still image.

---

## The experience principle

**Everything feels alive. Everything has depth. Everything belongs to one visual system. Nothing feels like separate widgets.** — the mission's own 4 design principles, restated here as the literal test every one of the following channel treatments must pass: if a still frame or a video cut ever shows something that reads as a bounded, separate "card" or "panel" rather than an object that belongs to one continuous space, it fails this mission.

## Channel by channel

### Website hero
A static (or barely-animating, respecting first-load performance) render of the flagship composition from `FLAGSHIP_VISUAL.md` — Earth, orbital ring, the chain arcing through center. On scroll or after a short idle delay, the real orbital nodes begin their real, existing gentle pulse (`OrbitalNode.jsx`'s per-node phase-offset pulse) so the hero reads as genuinely "alive," not a static illustration pretending to be a live product. No autoplay of a full camera fly-through on page load — respecting the mission's own "nothing moves unnecessarily" and typical site performance/accessibility expectations (a user landing on a marketing page has not opted into an immersive experience yet).

### App Store screenshots
**This is the hardest constraint and the reason `FLAGSHIP_VISUAL.md`'s "chain as compositional spine" elevation exists** — App Store screenshots are static, single frames, with no motion available at all. The flagship composition must read completely and impressively with zero animation, which is exactly why the chain's story must be legible as a still line through the frame rather than only visible mid-animation. Additional screenshots in the same set should show 2-3 of the real orbital modules' own real screens inside their real glass panel (`GlassPanel.jsx`) — never a fabricated mockup screen, always the real, shipped feature.

### Product videos
The one channel where the real, existing camera system (`CAMERA_SYSTEM.md`'s exponential lerp) gets to be the star: open on the wide overview, let the chain animate its full real sequence once, then a real camera move into one orbital module (Portfolio or AI Analysis, whichever best demonstrates a real, compelling, honest example) exactly as a real user would experience it live — **the video should never fake a transition the product itself cannot actually perform**, since a demo that oversells relative to the live product is a real trust risk this whole engagement has repeatedly identified and fixed elsewhere (Daily Feed's fabricated-explanation bug, `AI-TRUST-001`). What is shown in the video must be achievable in the running app, unmodified.

### Investor presentations
The flagship frame doubles as the deck's own "this is the product" slide, but investor context additionally benefits from the Mission Control chain being annotated (real labels already exist per `MISSION_CONTROL_CHAIN` — "Global Event → AI Reasoning → Sector Impact → Company Impact → Portfolio Impact → Recommendation") since this single chain **is** the company's actual thesis made visible: the product does not just show data, it shows its own reasoning. This should be called out explicitly in presentation contexts (a brief caption or verbal narration), since a chart-literate investor audience benefits from the explicit claim that this chain is real software behavior, not a marketing diagram — directly reusing this whole engagement's own repeated "explainability is the differentiator" finding from earlier phases (`EXPLAINABILITY_ENGINE.md`).

### Press and social media
Shorter attention spans favor a single, striking still or a 3-5 second loop of just the chain's pulse animation (`MissionControlChain.jsx`'s existing "single glowing pulse traveling the full chain on a deterministic loop") — this is already real, already built, and already the single most visually interesting piece of motion in the whole scene; press/social treatment should crop tightly to it rather than the wider overview, since a small social thumbnail cannot resolve 7 small orbital nodes clearly.

### Product launch
The full experience, uncropped: a live audience or livestream sees the real app, the real camera system, a real click into a real module — the flagship screen's job at launch is to be **actually demoed**, not merely depicted, which is the strongest possible argument for why every other channel's treatment above must never show anything the real, running software cannot also do live.

## The felt experience, moment to moment

1. **Arrival** — the Earth is already visible and already gently rotating before any other element resolves (directly reusing the real, existing continuous rotation in `Earth.jsx`) — the sense of "a living world already in motion when you arrive," not a scene that boots up in front of you.
2. **Orientation** — the 7 orbital modules resolve a beat after the Earth, softly, never popping in abruptly — communicating "these are things that exist around this world," reinforcing the Earth's role as the one true anchor (directly continuing the prior phase's own Earth-as-anchor principle).
3. **Invitation** — the chain begins its loop shortly after arrival, drawing the eye through the center of the frame — this is the moment that should make "the screen people will remember" land, since it is the one real, honest visualization of the product's actual reasoning process, and nothing else in fintech shows this.
4. **Interaction** — clicking any real orbital node triggers the real, existing camera-lerp transition (`CAMERA_SYSTEM.md`) into that module's real glass panel — every one of the mission's own words ("weight," "purpose") is already satisfied by the real exponential-lerp's frame-rate-independent easing; this document does not propose replacing it, only dressing it (materials/lighting) per `FLAGSHIP_STYLE_GUIDE.md`.
5. **Return** — closing the panel returns the camera to the overview via the same real mechanism, completing the loop back to step 1's resting composition.
