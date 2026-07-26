const express = require("express");
const controller = require("../controllers/systemHealthController");

const router = express.Router();
router.get("/", controller.getSystemHealth);
module.exports = router;
