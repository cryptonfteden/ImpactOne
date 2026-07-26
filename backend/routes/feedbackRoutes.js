const express = require("express");
const controller = require("../controllers/feedbackController");

const router = express.Router();
router.post("/", controller.submitFeedback);
router.get("/", controller.listFeedback);
module.exports = router;
