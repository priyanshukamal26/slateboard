/**
 * Security headers middleware — no Helmet package.
 * Manually sets HTTP security headers.
 * Covers Unit III security requirements.
 */
function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' https://cdn.socket.io https://cdnjs.cloudflare.com 'unsafe-inline' 'unsafe-eval'",
      "style-src  'self' https://fonts.googleapis.com https://cdnjs.cloudflare.com 'unsafe-inline'",
      "font-src   'self' https://fonts.gstatic.com  https://cdnjs.cloudflare.com data:",
      "img-src    'self' data: blob:",
      "connect-src 'self' wss: ws:",
    ].join("; ")
  );
  next();
}

module.exports = { securityHeaders };
