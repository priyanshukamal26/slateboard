const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    boardId: { type: String, required: true },
    userId: { type: String, required: true },
    displayName: { type: String, required: true },
    color: { type: String, default: "#FF6B6B" },
    text: { type: String, required: false, maxlength: 1000 },
    fileUrl: { type: String },
    fileName: { type: String },
    fileType: { type: String },
    guest: { type: Boolean, default: false },
  },
  { timestamps: true }
);

chatMessageSchema.index({ boardId: 1, createdAt: -1 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
