const express = require("express");
const { askImpactOneController } = require("../controllers/chatController");

const router = express.Router();

router.post("/ask", askImpactOneController);

module.exports = router;
