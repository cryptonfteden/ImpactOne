// One structural quality gate for every committee consumer. A successful
// process is not necessarily usable investment evidence: an agent can finish
// normally while its real provider returned stale, empty or insufficient
// data. Explicit false always wins. Legacy/custom agents that do not expose a
// flag remain eligible for backwards compatibility.
function decisionEligibilityFlag(agentResult) {
  const candidates = [
    agentResult?.signalEligible,
    agentResult?.result?.signalEligible,
    agentResult?.raw?.signalEligible,
    agentResult?.result?.raw?.signalEligible,
    agentResult?.dataQuality?.signalEligible,
    agentResult?.raw?.dataQuality?.signalEligible,
    agentResult?.result?.raw?.dataQuality?.signalEligible,
  ].filter((value) => typeof value === "boolean");
  return candidates.includes(false) ? false : candidates.includes(true) ? true : null;
}

function isDecisionEligible(agentResult) {
  if (agentResult?.status && agentResult.status !== "fulfilled") return false;
  const raw = agentResult?.result?.raw || agentResult?.raw || agentResult?.result || agentResult;
  if (raw?.dataAvailable === false || raw?.dataQuality?.dataAvailable === false) return false;
  return decisionEligibilityFlag(agentResult) !== false;
}

module.exports = { decisionEligibilityFlag, isDecisionEligible };
