const express = require("express");
const controller = require("../controllers/insiderOpportunityController");

const router = express.Router();
router.get("/", controller.listInsiderOpportunities);
module.exports = router;
