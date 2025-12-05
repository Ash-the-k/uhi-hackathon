/**
 * authMiddleware.js
 * - verifies JWT from Authorization header
 * - attaches `req.user` (decoded token + DB-enriched IDs)
 * - exports: requireAuth, requireRole
 */
const jwt = require('jsonwebtoken');
const User = require('../db/models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function parseAuthHeader(req) {
  const h = req.headers.authorization || req.headers.Authorization || '';
  if (!h) return null;
  const parts = h.split(' ');
  if (parts.length !== 2) return null;
  const scheme = parts[0];
  const token = parts[1];
  if (!/^Bearer$/i.test(scheme)) return null;
  return token;
}

/**
 * requireAuth
 * - verifies JWT
 * - sets req.user = { id, userId, role, email, name, doctorId, patientId, staffId }
 */
async function requireAuth(req, res, next) {
  try {
    const token = parseAuthHeader(req);
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: no token' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized: invalid token' });
    }

    // Normalize common fields from token
    const idFromToken =
      decoded.sub || decoded.userId || decoded.id || null;

    const roleFromToken = (decoded.role || decoded.r || '').toString().toLowerCase() || null;

    const user = {
      id: idFromToken,               // <- this is what your controllers use (req.user.id)
      userId: idFromToken,           // alias, for convenience
      sub: decoded.sub || null,
      role: roleFromToken,
      name: decoded.name || null,
      email: decoded.email || null,
      doctorId: decoded.doctorId || null,
      patientId: decoded.patientId || null,
      staffId: decoded.staffId || null,
    };

    req.user = user;

    // DEBUG (optional) – you can comment these out later
    try {
      console.log('requireAuth: token payload ->', {
        sub: decoded.sub,
        role: decoded.role,
        doctorId: decoded.doctorId,
        patientId: decoded.patientId,
        staffId: decoded.staffId,
      });
      console.log('requireAuth: initial req.user ->', req.user);
    } catch (e) { /* ignore logging errors */ }

    // Enrich with domain IDs from User document if missing
    if (req.user.id) {
      try {
        const u = await User.findById(req.user.id).lean().exec();
        if (u) {
          if (!req.user.doctorId && u.doctorId) {
            req.user.doctorId = String(u.doctorId);
          }
          if (!req.user.patientId && u.patientId) {
            req.user.patientId = String(u.patientId);
          }
          if (!req.user.staffId && u.staffId) {
            req.user.staffId = String(u.staffId);
          }
          if (!req.user.email && u.email) {
            req.user.email = u.email;
          }
          if (!req.user.name && u.name) {
            req.user.name = u.name;
          }
          if (!req.user.role && u.role) {
            req.user.role = String(u.role).toLowerCase();
          }
        }
      } catch (e) {
        console.warn('authMiddleware: user lookup failed', e && e.message);
        // continue even if lookup fails – controllers should handle missing context
      }
    }

    // Final debug (optional)
    try {
      console.log('requireAuth: resolved req.user ->', req.user);
    } catch (e) {}

    return next();
  } catch (err) {
    console.error('requireAuth unexpected error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * requireRole
 * - allowedRoles: string | string[]
 * - compares case-insensitive against req.user.role
 */
function requireRole(roles = []) {
  const allowed = (Array.isArray(roles) ? roles : [roles])
    .map(r => String(r).toLowerCase());

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = (req.user.role || '').toString().toLowerCase();
    console.log('requireRole: checking', { role, allowed, userId: req.user.id });

    if (!role) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!allowed.includes(role)) {
      return res.status(403).json({
        error: 'Forbidden',
        reason: 'role-not-allowed',
        role,
        allowed,
      });
    }

    return next();
  };
}

module.exports = { requireAuth, requireRole };
module.exports.requireAuth = requireAuth;
module.exports.requireRole = requireRole;