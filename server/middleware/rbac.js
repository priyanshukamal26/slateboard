/**
 * Role-Based Access Control (RBAC) middleware factory.
 * Covers Unit III (Express middleware) and security requirements.
 */

/**
 * requireRole(...roles) — checks req.user.role against allowed roles.
 * Example: requireRole("admin", "teacher")
 */
function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized." });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role: ${roles.join(" or ")}.`,
      });
    }
    next();
  };
}

/**
 * requireBoardOwner — verifies req.user is the board owner.
 * Expects req.board to be set by a prior middleware or route.
 */
function requireBoardOwner(req, res, next) {
  if (!req.user || !req.board) {
    return res.status(401).json({ message: "Unauthorized." });
  }
  if (String(req.board.ownerId) !== String(req.user._id || req.user.id)) {
    return res.status(403).json({ message: "Only the board owner can perform this action." });
  }
  next();
}

/**
 * requireBoardRole(...roles) — checks the user's role on a specific board.
 * Reads collaboratorRoles from req.board.
 */
function requireBoardRole(...roles) {
  return function (req, res, next) {
    if (!req.user || !req.board) {
      return res.status(401).json({ message: "Unauthorized." });
    }
    const userId = String(req.user._id || req.user.id);
    const boardOwner = String(req.board.ownerId);
    const actualRole =
      userId === boardOwner
        ? "owner"
        : req.board.collaboratorRoles.get(userId) || req.board.defaultRole || "viewer";

    if (!roles.includes(actualRole)) {
      return res.status(403).json({
        message: `This action requires board role: ${roles.join(" or ")}.`,
      });
    }
    next();
  };
}

module.exports = { requireRole, requireBoardOwner, requireBoardRole };
