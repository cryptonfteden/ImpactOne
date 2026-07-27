const express = require("express");
const controller = require("../controllers/agentOrchestratorController");

const router = express.Router();
router.get("/:symbol", controller.getStockIntelligence);
module.exports = router;
