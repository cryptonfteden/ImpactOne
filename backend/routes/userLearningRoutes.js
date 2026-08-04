const express = require("express");
const controller = require("../controllers/userLearningController");

const router = express.Router();
router.get("/", controller.getUserLearningProfile);
module.exports = router;
