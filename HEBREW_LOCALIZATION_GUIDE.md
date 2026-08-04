# Hebrew Localization Guide
## Office of the Global Product Board — ImpactOne

**Mandate:** Define everything required for an excellent Hebrew experience — not a translated one. Hebrew is treated as a full first-class locale, built to the same trust standard as English, per `GLOBAL_LANGUAGE_STRATEGY.md`.

---

## Right-to-Left (RTL)

The entire interface mirrors for RTL reading — navigation, icons with directional meaning, card layouts. **Numbers, ticker symbols, dates in numeral form, and any embedded Latin-script content remain left-to-right runs within the surrounding RTL text**, using correct bidirectional text handling rather than being forced into RTL and becoming unreadable or reversed.

## Financial Terminology

Israeli financial vocabulary frequently borrows or transliterates English terms rather than using a distinct native equivalent, and usage varies across financial professionals. The Hebrew glossary (`GLOBAL_LANGUAGE_STRATEGY.md`'s centrally-owned terminology list) is reviewed by a fluent, finance-literate Hebrew speaker — never a generalist translator — specifically because a mistranslated or unnaturally-phrased financial term is more likely to be caught, and to damage trust, in this market than in a market where financial vocabulary is more standardized.

## Dates

Gregorian dates remain primary, formatted DD/MM/YYYY per standard Israeli convention, with 24-hour time — never the US-style MM/DD/YYYY format, which is a common and confusing localization mistake.

## Numbers

Western Arabic numerals are used throughout, matching standard Israeli practice — Hebrew's own historical numeral system is never used for financial figures. Decimal and thousands separators follow local convention, confirmed against real Israeli financial publications rather than assumed from a generic locale library default.

## Typography

A Hebrew-optimized type family is used, never a Latin font with Hebrew glyphs bolted on as an afterthought — Hebrew letterforms have different proportions, x-height, and spacing needs than Latin script, and a font that wasn't actually designed for Hebrew reads as visibly wrong to a native reader even when technically legible.

## Readability

Body text is right-aligned by default. Line length and spacing are tuned for Hebrew reading patterns specifically, not inherited unchanged from the English layout — a line length that reads comfortably in English does not automatically read comfortably in Hebrew.

## Notifications

Notification copy is written natively in Hebrew, not translated word-for-word from an English sentence structure — a literal translation frequently produces grammatically correct but unnatural-sounding phrasing that a native reader immediately notices, undermining the calm, trustworthy tone this platform depends on in every language.

## Charts

**The time axis of every chart is never mirrored, regardless of RTL layout.** Market history reads left-to-right chronologically in every language, because reversing it would cause a Hebrew-reading user to misread the actual direction of a real historical trend — a correctness issue, not just a stylistic one. Axis labels, legends, and surrounding chrome mirror for RTL reading; the temporal direction of the data itself does not.

---

## The Standard This Guide Is Held To

A Hebrew-speaking user should never be able to tell that Hebrew was the *second* language this product was built for. Every rule above exists to make sure Hebrew support looks and reads like the product's native language, not like an accommodation layered on top of one.
