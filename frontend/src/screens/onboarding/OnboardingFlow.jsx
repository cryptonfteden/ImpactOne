import { useMemo, useState } from "react";
import { getCurrencyForCountry } from "../../utils/currency";
import InvestorProfileScreen from "../InvestorProfileScreen";

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
  const skip = () => advance();

  const selectAndAdvance = (key, value) => {
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
    const finalAnswers = { ...answers, investmentHorizon: horizon };
    setAnswers(finalAnswers);
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const profile = await onComplete(finalAnswers);
      setCreatedProfile(profile);
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
        <h1 className="onboarding-title">{current.title}</h1>
        {current.content}
        {submitError ? <p className="onboarding-error">{submitError}</p> : null}
        {current.skippable ? (
          <button type="button" className="onboarding-skip-button" onClick={skip}>
            Skip
          </button>
        ) : null}
      </div>
    </div>
  );
}
