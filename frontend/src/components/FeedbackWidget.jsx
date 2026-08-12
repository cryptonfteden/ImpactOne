import { memo, useRef, useState } from "react";
import { Button } from "./ui";
import { feedbackApi } from "../services/api";
import { trackEvent } from "../utils/analytics";
import { logError } from "../utils/errorHandling";

const TYPES = [
  { key: "BUG", label: "Bug" },
  { key: "SUGGESTION", label: "Suggestion" },
  { key: "QUESTION", label: "Question" },
  { key: "PRAISE", label: "Praise" },
];

// Phase X9 — Part 2, Feedback System. A real, always-reachable in-app
// widget — every beta user can submit Bug/Suggestion/Question/Praise
// without leaving the screen they're on. Screen/browser/version are
// captured automatically at submit time, never asked of the user.
function FeedbackWidget({ currentScreen }) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState("SUGGESTION");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef(null);

  // Phase MOBILE-FIXES-001 — confirmed P0 #5: defensive keyboard-
  // avoidance. This panel is itself `position: absolute` inside the
  // widget's `position: fixed` root — on many mobile browsers a fixed-
  // position element stays pinned to the layout viewport rather than
  // the real, visible one once the on-screen keyboard opens, so the
  // textarea (and the Send button below it) can end up covered by the
  // keyboard with no way to scroll it into view. Scrolling the focused
  // field into view on focus is the standard, minimal defensive fix —
  // it's a real no-op on desktop/no-keyboard environments.
  function handleTextareaFocus() {
    // rAF: wait one real frame for the keyboard's opening animation to
    // have started resizing the visual viewport before measuring/
    // scrolling, rather than scrolling against the pre-keyboard layout.
    requestAnimationFrame(() => {
      textareaRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }

  async function submit() {
    const trimmed = message.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    setError("");
    try {
      await feedbackApi.submit({
        type,
        message: trimmed,
        screen: currentScreen,
        browser: typeof navigator !== "undefined" ? navigator.userAgent : null,
        appVersion: import.meta.env.VITE_APP_VERSION || "dev",
      });
      trackEvent("feedback_submitted", { feedbackType: type });
      setSubmitted(true);
      setMessage("");
    } catch (submitError) {
      logError("feedback submit failed", submitError);
      setError("Couldn't send that just now. Please try again in a moment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={`feedback-widget${isOpen ? " is-open" : ""}`}>
      <Button type="button" className="feedback-widget__toggle" onClick={() => setIsOpen((value) => !value)} aria-label="Give feedback">
        <span className="feedback-widget__live-dot" aria-hidden="true" />Feedback
      </Button>
      {isOpen ? (
        <div className="panel-card feedback-widget__panel">
          {submitted ? (
            <>
              <p className="company-description">Thank you — your {type.toLowerCase()} was sent.</p>
              <Button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setSubmitted(false);
                  setIsOpen(false);
                }}
              >
                Close
              </Button>
            </>
          ) : (
            <>
              <p className="panel-card__eyebrow">What kind of feedback?</p>
              <div className="decision-filters" role="group" aria-label="Feedback type">
                {TYPES.map((option) => (
                  <Button
                    key={option.key}
                    type="button"
                    className={`ghost-button${type === option.key ? " active" : ""}`}
                    onClick={() => setType(option.key)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <textarea
                ref={textareaRef}
                className="feedback-widget__textarea"
                placeholder="Tell us what's on your mind..."
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onFocus={handleTextareaFocus}
                rows={4}
              />
              {error ? <p className="company-description negative">{error}</p> : null}
              <Button type="button" className="primary-action" onClick={submit} disabled={isSubmitting || !message.trim()}>
                {isSubmitting ? "Sending..." : "Send feedback"}
              </Button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default memo(FeedbackWidget);
