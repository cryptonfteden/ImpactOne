import { useState } from "react";
import SectionCard from "../SectionCard";
import { Button, Input, Skeleton } from "../ui";
import { chatApi } from "../../services/api";
import { logError } from "../../utils/errorHandling";

const SUGGESTED_QUESTIONS = [
  "What is the biggest risk in my portfolio?",
  "What changed in the market today?",
  "Which watchlist name should I watch closely?",
];

/**
 * Spec §4.7 Ask ImpactOne Panel — natural-language questions without
 * leaving the dashboard. Self-contained: owns its own request state and
 * message list (session-only, not persisted — see Sprint 15 plan).
 */
export default function AskImpactOnePanel({ context = {} }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState("");

  const submitQuestion = async (text) => {
    const trimmed = String(text || "").trim();
    if (!trimmed || isAsking) {
      return;
    }

    setIsAsking(true);
    setError("");
    setMessages((current) => [...current, { role: "question", text: trimmed }]);
    setQuestion("");

    try {
      const result = await chatApi.ask({ question: trimmed, context });
      setMessages((current) => [...current, { role: "answer", text: result.answer, source: result.source, contextUsed: context }]);
    } catch (askError) {
      logError("Ask ImpactOne failed", askError);
      setError(askError?.message || "Unable to reach Ask ImpactOne right now.");
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <SectionCard title="Ask ImpactOne" subtitle="Ask a question, no need to leave the dashboard" className="screen-card">
      <div className="ask-panel">
        <div className="ask-panel__chips">
          {SUGGESTED_QUESTIONS.map((suggestion) => (
            <Button key={suggestion} type="button" className="ghost-button" onClick={() => submitQuestion(suggestion)} disabled={isAsking}>
              {suggestion}
            </Button>
          ))}
        </div>

        <div className="ask-panel__messages">
          {messages.length ? messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`ask-panel__message ask-panel__message--${message.role}`}>
              <p>{message.text}</p>
              {message.role === "answer" && message.contextUsed && Object.keys(message.contextUsed).length ? (
                <p className="company-description subtle">Context used: {Object.keys(message.contextUsed).join(", ")}</p>
              ) : null}
            </div>
          )) : <p className="company-description subtle">Ask a question above or pick a suggestion to get started.</p>}
          {isAsking ? <Skeleton variant="text" count={2} /> : null}
        </div>

        {error ? <p className="company-description negative">{error}</p> : null}

        <form
          className="order-form"
          onSubmit={(event) => {
            event.preventDefault();
            submitQuestion(question);
          }}
        >
          <Input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about a ticker, portfolio, or market event"
          />
          <Button type="submit" className="ghost-button" disabled={isAsking}>{isAsking ? "Asking..." : "Ask"}</Button>
        </form>
      </div>
    </SectionCard>
  );
}
