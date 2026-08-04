const express = require("express");
const controller = require("../controllers/dynamicSourceScoringController");

const router = express.Router();
router.get("/:sourceName/history", controller.getSnapshotHistory);
router.get("/:sourceName", controller.getDynamicCredibility);
module.exports = router;
