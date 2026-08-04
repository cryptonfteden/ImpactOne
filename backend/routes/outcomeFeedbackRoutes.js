const express = require("express");
const controller = require("../controllers/outcomeFeedbackController");

const router = express.Router();
router.get("/adjustments", controller.getScoringAdjustments);
router.get("/audit", controller.getAuditHistory);
module.exports = router;
