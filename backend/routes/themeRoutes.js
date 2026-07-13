const express = require("express");
const { listThemes, getTheme } = require("../controllers/themeController");

const router = express.Router();

router.get("/", listThemes);
router.get("/:themeKey", getTheme);

module.exports = router;
