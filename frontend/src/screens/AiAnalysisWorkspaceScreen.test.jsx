import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import AiAnalysisWorkspaceScreen from "./AiAnalysisWorkspaceScreen";
import { I18nProvider } from "../i18n/I18nProvider";
import { PlatformProvider } from "../context/PlatformContext";
import { clearRequestCache } from "../services/requestCache";
import { claimsApi } from "../services/api";
import { fallbackClaim } from "./aiAnalysisWorkspace/aiAnalysisWorkspaceMockData";

vi.mock("../services/api", () => ({
  claimsApi: { listActive: vi.fn(), listBySymbol: vi.fn(), getHistory: vi.fn(), getStrongestEvidence: vi.fn() },
}));

function renderScreen({ initialSymbol } = {}) {
  return render(
    <I18nProvider>
      <PlatformProvider navigate={() => {}} initialSelectedSymbol={initialSymbol || null}>
        <AiAnalysisWorkspaceScreen />
      </PlatformProvider>
    </I18nProvider>
  );
}

async function waitForLoaded() {
  await waitFor(() => expect(screen.getByText("The platform's reasoning, made explicit")).toBeInTheDocument());
}

const REAL_ACTIVE_CLAIMS = {
  claims: [{ claimId: "real-claim-1", symbols: ["NVDA"], confidence: 85, attentionScore: 90 }],
};

const REAL_BY_SYMBOL_CLAIMS = {
  claims: [{ claimId: "real-claim-2", symbols: ["META"], confidence: 70, attentionScore: 60 }],
};

const REAL_HISTORY = {
  claim: {
    claimId: "real-claim-1",
    symbols: ["NVDA"],
    statement: "Real statement.",
    plainLanguageStatement: "Real plain-language statement.",
    expectedDirection: "BULLISH",
    probability: 80,
    confidence: 85,
    status: "STRENGTHENING",
    evidence: [{ id: "s1", observedFact: "Real supporting fact." }],
    counterEvidence: [{ id: "c1", observedFact: "Real contradicting fact." }],
    invalidationConditions: ["Real invalidation condition."],
    confirmationConditions: ["Real confirmation condition."],
    reasoning: { observed: ["Real observed fact."], inferred: ["Real inferred conclusion."] },
  },
  transitions: [{ id: "t1", fromStatus: "DRAFT", toStatus: "STRENGTHENING", reason: "Real transition reason." }],
};

const REAL_EVIDENCE = {
  strongestSupporting: [{ id: "s1", observedFact: "Real supporting fact." }],
  strongestContradicting: [{ id: "c1", observedFact: "Real contradicting fact." }],
};

function mockAllLive() {
  claimsApi.listActive.mockResolvedValue(REAL_ACTIVE_CLAIMS);
  claimsApi.listBySymbol.mockResolvedValue(REAL_BY_SYMBOL_CLAIMS);
  claimsApi.getHistory.mockResolvedValue(REAL_HISTORY);
  claimsApi.getStrongestEvidence.mockResolvedValue(REAL_EVIDENCE);
}

