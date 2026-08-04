const express = require("express");
const controller = require("../controllers/executiveDashboardController");

const router = express.Router();
router.get("/", controller.getExecutiveDashboard);
module.exports = router;
