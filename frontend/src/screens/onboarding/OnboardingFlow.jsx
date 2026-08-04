import { useMemo, useState } from "react";
import { getCurrencyForCountry } from "../../utils/currency";
import InvestorProfileScreen from "../InvestorProfileScreen";
import { trackEvent } from "../../utils/analytics";

const COUNTRY_OPTIONS = [
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "IL", label: "Israel" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "OTHER", label: "Other" },
];

const EXPERIENCE_OPTIONS = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
];

const GOAL_OPTIONS = [
  { value: "WEALTH", label: "Wealth" },
  { value: "RETIREMENT", label: "Retirement" },
  { value: "PASSIVE_INCOME", label: "Passive income" },
  { value: "LEARNING", label: "Learning" },
  { value: "HOUSE", label: "House" },
  { value: "OTHER", label: "Other" },
];

const RISK_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

const HORIZON_OPTIONS = [
  { value: "SHORT_TERM", label: "Less than 1 year" },
  { value: "MEDIUM_TERM", label: "1-5 years" },
  { value: "LONG_TERM", label: "5+ years" },
];

const MONTHLY_AMOUNT_OPTIONS = [100, 500, 1000, 2500];

const TOTAL_STEPS = 7;

// Sprint 40 — one key per step, in step order, used for per-step
// completed/skipped analytics (matches each step's real answers field
// name so a future audit can join telemetry back to what the question
// actually collects).
const STEP_KEYS = ["age", "country", "experienceLevel", "monthlyInvestmentAmount", "investmentGoal", "riskTolerance", "investmentHorizon"];

