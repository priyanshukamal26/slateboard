const Board = require("../models/Board");
const { verifyToken } = require("../utils/auth");
const { assignPresenceColor, serializeCollaborator } = require("../data/store");
const { logActivity, logAudit, logSession, closeSession } = require("../services/analytics");
const User = require("../models/User");

// In-memory presence map — collaboration state does NOT need MongoDB persistence
// Map<roomKey, Map<socketId, actor>>
const presenceMap = new Map();

function getPresence(roomKey) {
  if (!presenceMap.has(roomKey)) presenceMap.set(roomKey, new Map());
  return presenceMap.get(roomKey);
}

async function getActor(payload) {
  const tokenPayload = payload && payload.token ? verifyToken(payload.token) : null;
  if (tokenPayload) {
    const user = await User.findById(tokenPayload.sub).lean();
    if (user) {
      return {
        id: String(user._id),
        displayName: user.displayName,
        role: user.role,
        guest: false,
      };
    }
  }
  return {
    id:
      payload && payload.guestId
        ? payload.guestId
        : "guest-" + Math.random().toString(36).slice(2, 8),
    displayName: "Guest",
    role: "guest",
    guest: true,
  };
}

function getRoleForActor(board, actor) {
  if (!board || !actor) return "viewer";
  const ownerId = String(board.ownerId);
  if (ownerId === actor.id) return "owner";
  const roleFromMap =
    board.collaboratorRoles instanceof Map
      ? board.collaboratorRoles.get(actor.id)
      : (board.collaboratorRoles || {})[actor.id];
  if (roleFromMap) return roleFromMap;
  return board.defaultRole || "viewer";
}

function canDraw(role) {
  return role === "owner" || role === "editor";
}

function broadcastBoardState(io, board, roomKey) {
  const presence = getPresence(roomKey);
  const collaborators = Array.from(presence.values()).map(serializeCollaborator);
  io.to(roomKey).emit("board:state", {
    board: {
      roomKey: board.roomKey,
      title: board.title,
      background: board.background,
      defaultRole: board.defaultRole,
    },
    strokes: board.strokes.slice(-1000),
    collaborators,
  });
}

