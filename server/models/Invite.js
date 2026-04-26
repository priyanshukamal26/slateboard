const mongoose = require("mongoose");

const inviteSchema = new mongoose.Schema(
  {
    boardRoomKey: { type: String, required: true, uppercase: true },
    invitedBy: { type: String, required: true },
    defaultRole: { type: String, enum: ["editor", "viewer"], default: "viewer" },
    expiresAt: { type: Date, required: true },
    usedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

inviteSchema.index({ boardRoomKey: 1 });
inviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

module.exports = mongoose.model("Invite", inviteSchema);
