const express = require("express");
const controller = require("../controllers/watchlistFolderController");

const router = express.Router();

router.get("/", controller.listFolders);
router.post("/", controller.createFolder);
router.patch("/:id", controller.renameFolder);
router.delete("/:id", controller.deleteFolder);
router.post("/:id/symbols", controller.addSymbol);
router.delete("/:id/symbols/:symbol", controller.removeSymbol);
router.post("/:id/move", controller.moveSymbol);
router.patch("/:id/symbols/:symbol", controller.setItemFlags);

module.exports = router;
