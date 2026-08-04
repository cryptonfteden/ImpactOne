const express = require("express");
const controller = require("../controllers/featureFlagController");

const router = express.Router();
router.get("/", controller.listFlags);
router.get("/:key/evaluate", controller.evaluateFlag);
router.patch("/:key", controller.setFlag);
module.exports = router;
