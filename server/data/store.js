// Pure utility functions — no in-memory state (state lives in MongoDB now)

const PRESENCE_COLORS = [
  "#FF6B6B",
  "#FFD93D",
  "#C4B5FD",
  "#2EC4B6",
  "#FF9F1C",
  "#7BD389",
  "#6BCBFF",
  "#FF8FAB",
];

function randomId(prefix) {
  return (prefix || "id") + "-" + Math.random().toString(36).slice(2, 10);
}

function createRoomKey() {
  const part = Math.random().toString(36).slice(2, 6).toUpperCase();
  return "SLATE-" + part;
}

function assignPresenceColor(actorId) {
  let sum = 0;
  const value = String(actorId || "");
  for (let i = 0; i < value.length; i += 1) {
    sum += value.charCodeAt(i);
  }
  return PRESENCE_COLORS[sum % PRESENCE_COLORS.length];
}

function serializeCollaborator(collaborator) {
  return {
    id: collaborator.id,
    displayName: collaborator.displayName,
    role: collaborator.role,
    color: collaborator.color,
    guest: Boolean(collaborator.guest),
  };
}

module.exports = {
  PRESENCE_COLORS,
  randomId,
  createRoomKey,
  assignPresenceColor,
  serializeCollaborator,
};
