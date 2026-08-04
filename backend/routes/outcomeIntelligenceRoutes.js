const express = require("express");
const { listLessons } = require("../controllers/outcomeIntelligenceController");

const router = express.Router();

router.get("/", listLessons);

module.exports = router;
