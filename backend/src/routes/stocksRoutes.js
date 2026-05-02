const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { getLiveStockData } = require("../services/stockDataService");

const router = express.Router();

router.get("/:ticker", requireAuth, async (req, res) => {
  try {
    const stock = await getLiveStockData(req.params.ticker);
    return res.status(200).json({ stock });
  } catch (error) {
    const message = error.message || "Failed to fetch stock data";
    const status = message.includes("Ticker") ? 404 : 400;
    return res.status(status).json({ error: message });
  }
});

module.exports = router;
