const User = require("../models/User");
const { verifyToken } = require("../utils/auth");

async function requireAuth(req, res, next) {
  try {
    const rawToken =
      req.session.token || String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const payload = rawToken ? verifyToken(rawToken) : null;

    if (!payload) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const user = await User.findById(payload.sub).lean();
    if (!user) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized." });
  }
}

module.exports = { requireAuth };
