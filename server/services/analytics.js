/**
 * Analytics service — writes to PostgreSQL via Prisma.
 * Covers Unit V (PostgreSQL + Prisma ORM).
 *
 * If Prisma is not yet initialized (no DATABASE_URL), falls back gracefully
 * so the app still works with only MongoDB.
 */

let prisma = null;

function getPrisma() {
  if (prisma) return prisma;
  try {
    const { PrismaClient } = require("@prisma/client");
    prisma = new PrismaClient();
  } catch (err) {
    // Prisma not yet generated — run `npx prisma generate` first
    console.warn("[analytics] Prisma not available:", err.message);
  }
  return prisma;
}

async function logActivity(userId, action, boardId, metadata) {
  const client = getPrisma();
  if (!client) return;
  try {
    await client.activityLog.create({
      data: {
        userId: String(userId || "guest"),
        action: String(action),
        boardId: boardId ? String(boardId) : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (err) {
    console.error("[analytics] logActivity error:", err.message);
  }
}

async function logAudit(userId, boardId, strokeId, action, before, after) {
  const client = getPrisma();
  if (!client) return;
  try {
    await client.auditLog.create({
      data: {
        userId: String(userId || "guest"),
        boardId: String(boardId),
        strokeId: strokeId ? String(strokeId) : null,
        action: String(action),
        before: before ? JSON.stringify(before) : null,
        after: after ? JSON.stringify(after) : null,
      },
    });
  } catch (err) {
    console.error("[analytics] logAudit error:", err.message);
  }
}

async function logSession(userId, ip, boardId) {
  const client = getPrisma();
  if (!client) return null;
  try {
    const session = await client.sessionLog.create({
      data: {
        userId: String(userId || "guest"),
        ip: String(ip || ""),
        boardId: boardId ? String(boardId) : null,
      },
    });
    return session.id;
  } catch (err) {
    console.error("[analytics] logSession error:", err.message);
    return null;
  }
}

async function closeSession(sessionId) {
  const client = getPrisma();
  if (!client || !sessionId) return;
  try {
    await client.sessionLog.update({
      where: { id: sessionId },
      data: { leftAt: new Date() },
    });
  } catch (err) {
    console.error("[analytics] closeSession error:", err.message);
  }
}

async function getBoardStats(boardId) {
  const client = getPrisma();
  if (!client) return null;
  try {
    const [strokeCount, userCount] = await Promise.all([
      client.auditLog.count({ where: { boardId: String(boardId), action: "draw" } }),
      client.activityLog.groupBy({
        by: ["userId"],
        where: { boardId: String(boardId) },
        _count: true,
      }),
    ]);
    return { totalStrokes: strokeCount, uniqueUsers: userCount.length };
  } catch (err) {
    console.error("[analytics] getBoardStats error:", err.message);
    return null;
  }
}

module.exports = { logActivity, logAudit, logSession, closeSession, getBoardStats };
