const express = require("express");
const { resolveInviteCode, whoami } = require("../controllers/betaUserController");

const router = express.Router();

router.get("/resolve", resolveInviteCode);
router.get("/whoami", whoami);

module.exports = router;
