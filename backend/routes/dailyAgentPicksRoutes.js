const express = require("express");
const { listDailyAgentPicks } = require("../controllers/dailyAgentPicksController");

const router = express.Router();
router.get("/", listDailyAgentPicks);
module.exports = router;
