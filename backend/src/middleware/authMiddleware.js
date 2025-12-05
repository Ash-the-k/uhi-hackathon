// backend/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

function parseTokenFromHeader(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  return h.slice(7).trim();
}

/**
 * requireAuth middleware
 * - verifies JWT
 * - attaches req.user = { sub, role, name, doctorId, patientId, staffId }
 * - sends 401 on invalid/missing token
 */
function requireAuth(req, res, next) {
  try {
    const token = parseTokenFromHeader(req);
    if (!token) return res.status(401).json({ error: 'Unauthorized: no token' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // DEBUG: log payload role/sub for troubleshooting Forbidden issues
    try {
      console.log('requireAuth: token payload ->', { sub: payload.sub, role: payload.role });
    } catch (e) { /* ignore logging errors */ }
    
    const userId = payload.sub || payload.userId || payload.id || null;
    const role = payload.role || payload.r || null;

    const user = {
      id: userId,
      sub: payload.sub,
      role: role,
      name: payload.name,
      doctorId: payload.doctorId,
      patientId: payload.patientId,
      staffId: payload.staffId
    };
    req.user = user;
    // DEBUG: expose resolved user info for middleware diagnostics
    try {
      console.log('requireAuth: req.user ->', req.user);
    } catch (e) { /* ignore */ }
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: invalid token' });
  }
}

/**
 * requireRole(roleOrArray)
 * returns middleware that ensures req.user.role === role (or included in array)
 */
function requireRole(roleOrArray) {
  const roles = Array.isArray(roleOrArray) ? roleOrArray : [roleOrArray];
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
