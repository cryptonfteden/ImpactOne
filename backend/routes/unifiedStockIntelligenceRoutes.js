const express = require("express");
const controller = require("../controllers/unifiedStockIntelligenceController");

const router = express.Router();
router.get("/:symbol", controller.getUnifiedIntelligence);
module.exports = router;
