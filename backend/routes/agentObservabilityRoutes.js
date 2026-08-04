const express = require("express");
const controller = require("../controllers/agentObservabilityController");

const router = express.Router();
router.get("/:symbol", controller.getExecutionTrace);
module.exports = router;
