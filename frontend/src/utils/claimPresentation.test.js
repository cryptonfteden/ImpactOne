import { describe, expect, it } from "vitest";
import { statusTone, statusPlainLabel, attentionLevel, computeChangedClaimsText } from "./claimPresentation";

describe("claimPresentation — Phase DEDUPLICATION-001", () => {
  describe("statusTone", () => {
    it.each([
      ["STRENGTHENING", "positive"],
      ["WEAKENING", "warning"],
      ["INVALIDATED", "neutral"],
      ["DRAFT", "info"],
      [undefined, "info"],
    ])("maps %s to %s", (status, tone) => {
      expect(statusTone(status)).toBe(tone);
    });
  });

  describe("statusPlainLabel", () => {
    it.each([
      ["STRENGTHENING", "Getting more likely"],
      ["WEAKENING", "Getting less likely"],
      ["INVALIDATED", "No longer holds up"],
      ["DRAFT", "DRAFT"],
    ])("maps %s to %s", (status, label) => {
      expect(statusPlainLabel(status)).toBe(label);
    });
  });

  describe("attentionLevel", () => {
    it.each([
      [90, "High"],
      [75, "High"],
      [74, "Medium"],
      [45, "Medium"],
      [44, "Low"],
      [0, "Low"],
      [undefined, "Low"],
      [null, "Low"],
    ])("maps score %s to %s", (score, level) => {
      expect(attentionLevel(score)).toBe(level);
    });
  });

  describe("computeChangedClaimsText", () => {
    const PUBLISHED_AT = "2026-07-20T12:00:00.000Z";

    it("returns an honest 'no active Claims' message when the item has no affected symbols", () => {
      expect(computeChangedClaimsText({ affectedAssets: [] }, [{ symbols: ["NVDA"] }])).toBe("No active Claims affected.");
    });

    it("returns an honest 'no active Claims' message when there are no active claims at all", () => {
      expect(computeChangedClaimsText({ affectedAssets: ["NVDA"] }, [])).toBe("No active Claims affected.");
    });

    it("returns an honest 'no active Claims' message when no claim's symbols overlap", () => {
      const claims = [{ symbols: ["META"], status: "STRENGTHENING" }];
      expect(computeChangedClaimsText({ affectedAssets: ["NVDA"] }, claims)).toBe("No active Claims affected.");
    });

    it("attributes a real recent STRENGTHENING transition as caused by this news", () => {
      const item = { affectedAssets: ["NVDA"], publishedAt: PUBLISHED_AT };
      const claims = [{ symbols: ["NVDA"], status: "STRENGTHENING", plainLanguageStatement: "NVDA outlook improves.", lastUpdatedAt: "2026-07-20T18:00:00.000Z" }];
      expect(computeChangedClaimsText(item, claims)).toBe('This news strengthened a Claim: "NVDA outlook improves.".');
    });

    it("attributes a real recent WEAKENING transition as caused by this news", () => {
      const item = { affectedAssets: ["META"], publishedAt: PUBLISHED_AT };
      const claims = [{ symbols: ["META"], status: "WEAKENING", plainLanguageStatement: "META pricing softens.", lastUpdatedAt: "2026-07-21T00:00:00.000Z" }];
      expect(computeChangedClaimsText(item, claims)).toBe('This news weakened a Claim: "META pricing softens.".');
    });

    it("attributes a real recent INVALIDATED transition as caused by this news", () => {
      const item = { affectedAssets: ["INTC"], publishedAt: PUBLISHED_AT };
      const claims = [{ symbols: ["INTC"], status: "INVALIDATED", plainLanguageStatement: "INTC ramp was expected to miss.", lastUpdatedAt: "2026-07-20T13:00:00.000Z" }];
      expect(computeChangedClaimsText(item, claims)).toBe('This news invalidated a Claim: "INTC ramp was expected to miss.".');
    });

    it("attributes a real recent DRAFT creation as caused by this news", () => {
      const item = { affectedAssets: ["AMD"], publishedAt: PUBLISHED_AT };
      const claims = [{ symbols: ["AMD"], status: "DRAFT", plainLanguageStatement: "AMD foundry diversification.", lastUpdatedAt: "2026-07-20T12:30:00.000Z" }];
      expect(computeChangedClaimsText(item, claims)).toBe('This news created a Claim: "AMD foundry diversification.".');
    });

    it("never claims causation for a transition outside the recent time window, even with a matching status", () => {
      const item = { affectedAssets: ["NVDA"], publishedAt: PUBLISHED_AT };
      const claims = [{ symbols: ["NVDA"], status: "STRENGTHENING", plainLanguageStatement: "NVDA outlook improves.", lastUpdatedAt: "2026-06-01T00:00:00.000Z" }];
      expect(computeChangedClaimsText(item, claims)).toBe('This news relates to an active Claim: "NVDA outlook improves." (same symbol, no confirmed recent transition).');
    });

    it("never claims causation when either timestamp is missing", () => {
      const claims = [{ symbols: ["NVDA"], status: "STRENGTHENING", plainLanguageStatement: "NVDA outlook improves." }];
      expect(computeChangedClaimsText({ affectedAssets: ["NVDA"] }, claims)).toBe(
        'This news relates to an active Claim: "NVDA outlook improves." (same symbol, no confirmed recent transition).'
      );
    });

    it("joins up to three overlapping claims", () => {
      const item = { affectedAssets: ["NVDA"], publishedAt: PUBLISHED_AT };
      const claims = [
        { symbols: ["NVDA"], status: "STRENGTHENING", plainLanguageStatement: "First.", lastUpdatedAt: PUBLISHED_AT },
        { symbols: ["NVDA"], status: "WEAKENING", plainLanguageStatement: "Second.", lastUpdatedAt: PUBLISHED_AT },
        { symbols: ["NVDA"], status: "INVALIDATED", plainLanguageStatement: "Third.", lastUpdatedAt: PUBLISHED_AT },
        { symbols: ["NVDA"], status: "STRENGTHENING", plainLanguageStatement: "Fourth (dropped).", lastUpdatedAt: PUBLISHED_AT },
      ];
      const result = computeChangedClaimsText(item, claims);
      expect(result).toContain("First.");
      expect(result).toContain("Second.");
      expect(result).toContain("Third.");
      expect(result).not.toContain("Fourth");
    });
  });
});
