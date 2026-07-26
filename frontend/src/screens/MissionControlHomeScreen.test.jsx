import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import MissionControlHomeScreen from "./MissionControlHomeScreen";
import { I18nProvider } from "../i18n/I18nProvider";
import { todaysBrief, sessionSummary } from "./missionControl/missionControlMockData";

function renderScreen(props) {
  return render(
    <I18nProvider>
      <MissionControlHomeScreen {...props} />
    </I18nProvider>
  );
}

async function waitForLoaded() {
  await waitFor(() => expect(screen.getByText("Today's briefing")).toBeInTheDocument());
}

describe("MissionControlHomeScreen — Phase MISSION-CONTROL-001", () => {
  it("shows a loading skeleton before the deterministic briefing resolves", async () => {
    renderScreen();
    expect(screen.getByLabelText("Assembling today's briefing")).toBeInTheDocument();
    await waitForLoaded();
  });

  describe("Tier 1 — The Brief", () => {
    it("renders exactly one hero (Top Priority) as the screen's unmistakable starting point", async () => {
      renderScreen();
      await waitForLoaded();

      const briefRegion = screen.getByRole("region", { name: "Today's Brief" });
      expect(within(briefRegion).getByText("Top Priority")).toBeInTheDocument();
      expect(within(briefRegion).getByText(todaysBrief[0].headline)).toBeInTheDocument();
      expect(within(briefRegion).getByText(todaysBrief[0].whyItMatters)).toBeInTheDocument();
    });

    it("collapses Today's Brief to a bounded set with a real hidden-count affordance", async () => {
      renderScreen();
      await waitForLoaded();

      const briefRegion = screen.getByRole("region", { name: "Today's Brief" });
      // 5 total items, 1 is the hero; the remaining 4 collapse to 2 visible + "+2 more".
      expect(within(briefRegion).getByText("+2 more")).toBeInTheDocument();
    });

    it("expands Today's Brief to show every real item when the user asks for more", async () => {
      renderScreen();
      await waitForLoaded();

      const briefRegion = screen.getByRole("region", { name: "Today's Brief" });
      fireEvent.click(within(briefRegion).getByText("+2 more"));

      for (const item of todaysBrief.slice(1)) {
        expect(within(briefRegion).getByText(item.headline)).toBeInTheDocument();
      }
      expect(within(briefRegion).getByText("Show less")).toBeInTheDocument();
    });

    it("reveals a Brief row's one-sentence explanation only on expand, never by default", async () => {
      renderScreen();
      await waitForLoaded();

      const briefRegion = screen.getByRole("region", { name: "Today's Brief" });
      const secondItem = todaysBrief[1];
      expect(within(briefRegion).queryByText(secondItem.whyItMatters)).not.toBeInTheDocument();

      fireEvent.click(within(briefRegion).getByText(secondItem.headline));
      expect(within(briefRegion).getByText(secondItem.whyItMatters)).toBeInTheDocument();
    });
  });

  describe("Tier 2 — Your Signals", () => {
    it("renders Portfolio Intelligence with a real 'what changed since yesterday' comparison", async () => {
      renderScreen();
      await waitForLoaded();

      const region = screen.getByRole("region", { name: "Your Signals" });
      expect(within(region).getByText("Portfolio Intelligence")).toBeInTheDocument();
      expect(within(region).getByText(/Total portfolio value/)).toBeInTheDocument();
      expect(within(region).getByText(/\+1\.8% since yesterday/)).toBeInTheDocument();
    });

    it("renders Biggest Risk and Best Opportunity as a visually paired, comparable set", async () => {
      renderScreen();
      await waitForLoaded();

      const region = screen.getByRole("region", { name: "Your Signals" });
      expect(within(region).getByText("Biggest Risk")).toBeInTheDocument();
      expect(within(region).getByText("Best Opportunity")).toBeInTheDocument();
      expect(within(region).getByText(/META ad pricing is softening/)).toBeInTheDocument();
      expect(within(region).getByText(/NVDA looks set to keep beating expectations/)).toBeInTheDocument();
    });
  });

  describe("Tier 3 — Context", () => {
    it("renders Claims Changing with a plain-language status and a real reason for every transition", async () => {
      renderScreen();
      await waitForLoaded();

      const region = screen.getByRole("region", { name: "Context" });
      const claimsCard = within(region).getByText("Claims Changing").closest(".nova-card");
      expect(within(claimsCard).getByText("Getting more likely")).toBeInTheDocument();
      expect(within(claimsCard).getByText("Getting less likely")).toBeInTheDocument();
      expect(within(claimsCard).getByText("No longer holds up")).toBeInTheDocument();
      expect(within(claimsCard).getByText(/Supply-constraint evidence strengthened overnight/)).toBeInTheDocument();
    });

    it("renders Market Pulse as real, disclosed, market-wide context", async () => {
      renderScreen();
      await waitForLoaded();

      const region = screen.getByRole("region", { name: "Context" });
      expect(within(region).getByText("Market Pulse")).toBeInTheDocument();
      expect(within(region).getByText(/mildly risk-on/)).toBeInTheDocument();
    });

    it("shows a one-line Live Intelligence teaser with a real count, never a full inline feed", async () => {
      renderScreen();
      await waitForLoaded();

      const region = screen.getByRole("region", { name: "Context" });
      expect(within(region).getByText("14 more items in today's feed")).toBeInTheDocument();
    });

    it("navigates to the Daily Feed screen from the Live Intelligence teaser", async () => {
      const onNavigate = vi.fn();
      renderScreen({ onNavigate });
      await waitForLoaded();

      fireEvent.click(screen.getByText("Open Daily Feed"));
      expect(onNavigate).toHaveBeenCalledWith("Daily Feed");
    });

    it("closes the briefing with a deliberate, computed Session Summary line", async () => {
      renderScreen();
      await waitForLoaded();

      const region = screen.getByRole("region", { name: "Context" });
      expect(
        within(region).getByText(
          `That's today's briefing: ${sessionSummary.highAttentionCount} item needs your attention, ${sessionSummary.mediumAttentionCount} are worth knowing, and ${sessionSummary.lowAttentionCount} are quiet.`
        )
      ).toBeInTheDocument();
    });
  });

  it("carries the active dir (rtl/ltr) through to the root Page", async () => {
    const { container } = renderScreen();
    await waitForLoaded();
    expect(container.querySelector(".mission-control-screen")).toHaveAttribute("dir", "ltr");
  });
});
