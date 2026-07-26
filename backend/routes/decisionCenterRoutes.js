const express = require("express");
const controller = require("../controllers/decisionCenterController");

const router = express.Router();
router.get("/", controller.getDecisions);
router.post("/:id/pin", controller.pin);
router.post("/:id/dismiss", controller.dismiss);
router.post("/:id/complete", controller.complete);
router.delete("/:id/status", controller.clearStatus);
module.exports = router;
