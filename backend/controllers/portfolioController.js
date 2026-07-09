async function getPortfolio(req, res, next) {
  try {
    res.json({
      portfolio: {
        totalValue: 1240000,
        change: 11.8,
        allocations: [
          { name: "Growth Leaders", value: 520000, allocation: 42 },
          { name: "Energy Transition", value: 310000, allocation: 25 },
          { name: "Defensive Income", value: 240000, allocation: 19 },
          { name: "Cash Reserve", value: 170000, allocation: 14 },
        ],
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getPortfolio };
