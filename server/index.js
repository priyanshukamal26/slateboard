const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const cookieSession = require("cookie-session");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
require("dotenv").config();

// ── Routes ─────────────────────────────────────────────────────────────────
const authRoutes = require("./routes/auth");
const boardRoutes = require("./routes/boards");
const exportRoutes = require("./routes/export");
const analyticsRoutes = require("./routes/analytics");
const aiRoutes = require("./routes/ai");
const boardRoutesV2 = require("./routes/v2/boards");
const chatRoutes = require("./routes/chat");

// ── Sockets ─────────────────────────────────────────────────────────────────
const registerBoardHandlers = require("./sockets/boardHandler");
const registerChatHandlers = require("./sockets/chatHandler");

// ── Middleware ───────────────────────────────────────────────────────────────
const { logger } = require("./middleware/logger");
const { rateLimit } = require("./middleware/rateLimit");
const { securityHeaders } = require("./middleware/securityHeaders");

// ── Health server (raw http — Unit II) ──────────────────────────────────────
const { startHealthServer } = require("./healthServer");

// ── App setup ────────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || true,
    credentials: true,
  },
});

const port = Number(process.env.PORT || 3000);

// ── Global middleware ─────────────────────────────────────────────────────────
app.set("trust proxy", 1);
app.use(securityHeaders);
app.use(logger);
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || true,
    credentials: true,
  })
);
app.use(express.json({ limit: "4mb" }));
app.use(
  cookieSession({
    name: "slateboard-session",
    secret: process.env.SESSION_SECRET || "development-session-secret",
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  })
);

// ── Rate limiting on auth routes ──────────────────────────────────────────────
app.use("/api/v1/auth", rateLimit);

// ── API v1 routes ─────────────────────────────────────────────────────────────
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/boards", boardRoutes);
app.use("/api/v1/export", exportRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/chat", chatRoutes);

// ── API v2 routes (demonstrates versioning) ───────────────────────────────────
app.use("/api/v2/boards", boardRoutesV2);

// ── Backward-compat aliases (old paths still work) ───────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/boards", boardRoutes);

// ── Static client files ───────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "..", "client")));

// ── Catch-all → index.html (SPA support) ─────────────────────────────────────
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ message: "API route not found." });
  }
  res.sendFile(path.join(__dirname, "..", "client", "index.html"));
});

// ── Socket.IO ────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  registerBoardHandlers(io, socket);
  registerChatHandlers(io, socket);
});

// ── MongoDB connect → start server ────────────────────────────────────────────
async function start() {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/slateboard";
    await mongoose.connect(mongoUri);
    console.log("[db] MongoDB connected:", mongoUri);
  } catch (err) {
    console.error("[db] MongoDB connection failed:", err.message);
    console.error("[db] Starting without persistent storage (in-memory fallback not available).");
    process.exit(1);
  }

  server.listen(port, () => {
    console.log(`[server] Slateboard running on http://localhost:${port}`);
    startHealthServer(port);
  });
}

start();
