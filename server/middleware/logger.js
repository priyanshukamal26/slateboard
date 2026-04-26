const fs = require("fs");
const path = require("path");

const LOG_DIR = path.join(__dirname, "..", "..", "logs");
const LOG_FILE = path.join(LOG_DIR, "access.log");

// Ensure logs directory exists
try {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
} catch (_) {
  /* ignore */
}

/**
 * Request logger middleware.
 * Logs method, url, status, response-time, and userId to stdout + logs/access.log
 */
function logger(req, res, next) {
  const start = process.hrtime.bigint();
  const dateStr = new Date().toISOString();

  res.on("finish", () => {
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
    const userId = req.user ? req.user._id || req.user.id : "guest";

    const entry = JSON.stringify({
      date: dateStr,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      ms: elapsedMs.toFixed(2),
      userId,
      ip: req.ip || req.connection.remoteAddress,
    });

    process.stdout.write(entry + "\n");

    // Append to log file via stream (demonstrates Node.js streams / fs)
    fs.appendFile(LOG_FILE, entry + "\n", (err) => {
      if (err) process.stderr.write("[logger] Failed to write log: " + err.message + "\n");
    });
  });

  next();
}

module.exports = { logger };
