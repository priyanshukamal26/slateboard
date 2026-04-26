const mongoose = require("mongoose");

const pointSchema = new mongoose.Schema(
  { x: Number, y: Number, pressure: Number, t: Number },
  { _id: false }
);

const strokeSchema = new mongoose.Schema(
  {
    strokeId: { type: String, required: true },
    authorId: { type: String, required: true },
    tool: { type: String, required: true, default: "pen" },
    style: {
      color: { type: String, default: "#000000" },
      width: { type: Number, default: 6 },
      opacity: { type: Number, default: 1 },
      fill: { type: Boolean, default: false },
      pattern: { type: String, default: "solid" },
      textSize: { type: Number, default: 24 },
      arrowHead: { type: Number, default: 18 },
    },
    text: { type: String, default: "" },
    points: { type: [pointSchema], default: [] },
    image: { type: String, default: "" }, // Base64 data or URL
    dimensions: {
      width: Number,
      height: Number,
    },
    createdAt: { type: Number, default: Date.now },
  },
  { _id: false }
);

const boardSchema = new mongoose.Schema(
  {
    roomKey: { type: String, required: true, unique: true, uppercase: true },
    ownerId: { type: String, required: true },
    title: { type: String, default: "Untitled board" },
    background: { type: String, default: "line" },
    thumbnail: { type: String, default: "" },
    strokes: { type: [strokeSchema], default: [] },
    collaboratorRoles: { type: Map, of: String, default: {} },
    defaultRole: {
      type: String,
      enum: ["editor", "viewer"],
      default: "editor",
    },
    deletedStrokeIds: { type: [String], default: [] },
  },
  { timestamps: true }
);

boardSchema.index({ roomKey: 1 }, { unique: true });
boardSchema.index({ ownerId: 1, updatedAt: -1 });

module.exports = mongoose.model("Board", boardSchema);
