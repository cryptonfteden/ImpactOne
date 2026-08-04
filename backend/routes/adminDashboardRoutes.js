const express = require("express");
const controller = require("../controllers/adminDashboardController");

const router = express.Router();
router.get("/", controller.getAdminDashboard);
module.exports = router;
