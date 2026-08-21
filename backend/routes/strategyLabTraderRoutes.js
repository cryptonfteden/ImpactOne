const router = require("express").Router();
const controller = require("../controllers/strategyLabTraderController");

router.get("/", controller.status);
router.post("/run", controller.run);
router.post("/reset", controller.reset);
router.post("/weekly-report", controller.weeklyReport);

module.exports = router;
