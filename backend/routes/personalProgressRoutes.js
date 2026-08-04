const express = require("express");
const { getPersonalProgress } = require("../controllers/personalProgressController");

const router = express.Router();

router.get("/", getPersonalProgress);

module.exports = router;
