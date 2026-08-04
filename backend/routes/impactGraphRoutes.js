const express = require("express");
const controller = require("../controllers/impactGraphController");

const router = express.Router();
// Specific paths first, so "portfolio"/"workspace" are never swallowed by
// the :symbol wildcard below.
router.get("/portfolio", controller.getPortfolioImpactGraph);
router.get("/workspace/:folderId", controller.getWorkspaceImpactGraph);
router.get("/:symbol", controller.getImpactGraph);
module.exports = router;
