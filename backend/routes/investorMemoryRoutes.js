const express = require("express");
const { getInvestorMemory } = require("../controllers/investorMemoryController");

const router = express.Router();

router.get("/", getInvestorMemory);

module.exports = router;
