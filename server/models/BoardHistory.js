const mongoose = require("mongoose");

const boardHistorySchema = new mongoose.Schema(
  {
    boardId: { type: String, required: true },
    roomKey: { type: String, required: true, uppercase: true },
    version: { type: Number, required: true },
    strokes: { type: mongoose.Schema.Types.Mixed, default: [] },
    savedBy: { type: String, required: true },
    label: { type: String, default: "" },
  },
  { timestamps: true }
);

boardHistorySchema.index({ boardId: 1, version: -1 });

module.exports = mongoose.model("BoardHistory", boardHistorySchema);
