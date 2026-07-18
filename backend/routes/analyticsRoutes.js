const express = require("express");
const { recordEvent } = require("../controllers/analyticsController");

const router = express.Router();

router.post("/event", recordEvent);

module.exports = router;
