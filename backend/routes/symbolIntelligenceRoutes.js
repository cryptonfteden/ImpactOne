const express = require("express");
const controller = require("../controllers/symbolIntelligenceController");

const router = express.Router();
router.get("/:symbol", controller.getSymbolIntelligence);
module.exports = router;
