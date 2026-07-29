// Phase INSTITUTIONAL-AGENT-001 — a disclosed, hand-set, REAL cohort of
// major institutional investment managers, each identified by their
// real, verified SEC EDGAR CIK (confirmed during development: each CIK
// below was independently checked against SEC's own
// data.sec.gov/submissions feed to confirm it (a) returns a real
// company `name` matching the manager, and (b) has real `13F-HR`
// filings on record).
//
// This is explicitly NOT the full universe of 13F filers (there are
// ~5,000 per quarter) — that would require a paid, pre-aggregated
// institutional-ownership dataset (e.g. WhaleWisdom, Fintel) this
// environment does not have. Every metric this agent computes is
// scoped to real 13F data from exactly this disclosed cohort, never
// presented as the full institutional ownership picture — see
// INSTITUTIONAL_AGENT.md's honest-limitations section.
const INSTITUTIONAL_MANAGERS = [
  { name: "Berkshire Hathaway Inc", cik: "0001067983" },
  { name: "Renaissance Technologies LLC", cik: "0001037389" },
  { name: "Bridgewater Associates, LP", cik: "0001350694" },
  { name: "Citadel Advisors LLC", cik: "0001423053" },
  { name: "AQR Capital Management LLC", cik: "0001167557" },
  { name: "Two Sigma Advisers, LP", cik: "0001478735" },
  { name: "Millennium Management LLC", cik: "0001273087" },
];

module.exports = { INSTITUTIONAL_MANAGERS };
