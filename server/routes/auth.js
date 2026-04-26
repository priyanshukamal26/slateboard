const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const User = require("../models/User");
const PasswordReset = require("../models/PasswordReset");
const { signToken, verifyToken } = require("../utils/auth");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function toUserPayload(user) {
  return {
    id: String(user._id),
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt,
  };
}

// POST /api/v1/auth/register
router.post("/register", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");
    const displayName = String(req.body.displayName || email.split("@")[0] || "User").trim();

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const exists = await User.findOne({ email }).lean();
    if (exists) {
      return res.status(409).json({ message: "User already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash, displayName });

    const token = signToken(user);
    req.session.token = token;
    res.status(201).json({ token, user: toUserPayload(user) });
  } catch (error) {
    console.error("[auth] register error:", error);
    res.status(500).json({ message: "Registration failed." });
  }
});

// POST /api/v1/auth/login
router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = signToken(user);
    req.session.token = token;
    res.status(200).json({ token, user: toUserPayload(user) });
  } catch (error) {
    console.error("[auth] login error:", error);
    res.status(500).json({ message: "Login failed." });
  }
});

// POST /api/v1/auth/refresh
router.post("/refresh", async (req, res) => {
  try {
    const existing = req.session.token || String(req.headers.authorization || "").replace(/^Bearer\s+/i, "") || req.body.token;
    
    console.log("[auth] refresh called. headers.authorization:", req.headers.authorization);
    console.log("[auth] refresh called. session.token:", req.session.token);
    console.log("[auth] refresh called. existing:", existing);

    const payload = existing ? verifyToken(existing) : null;
    console.log("[auth] refresh payload:", payload);

    if (!payload) {
      return res.status(401).json({ message: "No valid session." });
    }

    const user = await User.findById(payload.sub).lean();
    if (!user) {
      return res.status(401).json({ message: "No valid session." });
    }

    const token = signToken(user);
    req.session.token = token;
    res.status(200).json({ token, user: toUserPayload(user) });
  } catch (error) {
    res.status(500).json({ message: "Refresh failed." });
  }
});

// GET /api/v1/auth/me
router.get("/me", async (req, res) => {
  try {
    const existing =
      req.session.token || String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const payload = existing ? verifyToken(existing) : null;

    if (!payload) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const user = await User.findById(payload.sub).lean();
    if (!user) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    res.status(200).json({ user: toUserPayload(user) });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user." });
  }
});

// DELETE /api/v1/auth/logout
router.delete("/logout", async (req, res) => {
  try {
    req.session = null;
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: "Logout failed." });
  }
});

// POST /api/v1/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const user = await User.findOne({ email }).lean();

    // Always return 200 to prevent email enumeration
    if (!user) {
      return res.status(200).json({ message: "If that email exists, a reset link was sent." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await PasswordReset.create({ userId: String(user._id), token, expiresAt });

    // In production, send email. For dev, log the reset token.
    const resetUrl = `${process.env.CLIENT_ORIGIN || "http://localhost:3000"}/auth.html?reset=${token}`;
    console.log(`[auth] Password reset link for ${email}: ${resetUrl}`);

    res
      .status(200)
      .json({ message: "If that email exists, a reset link was sent.", _dev_resetUrl: resetUrl });
  } catch (error) {
    console.error("[auth] forgot-password error:", error);
    res.status(500).json({ message: "Password reset failed." });
  }
});

// POST /api/v1/auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const token = String(req.body.token || "");
    const newPassword = String(req.body.password || "");

    if (!token || !newPassword || newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Token and a new password (min 6 chars) are required." });
    }

    const resetRecord = await PasswordReset.findOne({ token, used: false });
    if (!resetRecord || resetRecord.expiresAt < new Date()) {
      return res.status(400).json({ message: "Invalid or expired reset token." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(resetRecord.userId, { passwordHash });
    await PasswordReset.findByIdAndUpdate(resetRecord._id, { used: true });

    res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("[auth] reset-password error:", error);
    res.status(500).json({ message: "Password reset failed." });
  }
});

// POST /api/v1/auth/change-password  (requires auth)
router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const current = String(req.body.currentPassword || "");
    const next = String(req.body.newPassword || "");

    if (!current || !next || next.length < 6) {
      return res
        .status(400)
        .json({ message: "Current password and a new password (min 6 chars) are required." });
    }

    const user = await User.findById(req.user._id);
    const ok = await bcrypt.compare(current, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    user.passwordHash = await bcrypt.hash(next, 12);
    await user.save();

    res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
    res.status(500).json({ message: "Password change failed." });
  }
});

module.exports = router;