module.exports = function registerBoardHandlers(io, socket) {
  socket.on("board:join", async (payload) => {
    try {
      if (!payload || !payload.roomKey) {
        socket.emit("error", { code: "ROOM_KEY_REQUIRED", message: "Room key is required." });
        return;
      }

      const roomKey = String(payload.roomKey).toUpperCase();
      const board = await Board.findOne({ roomKey });
      if (!board) {
        socket.emit("error", { code: "ROOM_NOT_FOUND", message: "Board not found." });
        return;
      }

      const actor = await getActor(payload);
      actor.role = getRoleForActor(board, actor);
      actor.color = assignPresenceColor(actor.id);

      socket.data.roomKey = roomKey;
      socket.data.actor = actor;
      socket.data.boardId = String(board._id);

      // Update collaboratorRoles in DB
      if (!actor.guest) {
        board.collaboratorRoles.set(actor.id, actor.role);
        await board.save();
      }

      const presence = getPresence(roomKey);
      presence.set(socket.id, actor);

      await socket.join(roomKey);

      socket.emit("permission:ack", { userId: actor.id, newRole: actor.role });
      broadcastBoardState(io, board, roomKey);

      // Log session to PostgreSQL
      const ip = socket.handshake.address;
      const sessionId = await logSession(actor.id, ip, String(board._id));
      socket.data.sessionId = sessionId;

      // Log activity
      await logActivity(actor.id, "join", String(board._id), { tool: "board" });
    } catch (error) {
      console.error("[socket] board:join error:", error);
      socket.emit("error", { code: "JOIN_FAILED", message: "Unable to join board." });
    }
  });

  socket.on("cursor:move", (payload) => {
    try {
      const { roomKey, actor } = socket.data;
      if (!roomKey || !actor || !payload) return;
      socket.to(roomKey).emit("cursor:remote", {
        userId: actor.id,
        displayName: actor.displayName,
        role: actor.role,
        color: actor.color,
        x: Number(payload.x),
        y: Number(payload.y),
      });
    } catch (_) {}
  });

  socket.on("stroke:start", async (payload) => {
    try {
      const { roomKey, actor } = socket.data;
      if (!roomKey || !actor || !payload || !payload.strokeId) return;
      if (!canDraw(actor.role)) {
        socket.emit("error", {
          code: "DRAW_FORBIDDEN",
          message: "You do not have permission to draw.",
        });
        return;
      }

      socket.data.strokeBuffer = {
        strokeId: payload.strokeId,
        authorId: actor.id,
        tool: payload.tool || "pen",
        style: payload.style || {},
        text: "",
        points: payload.startPoint ? [payload.startPoint] : [],
      };

      socket.to(roomKey).emit("stroke:remote", socket.data.strokeBuffer);
    } catch (error) {
      socket.emit("error", { code: "STROKE_START_FAILED", message: "Unable to start stroke." });
    }
  });

  socket.on("stroke:point", (payload) => {
    try {
      const { roomKey, actor } = socket.data;
      if (!roomKey || !actor || !payload || !socket.data.strokeBuffer) return;
      if (!canDraw(actor.role)) return;
      if (socket.data.strokeBuffer.strokeId !== payload.strokeId) return;

      if (payload.point) {
        socket.data.strokeBuffer.points.push(payload.point);
      }
      if (payload.endPoint !== undefined) {
        // Shape tool — update end point
        const buf = socket.data.strokeBuffer;
        if (buf.points.length < 2) {
          buf.points =
            buf.points.length === 0
              ? [payload.endPoint, payload.endPoint]
              : [buf.points[0], payload.endPoint];
        } else {
          buf.points[buf.points.length - 1] = payload.endPoint;
        }
      }

      socket.to(roomKey).emit("stroke:remote", { ...socket.data.strokeBuffer });
    } catch (_) {}
  });

  socket.on("stroke:end", async (payload) => {
    try {
      const { roomKey, actor, boardId } = socket.data;
      if (!roomKey || !actor || !payload || !socket.data.strokeBuffer) return;
      if (!canDraw(actor.role)) return;

      const buffer = socket.data.strokeBuffer;
      if (payload.finalPoints && payload.finalPoints.length > 0) {
        buffer.points = payload.finalPoints;
      }
      if (payload.text !== undefined) buffer.text = payload.text;

      // Persist to MongoDB
      const board = await Board.findOne({ roomKey });
      if (board) {
        const existingIdx = board.strokes.findIndex((s) => s.strokeId === buffer.strokeId);
        if (existingIdx >= 0) {
          board.strokes[existingIdx] = buffer;
        } else {
          board.strokes.push(buffer);
        }
        await board.save();

        io.to(roomKey).emit("stroke:remote", buffer);

        // Audit log
        await logAudit(actor.id, boardId, buffer.strokeId, "draw", null, { tool: buffer.tool });
        await logActivity(actor.id, "stroke", boardId, { tool: buffer.tool });
      }

      socket.data.strokeBuffer = null;
    } catch (error) {
      console.error("[socket] stroke:end error:", error);
      socket.emit("error", { code: "STROKE_END_FAILED", message: "Unable to finish stroke." });
    }
  });

  socket.on("stroke:delete", async (payload) => {
    try {
      const { roomKey, actor, boardId } = socket.data;
      if (!roomKey || !actor || !payload || !Array.isArray(payload.strokeIds)) return;
      if (!canDraw(actor.role)) return;

      const ids = payload.strokeIds.map(String);
      const board = await Board.findOne({ roomKey });
      if (!board) return;

      board.strokes = board.strokes.filter(
        (s) => !ids.includes(s.strokeId) && !ids.includes(String(s._id))
      );
      await board.save();

      io.to(roomKey).emit("stroke:delete", { strokeIds: ids });
      await logAudit(actor.id, boardId, ids[0], "delete", { count: ids.length }, null);
    } catch (error) {
      socket.emit("error", { code: "STROKE_DELETE_FAILED", message: "Unable to delete strokes." });
    }
  });

  socket.on("permission:set", async (payload) => {
    try {
      const { roomKey, actor } = socket.data;
      if (!roomKey || !actor || !payload || !payload.targetUserId) return;

      const board = await Board.findOne({ roomKey });
      if (!board || String(board.ownerId) !== actor.id) return;

      const nextRole =
        payload.role === "viewer" ? "viewer" : payload.role === "owner" ? "owner" : "editor";
      board.collaboratorRoles.set(payload.targetUserId, nextRole);
      await board.save();

      const presence = getPresence(roomKey);
      presence.forEach((presenceActor) => {
        if (presenceActor.id === payload.targetUserId) {
          presenceActor.role = nextRole;
        }
      });

      io.to(roomKey).emit("permission:ack", { userId: payload.targetUserId, newRole: nextRole });
      broadcastBoardState(io, board, roomKey);
    } catch (error) {
      socket.emit("error", { code: "PERMISSION_FAILED", message: "Unable to update permissions." });
    }
  });

  socket.on("disconnect", async () => {
    try {
      const { roomKey, actor, sessionId } = socket.data;
      if (!roomKey || !actor) return;

      const presence = getPresence(roomKey);
      presence.delete(socket.id);

      const board = await Board.findOne({ roomKey }).lean();
      if (board) broadcastBoardState(io, board, roomKey);

      await closeSession(sessionId);
    } catch (_) {}
  });
};
