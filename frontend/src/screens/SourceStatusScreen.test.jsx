import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SourceStatusScreen from "./SourceStatusScreen";

const get = vi.fn();
vi.mock("../services/api", () => ({ systemHealthApi: { get: (...args) => get(...args) } }));

describe("SourceStatusScreen", () => {
  beforeEach(() => get.mockReset());

  it("shows source, availability and freshness without disguising missing data", async () => {
    get.mockResolvedValue({ generatedAt: "2026-08-19T10:00:00.000Z", overall: "UNKNOWN", modules: {
      marketData: { status: "HEALTHY", detail: "Live quote retrieved.", latencyMs: 42 },
      ai: { status: "UNKNOWN", detail: "OPENAI_API_KEY is not configured.", latencyMs: 1 },
    }});
    render(<SourceStatusScreen />);
    await waitFor(() => expect(screen.getByText("Market prices")).toBeInTheDocument());
    expect(screen.getByText("Finnhub + verified chart fallback")).toBeInTheDocument();
    expect(screen.getByText("AI summaries")).toBeInTheDocument();
    expect(screen.getByText("OPENAI_API_KEY is not configured.")).toBeInTheDocument();
    expect(screen.getByText(/missing sources are never replaced/i)).toBeInTheDocument();
  });
});
