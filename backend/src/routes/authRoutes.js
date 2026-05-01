const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const userRepository = require("../repositories/userRepository");
const revokedTokenRepository = require("../repositories/revokedTokenRepository");
const { createAccessToken, verifyAccessToken } = require("../services/tokenService");

const router = express.Router();

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email, and password are required" });
    }

    const existingUser = await userRepository.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "Email is already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      userId: crypto.randomUUID(),
      email: email.toLowerCase(),
      name,
      passwordHash,
    };
    await userRepository.createUser(user);

    const { token } = createAccessToken(user);
    return res.status(201).json({
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create account" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await userRepository.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const { token } = createAccessToken(user);
    return res.status(200).json({
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to log in" });
  }
});

router.post("/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(400).json({ error: "Missing Bearer token" });
    }

    const token = authHeader.slice("Bearer ".length);
    const payload = verifyAccessToken(token);
    await revokedTokenRepository.revokeToken({
      jti: payload.jti,
      expiresAtUnix: payload.exp,
    });

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
});

module.exports = router;
