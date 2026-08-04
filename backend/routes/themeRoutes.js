const express = require("express");
const { listThemes, getTheme, getThemeEvolution, recordThemeView } = require("../controllers/themeController");

const router = express.Router();

router.get("/", listThemes);
router.get("/:themeKey/evolution", getThemeEvolution);
router.post("/:themeKey/view", recordThemeView);
router.get("/:themeKey", getTheme);

module.exports = router;