beforeEach(() => {
  vi.clearAllMocks();
  clearRequestCache();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AiAnalysisWorkspaceScreen — Phase AI-ANALYSIS-001", () => {
  it("shows a loading skeleton before data resolves", async () => {
    mockAllLive();
    renderScreen();
    expect(screen.getByLabelText("Assembling the reasoning trace")).toBeInTheDocument();
    await waitForLoaded();
  });

  describe("no symbol selected — falls back to the platform's most active real Claim", () => {
    it("fetches the top active Claim and renders its full real reasoning trace", async () => {
      mockAllLive();
      renderScreen();
      await waitForLoaded();

      expect(claimsApi.listActive).toHaveBeenCalledWith({ limit: 5 });
      expect(claimsApi.listBySymbol).not.toHaveBeenCalled();
      expect(claimsApi.getHistory).toHaveBeenCalledWith("real-claim-1");

      const subject = screen.getByRole("region", { name: "Subject" });
      expect(within(subject).getByText("NVDA")).toBeInTheDocument();
      expect(within(subject).getByText("Real plain-language statement.")).toBeInTheDocument();

      const reasoning = screen.getByRole("region", { name: "Reasoning" });
      expect(within(reasoning).getByText(/What is happening/)).toBeInTheDocument();
      expect(within(reasoning).getByText(/Why the platform believes it/)).toBeInTheDocument();
      expect(within(reasoning).getByText(/Evidence that supports it/)).toBeInTheDocument();
      expect(within(reasoning).getByText(/Evidence that contradicts it/)).toBeInTheDocument();
      expect(within(reasoning).getByText(/What could invalidate this thesis/)).toBeInTheDocument();
      expect(within(reasoning).getByText(/What to monitor next/)).toBeInTheDocument();

      const context = screen.getByRole("region", { name: "Context" });
      expect(within(context).getByText("Real supporting fact.")).toBeInTheDocument();
      expect(within(context).getByText("Real contradicting fact.")).toBeInTheDocument();
      expect(within(context).getByText("Real transition reason.")).toBeInTheDocument();
    });

    it("hides Demo Mode entirely once every stage is genuinely live", async () => {
      mockAllLive();
      renderScreen();
      await waitForLoaded();
      expect(screen.queryByRole("status", { name: /Demo/ })).not.toBeInTheDocument();
    });
  });

  describe("a symbol is already selected on another integrated screen", () => {
    it("fetches real Claims for that symbol instead of the platform-wide active list", async () => {
      mockAllLive();
      renderScreen({ initialSymbol: "META" });
      await waitForLoaded();

      expect(claimsApi.listBySymbol).toHaveBeenCalledWith("META", { limit: 5 });
      expect(claimsApi.listActive).not.toHaveBeenCalled();
      expect(claimsApi.getHistory).toHaveBeenCalledWith("real-claim-2");
    });
  });

  describe("no real Claim exists to analyze — honest empty state, never Demo Mode", () => {
    it("shows an honest empty state when no active Claims exist at all", async () => {
      claimsApi.listActive.mockResolvedValue({ claims: [] });
      renderScreen();
      await waitForLoaded();

      expect(screen.getByText("No active Claim to analyze yet — select a symbol on another screen, or check back once the platform has formed a belief.")).toBeInTheDocument();
      expect(screen.queryByRole("status", { name: /Demo/ })).not.toBeInTheDocument();
      expect(claimsApi.getHistory).not.toHaveBeenCalled();
    });

    it("shows a symbol-specific honest empty state when no Claim exists for the selected symbol", async () => {
      claimsApi.listBySymbol.mockResolvedValue({ claims: [] });
      renderScreen({ initialSymbol: "TSLA" });
      await waitForLoaded();

      expect(screen.getByText("No active Claim found for TSLA to analyze yet.")).toBeInTheDocument();
    });
  });

  describe("fetch failure — graceful fallback to Demo Mode", () => {
    it("falls back to demo content and shows the full Demo Mode indicator when the reasoning trace fails to load", async () => {
      claimsApi.listActive.mockResolvedValue(REAL_ACTIVE_CLAIMS);
      claimsApi.getHistory.mockRejectedValue(new Error("down"));
      claimsApi.getStrongestEvidence.mockRejectedValue(new Error("down"));
      renderScreen();
      await waitForLoaded();

      const indicator = screen.getByRole("status", { name: "Demo mode: showing simulated intelligence, not live data." });
      expect(within(indicator).getByText("Demo")).toBeInTheDocument();

      const subject = screen.getByRole("region", { name: "Subject" });
      expect(within(subject).getByText(fallbackClaim.symbols.join(", "))).toBeInTheDocument();
    });

    it("logs which services connected and which are unavailable", async () => {
      mockAllLive();
      renderScreen();
      await waitForLoaded();

      expect(console.info).toHaveBeenCalledWith(
        "[AiAnalysisWorkspace] service status",
        expect.objectContaining({ connected: expect.arrayContaining(["Claims", "Claim History", "Strongest Evidence"]) })
      );
    });
  });

  it("carries the active dir (rtl/ltr) through to the root Page", async () => {
    mockAllLive();
    const { container } = renderScreen();
    await waitForLoaded();
    expect(container.querySelector(".ai-analysis-workspace-screen")).toHaveAttribute("dir", "ltr");
  });
});
