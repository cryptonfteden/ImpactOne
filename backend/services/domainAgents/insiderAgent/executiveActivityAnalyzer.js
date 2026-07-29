// Phase INSIDER-AGENT-001 — "CEO/CFO transactions". Filters real
// transactions to those whose real, filed `officerTitle` text matches a
// disclosed, hand-set CEO/CFO title pattern — real title text varies
// ("Chief Executive Officer", "President and CEO", etc.), so this is a
// pattern match against real filed text, never an inferred/fabricated
// role assignment.
const CEO_TITLE_PATTERN = /chief executive officer|\bceo\b/i;
const CFO_TITLE_PATTERN = /chief financial officer|\bcfo\b/i;

/**
 * @param {Array<object>} transactions - real Form 4 non-derivative transactions
 * @returns {{ ceoTransactions: Array<object>, cfoTransactions: Array<object>, hasCeoActivity: boolean, hasCfoActivity: boolean }}
 */
function analyzeExecutiveActivity(transactions) {
  const ceoTransactions = transactions.filter((t) => t.officerTitle && CEO_TITLE_PATTERN.test(t.officerTitle));
  const cfoTransactions = transactions.filter((t) => t.officerTitle && CFO_TITLE_PATTERN.test(t.officerTitle));

  return {
    ceoTransactions,
    cfoTransactions,
    hasCeoActivity: ceoTransactions.length > 0,
    hasCfoActivity: cfoTransactions.length > 0,
  };
}

module.exports = { analyzeExecutiveActivity, CEO_TITLE_PATTERN, CFO_TITLE_PATTERN };
