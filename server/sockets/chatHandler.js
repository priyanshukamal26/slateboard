const ChatMessage = require("../models/ChatMessage");
const Board = require("../models/Board");
const { verifyToken } = require("../utils/auth");
const { assignPresenceColor } = require("../data/store");
const User = require("../models/User");

const typingTimers = new Map(); // socketId -> clearTimeout handle

async function resolveUser(token, guestId) {
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      const user = await User.findById(payload.sub).lean();
      if (user) return { id: String(user._id), displayName: user.displayName, guest: false };
    }
  }
  return {
    id: guestId || "guest-" + Math.random().toString(36).slice(2, 8),
    displayName: "Guest",
    guest: true,
  };
}

module.exports = function registerChatHandlers(io, socket) {
  // chat:join — fetch history for this board
  socket.on("chat:join", async (payload) => {
    try {
      if (!payload || !payload.boardId) return;

      const board = await Board.findOne({ roomKey: payload.boardId }).lean();
      if (!board) return;

      const messages = await ChatMessage.find({ boardId: String(board._id) })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      socket.emit("chat:history", { messages: messages.reverse() });
    } catch (error) {
      console.error("[chat] chat:join error:", error);
    }
  });

  // chat:send — broadcast message + persist
  socket.on("chat:send", async (payload) => {
    try {
      if (!payload || !payload.boardId || !payload.text) return;
      const text = String(payload.text).trim().slice(0, 1000);
      if (!text) return;

      const user = await resolveUser(payload.token, payload.guestId);
      const color = assignPresenceColor(user.id);
      const board = await Board.findOne({ roomKey: payload.boardId }).lean();
      if (!board) return;

      const msg = await ChatMessage.create({
        boardId: String(board._id),
        userId: user.id,
        displayName: user.displayName,
        color,
        text,
        guest: user.guest,
      });

      const outMsg = {
        _id: String(msg._id),
        userId: user.id,
        displayName: user.displayName,
        color,
        text,
        guest: user.guest,
        createdAt: msg.createdAt,
      };

      // Broadcast to everyone in the board room (roomKey is used as socket room)
      io.to(socket.data.roomKey).emit("chat:message", outMsg);

      // Cancel typing indicator for this user
      if (typingTimers.has(socket.id)) {
        clearTimeout(typingTimers.get(socket.id));
        typingTimers.delete(socket.id);
        socket.to(socket.data.roomKey).emit("chat:typing", { userId: user.id, isTyping: false });
      }
    } catch (error) {
      console.error("[chat] chat:send error:", error);
    }
  });

  // chat:typing — throttled typing indicator
  socket.on("chat:typing", (payload) => {
    try {
      const { roomKey, actor } = socket.data;
      if (!roomKey || !actor) return;

      socket
        .to(roomKey)
        .emit("chat:typing", { userId: actor.id, displayName: actor.displayName, isTyping: true });

      // Auto-clear after 2s
      if (typingTimers.has(socket.id)) clearTimeout(typingTimers.get(socket.id));
      typingTimers.set(
        socket.id,
        setTimeout(() => {
          socket.to(roomKey).emit("chat:typing", { userId: actor.id, isTyping: false });
          typingTimers.delete(socket.id);
        }, 2000)
      );
    } catch (_) {}
  });

  socket.on("disconnect", () => {
    if (typingTimers.has(socket.id)) {
      clearTimeout(typingTimers.get(socket.id));
      typingTimers.delete(socket.id);
    }
  });
};
