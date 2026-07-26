const express = require("express");
const controller = require("../controllers/notificationController");

const router = express.Router();

router.get("/", controller.listNotifications);
router.patch("/:id/read", controller.markRead);
router.post("/:id/pin", controller.pin);
router.post("/:id/unpin", controller.unpin);
router.delete("/:id", controller.clearNotification);

module.exports = router;
