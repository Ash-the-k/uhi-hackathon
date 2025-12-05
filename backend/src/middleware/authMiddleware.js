/**
 * authMiddleware.js
 * - verifies JWT from Authorization header
 * - attaches `req.user` (decoded token)
 * - if token lacks doctorId/patientId/staffId, performs one DB lookup to attach them
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

async function requireAuth(req, res, next) {
  try {
    const token = parseAuthHeader(req);
    if (!token) return res.status(401).json({ error: 'Unauthorized: no token' });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized: invalid token' });
    }

    // Put decoded into req.user (common fields)
    // Normalize a few field names used across the app
    const user = {
      // prefer sub but accept other variants
      userId: decoded.sub || decoded.userId || decoded.id || null,
      sub: decoded.sub || null,
      role: decoded.role || decoded.r || null,
      name: decoded.name || null,
      email: decoded.email || null,
      doctorId: decoded.doctorId || null,
      patientId: decoded.patientId || null,
      staffId: decoded.staffId || null
    };

    req.user = user;

    // DEBUG logs to help trace RBAC/forbidden problems during dev (safe to keep)
    try {
      console.log('requireAuth: token payload ->', {
        sub: decoded.sub,
        role: decoded.role,
        doctorId: decoded.doctorId,
        patientId: decoded.patientId,
        staffId: decoded.staffId
      });
      console.log('requireAuth: initial req.user ->', req.user);
    } catch (e) { /* ignore logging errors */ }

    // If token didn't include domain ids, try one DB lookup to attach them
    // This avoids many lookups in controllers while ensuring required context exists.
    if ((!req.user.doctorId || !req.user.patientId || !req.user.staffId) && req.user.userId) {
      try {
        const u = await User.findById(req.user.userId).lean().exec();
        if (u) {
          if (!req.user.doctorId && u.doctorId) req.user.doctorId = String(u.doctorId);
          if (!req.user.patientId && u.patientId) req.user.patientId = String(u.patientId);
          if (!req.user.staffId && u.staffId) req.user.staffId = String(u.staffId);
          if (!req.user.email && u.email) req.user.email = u.email;
          if (!req.user.name && u.name) req.user.name = u.name;
        }
      } catch (e) {
        console.warn('authMiddleware: user lookup failed', e && e.message);
        // continue without DB-enriched IDs — controllers should handle missing context
      }
    }

    // Final debug
    try { console.log('requireAuth: resolved req.user ->', req.user); } catch (e) {}

    return next();
  } catch (err) {
    return next(err);
  }
}

function requireRole(roles = []) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    return next();
  };
}

module.exports = { requireAuth, requireRole };
