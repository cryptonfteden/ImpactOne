const express = require("express");
const controller = require("../controllers/marketMemoryController");

const router = express.Router();
router.get("/similar", controller.getSimilarHistory);
module.exports = router;
