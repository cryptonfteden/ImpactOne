const express = require("express");
const controller = require("../controllers/workspaceController");

const router = express.Router();
router.get("/:id", controller.getWorkspace);
router.post("/:id/notes", controller.addNote);
router.get("/:id/decisions", controller.getDecisionHistory);
module.exports = router;
