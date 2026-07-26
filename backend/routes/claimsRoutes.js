const express = require("express");
const controller = require("../controllers/claimsController");

const router = express.Router();
router.get("/active", controller.getActiveClaims);
router.get("/contested", controller.getContestedClaims);
router.get("/invalidated", controller.getRecentlyInvalidatedClaims);
router.get("/resolved", controller.getRecentlyResolvedClaims);
router.get("/portfolio-relevant", controller.getPortfolioRelevantClaims);
router.get("/overnight-changes", controller.getOvernightChanges);
router.get("/symbols/:symbol", controller.getClaimsBySymbol);
router.get("/:claimId/history", controller.getClaimHistory);
router.get("/:claimId/strongest-evidence", controller.getStrongestEvidence);
module.exports = router;
