const express = require("express");
const controller = require("../controllers/methodologyVersioningController");

const router = express.Router();
router.get("/", controller.listVersions);
router.post("/", controller.recordVersion);
router.post("/:version/rollback", controller.rollback);
module.exports = router;
