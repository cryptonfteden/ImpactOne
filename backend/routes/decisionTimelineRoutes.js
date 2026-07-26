const express = require("express");
const controller = require("../controllers/decisionTimelineController");

const router = express.Router();
router.get("/", controller.getDecisionTimeline);
module.exports = router;
