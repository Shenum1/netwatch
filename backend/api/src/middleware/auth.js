import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "change_me_in_production";

/**
 * requireAuth — verifies Bearer JWT on every protected route.
 * Attaches decoded payload to req.user.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token invalid or expired" });
  }
}

/**
 * optionalAuth — attaches user if token present, continues either way.
 * Used for WebSocket upgrade and public read endpoints.
 */
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(header.slice(7), SECRET);
    } catch {
      // ignore invalid tokens on optional routes
    }
  }
  next();
}


/**
 * requireRole — must be used AFTER requireAuth.
 * Usage: router.delete("/:id", requireAuth, requireRole("admin"), handler)
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Requires role: ${roles.join(" or ")}. Your role: ${req.user.role}`,
      });
    }
    next();
  };
}
