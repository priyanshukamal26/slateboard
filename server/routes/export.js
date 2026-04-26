const express = require("express");
const fs = require("fs");
const path = require("path");
const os = require("os");
const Board = require("../models/Board");
const { sendGzippedJson, sendStream, pipelineAsync } = require("../utils/streamHelpers");
const { Readable } = require("stream");
const zlib = require("zlib");

const router = express.Router();

// ── Helper: build SVG from strokes ──────────────────────────────────────────
function strokesToSvg(strokes, width, height) {
  const els = strokes
    .map((stroke) => {
      const style = stroke.style || {};
      const color = style.color || "#000000";
      const opacity = style.opacity != null ? style.opacity : 1;
      const sw = style.width || 4;
      const pts = stroke.points || [];

      if (stroke.tool === "text") {
        if (!stroke.text || !pts[0]) return "";
        return `<text x="${pts[0].x}" y="${pts[0].y}" fill="${color}" opacity="${opacity}" font-size="${style.textSize || 24}" font-family="Space Grotesk, sans-serif" font-weight="900">${escapeXml(stroke.text)}</text>`;
      }
      if (pts.length < 2) return "";

      const start = pts[0];
      const end = pts[pts.length - 1];
      const baseAttrs = `stroke="${color}" stroke-opacity="${opacity}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;

      if (stroke.tool === "line") {
        return `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" ${baseAttrs}/>`;
      }
      if (stroke.tool === "rect") {
        const x = Math.min(start.x, end.x),
          y = Math.min(start.y, end.y);
        const w = Math.abs(end.x - start.x),
          h = Math.abs(end.y - start.y);
        const fill = style.fill ? `fill="${color}" fill-opacity="${opacity}"` : 'fill="none"';
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${baseAttrs} ${fill}/>`;
      }
      if (stroke.tool === "ellipse") {
        const cx = (start.x + end.x) / 2,
          cy = (start.y + end.y) / 2;
        const rx = Math.abs(end.x - start.x) / 2,
          ry = Math.abs(end.y - start.y) / 2;
        const fill = style.fill ? `fill="${color}" fill-opacity="${opacity}"` : 'fill="none"';
        return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${baseAttrs} ${fill}/>`;
      }
      if (stroke.tool === "arrow") {
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const head = style.arrowHead || 18;
        const l1x = end.x - head * Math.cos(angle - Math.PI / 6);
        const l1y = end.y - head * Math.sin(angle - Math.PI / 6);
        const l2x = end.x - head * Math.cos(angle + Math.PI / 6);
        const l2y = end.y - head * Math.sin(angle + Math.PI / 6);
        return `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" ${baseAttrs}/>
<polygon points="${end.x},${end.y} ${l1x},${l1y} ${l2x},${l2y}" fill="${color}" opacity="${opacity}"/>`;
      }
      // pen / highlight — polyline
      const d = pts
        .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
        .join(" ");
      const penOpacity = stroke.tool === "highlight" ? Math.min(opacity, 0.45) : opacity;
      return `<path d="${d}" stroke="${color}" stroke-opacity="${penOpacity}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .filter(Boolean);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${els.join("\n")}
</svg>`;
}

function escapeXml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

// GET /api/v1/export/:roomKey/json
router.get("/:roomKey/json", async (req, res) => {
  try {
    const board = await Board.findOne({ roomKey: req.params.roomKey.toUpperCase() }).lean();
    if (!board) return res.status(404).json({ message: "Board not found." });

    const data = {
      roomKey: board.roomKey,
      title: board.title,
      background: board.background,
      strokes: board.strokes,
      exportedAt: new Date().toISOString(),
    };

    // Stream + gzip (demonstrates Node.js Streams + zlib compression)
    await sendGzippedJson(res, data);
  } catch (error) {
    console.error("[export] json error:", error);
    if (!res.headersSent) res.status(500).json({ message: "Export failed." });
  }
});

// GET /api/v1/export/:roomKey/svg
router.get("/:roomKey/svg", async (req, res) => {
  try {
    const board = await Board.findOne({ roomKey: req.params.roomKey.toUpperCase() }).lean();
    if (!board) return res.status(404).json({ message: "Board not found." });

    const svgContent = strokesToSvg(board.strokes, 1920, 1080);

    res.setHeader("Content-Disposition", `attachment; filename="${board.roomKey}.svg"`);
    await sendStream(res, "image/svg+xml; charset=utf-8", svgContent);
  } catch (error) {
    console.error("[export] svg error:", error);
    if (!res.headersSent) res.status(500).json({ message: "SVG export failed." });
  }
});

// POST /api/v1/export/:roomKey/png  (client sends base64 PNG, server streams file back)
router.post("/:roomKey/png", async (req, res) => {
  try {
    const board = await Board.findOne({ roomKey: req.params.roomKey.toUpperCase() }).lean();
    if (!board) return res.status(404).json({ message: "Board not found." });

    const base64 = String(req.body.imageData || "").replace(/^data:image\/\w+;base64,/, "");
    if (!base64) return res.status(400).json({ message: "No image data provided." });

    const buf = Buffer.from(base64, "base64");
    const tmpPath = path.join(os.tmpdir(), `slateboard-${board.roomKey}-${Date.now()}.png`);

    // Write to tmp file using fs (demonstrates fs module)
    await fs.promises.writeFile(tmpPath, buf);

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `attachment; filename="${board.roomKey}.png"`);
    res.setHeader("Content-Length", buf.length);

    // Read back with createReadStream (demonstrates Readable stream)
    const readStream = fs.createReadStream(tmpPath);
    await pipelineAsync(readStream, res);

    // Cleanup temp file
    fs.unlink(tmpPath, () => {});
  } catch (error) {
    console.error("[export] png error:", error);
    if (!res.headersSent) res.status(500).json({ message: "PNG export failed." });
  }
});

module.exports = router;
