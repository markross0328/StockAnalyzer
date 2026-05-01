const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const userRepository = require("../repositories/userRepository");
const revokedTokenRepository = require("../repositories/revokedTokenRepository");
const { createAccessToken } = require("../services/tokenService");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function mapAuthError(error, fallbackMessage) {
  const details = error?.message || "";

  if (error?.name === "ResourceNotFoundException") {
    return {
      status: 500,
      message:
        "Database tables are missing. Run `npm run dynamodb:setup` and verify table names in .env.",
    };
  }

  if (error?.name === "ValidationException" && details.includes("email-index")) {
    return {
      status: 500,
      message:
        "Database index `email-index` is missing. Recreate tables with `npm run dynamodb:setup`.",
    };
  }

  if (error?.name === "UnrecognizedClientException" || details.includes("security token")) {
    return {
      status: 500,
      message: "AWS credentials are invalid or missing for DynamoDB access.",
    };
  }

  return {
    status: 500,
    message: fallbackMessage,
  };
}

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
    const mapped = mapAuthError(error, "Failed to create account");
    return res.status(mapped.status).json({ error: mapped.message });
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
    const mapped = mapAuthError(error, "Failed to log in");
    return res.status(mapped.status).json({ error: mapped.message });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  return res.status(200).json({
    user: {
      userId: req.user.userId,
      name: req.user.name,
      email: req.user.email,
    },
  });
});

router.post("/logout", requireAuth, async (req, res) => {
  try {
    await revokedTokenRepository.revokeToken({
      jti: req.user.jti,
      expiresAtUnix: req.user.exp,
    });

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    const mapped = mapAuthError(error, "Failed to log out");
    return res.status(mapped.status).json({ error: mapped.message });
  }
});

module.exports = router;
