const express = require("express");
const controller = require("../controllers/marketIntelligenceController");

const router = express.Router();

// Sprint 37 — Market Intelligence Source Layer. All read-only aggregation/
// normalization views except the research-principles registration —
// nothing here places a trade, modifies a portfolio, or produces a
// verdict; see each service's own safety-critical header comment.
router.get("/provider-inventory", controller.getProviderInventory);
router.get("/evidence-matrix/:symbol", controller.getEvidenceMatrix);
router.get("/technical/:symbol", controller.getTechnical);
router.get("/social-influence", controller.getSocialInfluence);
router.get("/analyst-consensus/:symbol", controller.getAnalystConsensus);
router.get("/crypto-derivatives/:symbol", controller.getCryptoDerivatives);
router.get("/options/:symbol", controller.getOptions);
router.get("/cot/:market", controller.getCot);
router.get("/research-principles", controller.listResearchPrinciples);
router.post("/research-principles", controller.registerResearchPrinciple);
router.get("/research-principles/:id/test-status", controller.getResearchPrincipleTestStatus);

module.exports = router;
