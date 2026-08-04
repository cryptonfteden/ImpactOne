const express = require("express");
const controller = require("../controllers/morningBriefController");

const router = express.Router();
router.get("/today", controller.getToday);
module.exports = router;
