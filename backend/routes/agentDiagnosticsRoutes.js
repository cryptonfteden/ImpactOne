const express = require("express");
const controller = require("../controllers/agentDiagnosticsController");

const router = express.Router();
router.get("/", controller.getDiagnostics);
module.exports = router;
