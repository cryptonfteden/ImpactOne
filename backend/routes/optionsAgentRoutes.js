const express = require("express");
const controller = require("../controllers/optionsAgentController");

const router = express.Router();
router.get("/status", controller.getStatus);
router.get("/signals", controller.listSignals);
router.get("/signals/:signalId", controller.getSignalById);
router.get("/symbols/:symbol", controller.getSymbolView);
module.exports = router;
