const express = require("express");
const { requireAuth } = require("../middleware/auth");
const favoritesRepository = require("../repositories/favoritesRepository");

const router = express.Router();

router.use(requireAuth);

router.post("/", async (req, res) => {
  try {
    const { ticker, industry } = req.body;
    if (!ticker || !industry) {
      return res.status(400).json({ error: "ticker and industry are required" });
    }

    await favoritesRepository.saveFavorite({
      userId: req.user.userId,
      ticker,
      industry,
    });

    return res.status(201).json({ message: "Favorite saved" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to save favorite" });
  }
});

router.get("/", async (req, res) => {
  try {
    const favorites = await favoritesRepository.listFavoritesByUser(req.user.userId);
    return res.status(200).json({ favorites });
  } catch (error) {
    return res.status(500).json({ error: "Failed to list favorites" });
  }
});

router.get("/search", async (req, res) => {
  try {
    const industry = req.query.industry;
    if (!industry) {
      return res.status(400).json({ error: "industry query parameter is required" });
    }

    const favorites = await favoritesRepository.searchFavoritesByIndustry({
      userId: req.user.userId,
      industry,
    });
    return res.status(200).json({ favorites });
  } catch (error) {
    return res.status(500).json({ error: "Failed to search favorites" });
  }
});

module.exports = router;
