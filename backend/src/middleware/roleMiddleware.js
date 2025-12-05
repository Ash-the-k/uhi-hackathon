/**
 * requireRole(allowedRoles)
 * - allowedRoles: string or array of strings
 * - returns an express middleware that checks req.user.role
 * - role comparison is case-insensitive
 */
function requireRole(allowedRoles = []) {
  const allowed = (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles])
    .map(r => String(r).toLowerCase());

  return (req, res, next) => {
    try {
      const user = req.user || {};
      const role = (user.role || '').toString().toLowerCase();

      // DEBUG: log role check for troubleshooting
      try { console.log('requireRole: allowed=', allowed, 'req.user.role=', user.role); } catch (e) {}

      if (!role) {
        console.log('requireRole: forbidden -> no role on req.user');
        return res.status(403).json({ error: 'Forbidden' });
      }

      if (!allowed.includes(role)) {
        console.log('requireRole: forbidden -> role not allowed', { role, allowed });
        return res.status(403).json({ error: 'Forbidden' });
      }

      return next();
    } catch (err) {
      console.error('requireRole error', err);
      return res.status(500).json({ error: 'Server error' });
    }
  };
}

/* Backwards-compatible exports */
module.exports = { requireRole };
module.exports.requireRole = requireRole;
