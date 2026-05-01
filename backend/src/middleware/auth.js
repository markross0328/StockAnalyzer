const { verifyAccessToken } = require("../services/tokenService");
const revokedTokenRepository = require("../repositories/revokedTokenRepository");

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Bearer token" });
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const payload = verifyAccessToken(token);
    const revoked = await revokedTokenRepository.isTokenRevoked(payload.jti);

    if (revoked) {
      return res.status(401).json({ error: "Token has been revoked" });
    }

    req.user = {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      jti: payload.jti,
      exp: payload.exp,
    };
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = {
  requireAuth,
};
