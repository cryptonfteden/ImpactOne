import { describe, it, expect } from "vitest";
import { confidenceToIntensity, memberRole, recommendationActionColor, localRingPosition } from "./visualizationMappings";

describe("visualizationMappings", () => {
  describe("confidenceToIntensity", () => {
    it("maps every real, disclosed confidence label to a distinct, decreasing intensity", () => {
      const unanimous = confidenceToIntensity("HIGH_UNANIMOUS");
      const majority = confidenceToIntensity("MODERATE_MAJORITY");
      const split = confidenceToIntensity("LOW_SPLIT");
      const noSignal = confidenceToIntensity("LOW_NO_SIGNAL");
      expect(unanimous).toBeGreaterThan(majority);
      expect(majority).toBeGreaterThan(split);
      expect(split).toBeGreaterThan(noSignal);
      expect(unanimous).toBe(1);
    });

    it("honestly falls back to the lowest intensity for an unrecognized/missing label", () => {
      expect(confidenceToIntensity(undefined)).toBe(0.15);
      expect(confidenceToIntensity("SOMETHING_NEW")).toBe(0.15);
    });
  });

  describe("memberRole", () => {
    const committee = {
      agreement: { members: ["a"] },
      disagreement: { status: "NO_DISAGREEMENT", supportiveMembers: [], contraryMembers: [] },
    };
    const splitCommittee = {
      agreement: { members: [] },
      disagreement: { status: "DISAGREEMENT", supportiveMembers: ["b"], contraryMembers: ["c"] },
    };

    it("a real member named in agreement.members is 'agree'", () => {
      expect(memberRole("a", committee)).toBe("agree");
    });

    it("a real member named in disagreement.supportiveMembers is 'agree'", () => {
      expect(memberRole("b", splitCommittee)).toBe("agree");
    });

    it("a real member named in disagreement.contraryMembers is 'disagree'", () => {
      expect(memberRole("c", splitCommittee)).toBe("disagree");
    });

    it("a real member named in neither list is honestly 'neutral'", () => {
      expect(memberRole("d", splitCommittee)).toBe("neutral");
    });
  });

  describe("recommendationActionColor", () => {
    it("BUY, EXIT, and every other real action each map to a distinct color", () => {
      const buy = recommendationActionColor("BUY");
      const exit = recommendationActionColor("EXIT");
      const reduce = recommendationActionColor("REDUCE");
      expect(new Set([buy, exit, reduce]).size).toBe(3);
    });
  });

  describe("localRingPosition", () => {
    it("places every real item at the same real distance from the ring's own center", () => {
      const positions = [0, 1, 2, 3].map((i) => localRingPosition(i, 4, 2));
      positions.forEach(([x, y]) => {
        expect(Math.hypot(x, y / 0.6)).toBeCloseTo(2);
      });
    });

    it("never divides by zero for a real, empty (zero-count) cluster", () => {
      expect(() => localRingPosition(0, 0, 2)).not.toThrow();
    });
  });
});
