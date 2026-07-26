const express = require("express");
const controller = require("../controllers/newsSourceScoringController");

const router = express.Router();
router.get("/", controller.listSourceScores);
router.get("/:sourceName", controller.getSourceScore);
module.exports = router;
