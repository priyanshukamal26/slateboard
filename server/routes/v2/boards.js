const express = require("express");
const Board = require("../../models/Board");

const router = express.Router();

// API v2 boards — same data, wrapped in envelope with version metadata
// Demonstrates API versioning concept (Unit VI)

router.get("/", async (req, res) => {
  try {
    // Delegate to the same query logic
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 12);
    const skip = (page - 1) * limit;

    // Require auth header for v2
    const authHeader = req.headers.authorization || "";
    if (!authHeader) {
      return res.status(401).json({
        data: null,
        error: "Unauthorized",
        meta: { version: 2 },
      });
    }

    // v2 response envelope
    res.status(200).json({
      data: [],
      meta: {
        version: 2,
        page,
        limit,
        total: 0,
        note: "v2 returns a { data, meta } envelope. Auth header required.",
      },
    });
  } catch (error) {
    res.status(500).json({ data: null, error: "Failed", meta: { version: 2 } });
  }
});

router.get("/:roomKey", async (req, res) => {
  try {
    const board = await Board.findOne({
      roomKey: req.params.roomKey.toUpperCase(),
    }).lean();

    if (!board) {
      return res.status(404).json({ data: null, error: "Board not found.", meta: { version: 2 } });
    }

    res.status(200).json({
      data: {
        boardId: String(board._id),
        roomKey: board.roomKey,
        title: board.title,
        background: board.background,
        updatedAt: board.updatedAt,
      },
      meta: { version: 2, strokeCount: board.strokes.length },
    });
  } catch (error) {
    res.status(500).json({ data: null, error: "Failed", meta: { version: 2 } });
  }
});

module.exports = router;
