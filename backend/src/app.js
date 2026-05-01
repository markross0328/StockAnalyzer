const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const favoritesRoutes = require("./routes/favoritesRoutes");
const stocksRoutes = require("./routes/stocksRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/favorites", favoritesRoutes);
app.use("/stocks", stocksRoutes);

module.exports = app;
