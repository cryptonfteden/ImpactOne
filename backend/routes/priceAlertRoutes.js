const express = require("express");
const controller = require("../controllers/priceAlertController");

const router = express.Router();

router.get("/", controller.listAlerts);
router.post("/", controller.createAlert);
router.post("/check", controller.checkAlerts);
router.patch("/:id/deactivate", controller.deactivateAlert);
router.delete("/:id", controller.deleteAlert);

module.exports = router;
