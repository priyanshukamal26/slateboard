const express = require("express");
const Board = require("../models/Board");
const { requireAuth } = require("../middleware/auth");
const { getBoardStats } = require("../services/analytics");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();

let prisma = null;
function getPrisma() {
  if (prisma) return prisma;
  try { prisma = new PrismaClient(); } catch (_) {}
  return prisma;
}

// GET /api/v1/analytics/board/:boardId
router.get("/board/:boardId", requireAuth, async (req, res) => {
  try {
    const board = await Board.findById(req.params.boardId).lean();
    if (!board) return res.status(404).json({ message: "Board not found." });

    // MongoDB analytics
    const strokesByTool = {};
    (board.strokes || []).forEach((s) => {
      strokesByTool[s.tool] = (strokesByTool[s.tool] || 0) + 1;
    });

    // PostgreSQL analytics (if available)
    const pgStats = await getBoardStats(req.params.boardId);

    res.status(200).json({
      boardId: req.params.boardId,
      title: board.title,
      totalStrokes: board.strokes.length,
      strokesByTool,
      collaborators: board.collaboratorRoles ? Object.keys(board.collaboratorRoles).length : 0,
      pgStats,
    });
  } catch (error) {
    res.status(500).json({ message: "Analytics fetch failed." });
  }
});

// GET /api/v1/analytics/activity?limit=20
router.get("/activity", requireAuth, async (req, res) => {
  try {
    const client = getPrisma();
    if (!client) {
      return res.status(200).json({ logs: [], note: "PostgreSQL not configured." });
    }
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const logs = await client.activityLog.findMany({
      where: { userId: String(req.user._id) },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    res.status(200).json({ logs });
  } catch (error) {
    res.status(500).json({ message: "Activity fetch failed." });
  }
});

// GET /api/v1/analytics/audit/:boardId
router.get("/audit/:boardId", requireAuth, async (req, res) => {
  try {
    const client = getPrisma();
    if (!client) {
      return res.status(200).json({ logs: [], note: "PostgreSQL not configured." });
    }
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const logs = await client.auditLog.findMany({
      where: { boardId: req.params.boardId },
      orderBy: { timestamp: "desc" },
      take: limit,
    });
    res.status(200).json({ logs });
  } catch (error) {
    res.status(500).json({ message: "Audit fetch failed." });
  }
});

module.exports = router;
