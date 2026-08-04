const express = require("express");
const controller = require("../controllers/errorReportController");

const router = express.Router();
router.post("/", controller.reportError);
router.get("/", controller.listErrorReports);
module.exports = router;
