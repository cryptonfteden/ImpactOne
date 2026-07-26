const express = require("express");
const controller = require("../controllers/personalizationController");

const router = express.Router();
router.get("/", controller.getPersonalizationProfile);
module.exports = router;
