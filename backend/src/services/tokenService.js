const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const env = require("../config/env");

function createAccessToken(user) {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    {
      sub: user.userId,
      email: user.email,
      name: user.name,
      jti,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );

  return { token, jti };
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

module.exports = {
  createAccessToken,
  verifyAccessToken,
};