function ChipGroup({ options, onSelect, selectedValue }) {
  return (
    <div className="onboarding-chip-group" role="group">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`onboarding-chip${selectedValue === option.value ? " selected" : ""}`}
          onClick={() => onSelect(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Sprint 20, Part 1 — full-screen onboarding takeover, one question per
 * step, single tap advances automatically (age and a custom monthly amount
 * are the only steps requiring typed entry + an explicit Continue). Only
 * age is required; every other step can be skipped. Designed to complete
 * in well under 60 seconds.
 */
export default function OnboardingFlow({ onComplete, onFinish }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [ageInput, setAgeInput] = useState("");
  const [ageError, setAgeError] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [showCustomAmount, setShowCustomAmount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [createdProfile, setCreatedProfile] = useState(null);

  const currencySymbol = useMemo(() => getCurrencyForCountry(answers.country), [answers.country]);

  const advance = () => setStep((current) => Math.min(current + 1, TOTAL_STEPS - 1));
  // Sprint 40 — Onboarding drop-off measurement. Every question must
  // justify itself; per-step completed/skipped events (missing before
  // this sprint — only overall completion was tracked) are what let a
  // future sprint actually see which questions people skip and decide
  // whether to remove them, rather than guessing.
  const skip = () => {
    trackEvent("onboarding_step_skipped", { stepKey: STEP_KEYS[step], stepIndex: step });
    advance();
  };
  // Sprint 36 Priority 2 — reduce onboarding friction. Age and investment
  // horizon are the only two required answers; the five steps between
  // them are already individually skippable, but a user who wants to
  // reach Home fast still had to tap "Skip" five separate times (five
  // full screen transitions) to get there. This jumps straight to the
  // final required step in one tap, without touching any already-
  // answered value in `answers` — a user who answered some questions and
  // then taps this keeps those real answers, only the ones they hadn't
  // reached yet stay unset.
  const skipToEnd = () => {
    for (let index = step; index < TOTAL_STEPS - 1; index += 1) {
      trackEvent("onboarding_step_skipped", { stepKey: STEP_KEYS[index], stepIndex: index });
    }
    setStep(TOTAL_STEPS - 1);
  };
  // Sprint 33 Priority 4 — mobile onboarding requires back navigation
  // without losing already-entered answers. `answers` (and ageInput/
  // customAmount) already persist across the whole flow in this
  // component's own state, so simply decrementing step is data-safe:
  // nothing is cleared, and each step's inputs read back from that state.
  const goBack = () => setStep((current) => Math.max(current - 1, 0));

  const selectAndAdvance = (key, value) => {
    trackEvent("onboarding_step_completed", { stepKey: key, stepIndex: step });
    setAnswers((current) => ({ ...current, [key]: value }));
    setTimeout(advance, 150);
  };

  const handleAgeContinue = () => {
    const parsed = Number(ageInput);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 5 || parsed > 120) {
      setAgeError("Enter a valid age to continue.");
      return;
    }
    setAgeError("");
    trackEvent("onboarding_step_completed", { stepKey: "age", stepIndex: step });
    setAnswers((current) => ({ ...current, age: parsed }));
    advance();
  };

  const handleMonthlyAmountSelect = (amount) => {
    if (amount === "custom") {
      setShowCustomAmount(true);
      return;
    }
    selectAndAdvance("monthlyInvestmentAmount", amount);
  };

  const handleCustomAmountContinue = () => {
    const parsed = Number(customAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }
    selectAndAdvance("monthlyInvestmentAmount", parsed);
  };

  const handleFinish = async (horizon) => {
    trackEvent("onboarding_step_completed", { stepKey: "investmentHorizon", stepIndex: step });
    const finalAnswers = { ...answers, investmentHorizon: horizon };
    setAnswers(finalAnswers);
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const profile = await onComplete(finalAnswers);
      setCreatedProfile(profile);
      trackEvent("onboarding_completed");
    } catch (error) {
      setSubmitError(error?.message || "Something went wrong creating your profile. Please try again.");
      setIsSubmitting(false);
    }
  };

  const steps = [
    {
      title: "How old are you?",
      content: (
        <div className="onboarding-numeric-step">
          <input
            type="number"
            inputMode="numeric"
            className="onboarding-numeric-input"
            placeholder="Age"
            value={ageInput}
            onChange={(event) => setAgeInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleAgeContinue()}
            autoFocus
          />
          {ageError ? <p className="onboarding-error">{ageError}</p> : null}
          <button type="button" className="onboarding-continue-button" onClick={handleAgeContinue}>
            Continue
          </button>
        </div>
      ),
      skippable: false,
    },
    {
      title: "Where are you investing from?",
      content: <ChipGroup options={COUNTRY_OPTIONS} selectedValue={answers.country} onSelect={(value) => selectAndAdvance("country", value)} />,
      skippable: true,
    },
    {
      title: "How experienced are you as an investor?",
      content: <ChipGroup options={EXPERIENCE_OPTIONS} selectedValue={answers.experienceLevel} onSelect={(value) => selectAndAdvance("experienceLevel", value)} />,
      skippable: true,
    },
    {
      title: "How much can you invest monthly?",
      content: (
        <div>
          <div className="onboarding-chip-group" role="group">
            {MONTHLY_AMOUNT_OPTIONS.map((amount) => (
              <button key={amount} type="button" className="onboarding-chip" onClick={() => handleMonthlyAmountSelect(amount)}>
                {currencySymbol}
                {amount.toLocaleString()}
              </button>
            ))}
            <button type="button" className="onboarding-chip" onClick={() => handleMonthlyAmountSelect("custom")}>
              Custom
            </button>
          </div>
          {showCustomAmount ? (
            <div className="onboarding-numeric-step">
              <input
                type="number"
                inputMode="decimal"
                className="onboarding-numeric-input"
                placeholder={`${currencySymbol} amount`}
                value={customAmount}
                onChange={(event) => setCustomAmount(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleCustomAmountContinue()}
                autoFocus
              />
              <button type="button" className="onboarding-continue-button" onClick={handleCustomAmountContinue}>
                Continue
              </button>
            </div>
          ) : null}
        </div>
      ),
      skippable: true,
    },
    {
      title: "What's your main investment goal?",
      content: <ChipGroup options={GOAL_OPTIONS} selectedValue={answers.investmentGoal} onSelect={(value) => selectAndAdvance("investmentGoal", value)} />,
      skippable: true,
    },
    {
      title: "How would you describe your risk tolerance?",
      content: <ChipGroup options={RISK_OPTIONS} selectedValue={answers.riskTolerance} onSelect={(value) => selectAndAdvance("riskTolerance", value)} />,
      skippable: true,
    },
    {
      title: "What's your investment horizon?",
      content: <ChipGroup options={HORIZON_OPTIONS} selectedValue={answers.investmentHorizon} onSelect={handleFinish} />,
      skippable: false,
    },
  ];

  const current = steps[step];

  if (createdProfile) {
    return (
      <div className="onboarding-shell">
        <div className="onboarding-card" style={{ maxWidth: 640 }}>
          <InvestorProfileScreen profile={createdProfile} onGetStarted={onFinish} />
        </div>
      </div>
    );
  }

  if (isSubmitting) {
    return (
      <div className="onboarding-shell">
        <div className="onboarding-card onboarding-card--centered">
          <p className="onboarding-title">Building your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-shell">
      <div className="onboarding-card" key={step}>
        <div className="onboarding-progress" aria-label={`Step ${step + 1} of ${TOTAL_STEPS}`}>
          {steps.map((_, index) => (
            <span key={index} className={`onboarding-progress-dot${index === step ? " active" : ""}${index < step ? " complete" : ""}`} />
          ))}
        </div>
        {step > 0 ? (
          <button type="button" className="onboarding-back-button" onClick={goBack} aria-label="Back to previous question">
            ← Back
          </button>
        ) : null}
        <h1 className="onboarding-title">{current.title}</h1>
        {current.content}
        {submitError ? <p className="onboarding-error">{submitError}</p> : null}
        {current.skippable ? (
          <div className="onboarding-skip-row">
            <button type="button" className="onboarding-skip-button" onClick={skip}>
              Skip
            </button>
            {step < TOTAL_STEPS - 2 ? (
              <button type="button" className="onboarding-skip-button onboarding-skip-button--all" onClick={skipToEnd}>
                Skip remaining questions
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
