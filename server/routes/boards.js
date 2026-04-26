const express = require("express");
const Board = require("../models/Board");
const Invite = require("../models/Invite");
const BoardHistory = require("../models/BoardHistory");
const { requireAuth } = require("../middleware/auth");
const { randomId, createRoomKey } = require("../data/store");

const router = express.Router();

function serializeBoard(board) {
  return {
    boardId: String(board._id),
    roomKey: board.roomKey,
    title: board.title,
    background: board.background,
    thumbnail: board.thumbnail,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
    defaultRole: board.defaultRole,
    strokes: board.strokes,
  };
}

// Ensure a unique roomKey
async function makeUniqueRoomKey() {
  let key, exists;
  do {
    key = createRoomKey();
    exists = await Board.exists({ roomKey: key });
  } while (exists);
  return key;
}

// GET /api/v1/boards?page=1&limit=12
router.get("/", requireAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 12);
    const skip = (page - 1) * limit;
    const ownerId = String(req.user._id);

    const [items, total] = await Promise.all([
      Board.find({ ownerId })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("roomKey title thumbnail updatedAt")
        .lean(),
      Board.countDocuments({ ownerId }),
    ]);

    res.status(200).json({
      boards: items,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[boards] list error:", error);
    res.status(500).json({ message: "Failed to list boards." });
  }
});

// GET /api/v1/boards/recent
router.get("/recent", requireAuth, async (req, res) => {
  try {
    const ownerId = String(req.user._id);
    const boards = await Board.find({ ownerId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select("roomKey title thumbnail updatedAt")
      .lean();
    res.status(200).json({ boards });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch recent boards." });
  }
});

// POST /api/v1/boards
router.post("/", requireAuth, async (req, res) => {
  try {
    const ownerId = String(req.user._id);
    const roomKey = await makeUniqueRoomKey();
    const title = req.body.title
      ? String(req.body.title).trim().slice(0, 120) || "Untitled board"
      : "Untitled board";
    const background = req.body.background ? String(req.body.background) : "blank";

    const board = await Board.create({
      roomKey,
      ownerId,
      title,
      background,
      collaboratorRoles: { [ownerId]: "owner" },
    });

    res.status(201).json({ roomKey: board.roomKey, boardId: String(board._id) });
  } catch (error) {
    console.error("[boards] create error:", error);
    res.status(500).json({ message: "Board creation failed." });
  }
});

// GET /api/v1/boards/:roomKey
router.get("/:roomKey", async (req, res) => {
  try {
    const board = await Board.findOne({
      roomKey: req.params.roomKey.toUpperCase(),
    }).lean();

    if (!board) {
      return res.status(404).json({ message: "Board not found." });
    }

    res.status(200).json({ board: serializeBoard(board), strokes: board.strokes });
  } catch (error) {
    res.status(500).json({ message: "Board fetch failed." });
  }
});

// PATCH /api/v1/boards/:roomKey
router.patch("/:roomKey", requireAuth, async (req, res) => {
  try {
    const board = await Board.findOne({
      roomKey: req.params.roomKey.toUpperCase(),
    });

    if (!board) {
      return res.status(404).json({ message: "Board not found." });
    }

    if (String(board.ownerId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only the owner can update this board." });
    }

    if (req.body.title) board.title = String(req.body.title).trim().slice(0, 120) || board.title;
    if (req.body.background) board.background = String(req.body.background);
    if (req.body.defaultRole)
      board.defaultRole = req.body.defaultRole === "viewer" ? "viewer" : "editor";
    if (req.body.thumbnail) board.thumbnail = String(req.body.thumbnail).slice(0, 50000);

    await board.save();
    res.status(200).json({ board: serializeBoard(board) });
  } catch (error) {
    res.status(500).json({ message: "Board update failed." });
  }
});

// DELETE /api/v1/boards/:roomKey
router.delete("/:roomKey", requireAuth, async (req, res) => {
  try {
    const board = await Board.findOne({
      roomKey: req.params.roomKey.toUpperCase(),
    });

    if (!board) return res.status(404).json({ message: "Board not found." });
    if (String(board.ownerId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only the owner can delete this board." });
    }

    await Board.deleteOne({ _id: board._id });
    await Invite.deleteMany({ boardRoomKey: board.roomKey });
    await BoardHistory.deleteMany({ boardId: String(board._id) });

    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: "Board deletion failed." });
  }
});

// POST /api/v1/boards/:roomKey/invite
router.post("/:roomKey/invite", requireAuth, async (req, res) => {
  try {
    const board = await Board.findOne({
      roomKey: req.params.roomKey.toUpperCase(),
    });

    if (!board) return res.status(404).json({ message: "Board not found." });
    if (String(board.ownerId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only the owner can create invites." });
    }

    const defaultRole = req.body.defaultRole === "viewer" ? "viewer" : "editor";
    board.defaultRole = defaultRole;
    await board.save();

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days
    await Invite.deleteMany({ boardRoomKey: board.roomKey }); // one active invite per board
    const invite = await Invite.create({
      boardRoomKey: board.roomKey,
      invitedBy: String(req.user._id),
      defaultRole,
      expiresAt,
    });

    const origin = req.protocol + "://" + req.get("host");
    res.status(201).json({
      inviteUrl: origin + "/board.html?roomKey=" + encodeURIComponent(board.roomKey),
      roomKey: board.roomKey,
      defaultRole: invite.defaultRole,
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    res.status(500).json({ message: "Invite creation failed." });
  }
});

// POST /api/v1/boards/:roomKey/history  (save version snapshot)
router.post("/:roomKey/history", requireAuth, async (req, res) => {
  try {
    const board = await Board.findOne({ roomKey: req.params.roomKey.toUpperCase() });
    if (!board) return res.status(404).json({ message: "Board not found." });
    if (String(board.ownerId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only the owner can save versions." });
    }

    const lastVer = await BoardHistory.findOne({ boardId: String(board._id) })
      .sort({ version: -1 })
      .lean();
    const version = lastVer ? lastVer.version + 1 : 1;

    const hist = await BoardHistory.create({
      boardId: String(board._id),
      roomKey: board.roomKey,
      version,
      strokes: board.strokes,
      savedBy: String(req.user._id),
      label: req.body.label || `Version ${version}`,
    });

    res.status(201).json({ version: hist.version, label: hist.label, savedAt: hist.createdAt });
  } catch (error) {
    res.status(500).json({ message: "History save failed." });
  }
});

// GET /api/v1/boards/:roomKey/history
router.get("/:roomKey/history", requireAuth, async (req, res) => {
  try {
    const board = await Board.findOne({ roomKey: req.params.roomKey.toUpperCase() }).lean();
    if (!board) return res.status(404).json({ message: "Board not found." });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(20, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      BoardHistory.find({ boardId: String(board._id) })
        .sort({ version: -1 })
        .skip(skip)
        .limit(limit)
        .select("version label savedBy createdAt")
        .lean(),
      BoardHistory.countDocuments({ boardId: String(board._id) }),
    ]);

    res.status(200).json({ history: items, meta: { page, limit, total } });
  } catch (error) {
    res.status(500).json({ message: "History fetch failed." });
  }
});

module.exports = router;
