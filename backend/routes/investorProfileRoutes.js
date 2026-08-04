const express = require("express");
const {
  getInvestorProfile,
  createInvestorProfile,
  updateInvestorProfile,
  getInvestmentProfile,
} = require("../controllers/investorProfileController");

const router = express.Router();

router.get("/investment-profile", getInvestmentProfile);
router.get("/", getInvestorProfile);
router.post("/", createInvestorProfile);
router.patch("/", updateInvestorProfile);

module.exports = router;
