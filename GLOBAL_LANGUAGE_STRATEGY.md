# Global Language Strategy
## Office of the Global Product Board — ImpactOne

**Mandate:** Define how ImpactOne supports dozens of languages without duplicating logic anywhere. **English remains canonical. Translation exists only at the presentation layer.** Every rule below exists to protect that one sentence.

---

## The One Architecture Principle

Every belief, piece of evidence, confidence score, uncertainty score, and recommendation is reasoned about, scored, and stored exactly once, in English, regardless of how many languages the product eventually supports. A user in any language is looking at the same underlying claim as every other user looking at the same fact — only the words describing it differ. **No reasoning, scoring, or evidence-weighting logic is ever duplicated per language.** If a language-specific pipeline ever exists for anything beyond rendering text, this principle has already been violated.

---

## What Gets Translated

- Interface copy, labels, and navigation.
- Plain-language explanations of concepts (confidence, uncertainty, risk, thesis).
- Educational content and Help Center articles.
- Notification and communication text.

## What Never Gets Translated

- Numbers, scores, and percentages — a confidence of 72 is 72 in every language, never re-expressed or rounded differently.
- Ticker symbols and company names in their standard market form.
- The underlying evidence, confidence, and uncertainty values themselves — translation changes how a value is *described*, never the value.
- Source citations and URLs.

---

## A Language Is Either Fully Supported or Not Offered

**No partial translation ever ships.** A screen with some strings translated and others still in English does not look "in progress" to a user — it looks broken, and it directly undermines the trust this platform depends on. A language is either 100% translated, locale-correctly formatted, and verified, or it is not offered as an option at all. There is no intermediate state.

---

## The Central Terminology Glossary

Every core term (confidence, uncertainty, thesis, invalidation condition, risk, exposure) has exactly one approved translation per language, maintained in a single, centrally-owned glossary — never left to individual translators or ad hoc phrasing per screen. **The same trust-integrity risk this platform has already found in its own English copy — two different-sounding numbers that could read as disagreeing — is just as real across two different translated screens using two different words for the same concept.** A glossary violation (the same English term translated two different ways in the same language) is treated with the same severity as any other trust-consistency finding.

---

## Human Review Is Mandatory for Anything Evidentiary

Machine translation may assist with volume, but no string that describes confidence, uncertainty, risk, or a recommendation ships in any language without human review by a fluent speaker with real financial-domain familiarity. Educational and Help Center content may tolerate a lighter review pass; evidence-adjacent copy never does, because a subtly wrong translation of "uncertainty" into a word that reads as "confidence" would recreate, in a new language, the exact single-dial failure this platform has spent its history trying to eliminate in English.

---

## Testing a New Language Is Not a Translation QA Pass

Before any language ships, it passes the same trust-integrity checks already applied to the English product — confirming that confidence and uncertainty remain visibly distinct, that no claim reads as more certain in translation than the underlying number supports, and that no financial term has drifted in meaning through translation. A new language is audited the same way a new feature is audited, never assumed safe because the words were "just translated."

---

## Currency and Locale Display Are Presentation, Never Fact

A price shown in a user's local currency is a *display convenience*, computed at render time from the canonical, universal underlying value — never a re-derivation of the fact itself, and always labeled with which currency is actually being shown, per `PERSONALIZATION_PRINCIPLES.md`'s standing rule that personalization changes presentation, never truth.
