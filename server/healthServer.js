/**
 * Raw Node.js HTTP health server — NO Express.
 * Demonstrates Unit II: http module usage.
 * Runs on PORT+1 (default 3001).
 */
const http = require("http");
const os = require("os");
const process = require("process");
const mongoose = require("mongoose");

const startTime = Date.now();

function getMemoryMB() {
  const mem = process.memoryUsage();
  return {
    heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(1) + " MB",
    heapTotal: (mem.heapTotal / 1024 / 1024).toFixed(1) + " MB",
    rss: (mem.rss / 1024 / 1024).toFixed(1) + " MB",
  };
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ${s % 60}s`;
}

function getMongoState() {
  const states = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
  return states[mongoose.connection.readyState] || "unknown";
}

const healthServer = http.createServer((req, res) => {
  const url = req.url.split("?")[0];

  // CORS for local dev
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  if (url === "/health") {
    const body = JSON.stringify(
      {
        status: "ok",
        uptime: formatUptime(Date.now() - startTime),
        mongo: getMongoState(),
        memory: getMemoryMB(),
        nodeVer: process.version,
        platform: process.platform,
        pid: process.pid,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    );

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(body);
    return;
  }

  if (url === "/metrics") {
    // Prometheus-style plain-text metrics
    const mem = process.memoryUsage();
    const lines = [
      "# HELP slateboard_uptime_seconds Server uptime in seconds",
      "# TYPE slateboard_uptime_seconds gauge",
      `slateboard_uptime_seconds ${Math.floor((Date.now() - startTime) / 1000)}`,
      "# HELP slateboard_heap_used_bytes Heap used",
      "# TYPE slateboard_heap_used_bytes gauge",
      `slateboard_heap_used_bytes ${mem.heapUsed}`,
      "# HELP slateboard_heap_total_bytes Heap total",
      "# TYPE slateboard_heap_total_bytes gauge",
      `slateboard_heap_total_bytes ${mem.heapTotal}`,
      "# HELP slateboard_mongo_up MongoDB connection state (1=connected)",
      "# TYPE slateboard_mongo_up gauge",
      `slateboard_mongo_up ${mongoose.connection.readyState === 1 ? 1 : 0}`,
    ];

    res.writeHead(200, { "Content-Type": "text/plain; version=0.0.4" });
    res.end(lines.join("\n") + "\n");
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found. Try /health or /metrics" }));
});

function startHealthServer(mainPort) {
  const healthPort = (Number(mainPort) || 3000) + 1;
  healthServer.listen(healthPort, () => {
    console.log(`[health] Health server running on port ${healthPort} — GET /health or /metrics`);
  });
  healthServer.on("error", (err) => {
    console.error("[health] Health server error:", err.message);
  });
}

module.exports = { startHealthServer };
