/**
 * auth.controller.js
 * - POST /api/auth/login
 * - finds user by email
 * - verifies password (supports passwordHash with bcrypt OR plain password)
 * - issues JWT that includes: sub, role, doctorId/patientId/staffId, email, name
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../../db/models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';

// Helper: sign token with extra ids when present
function signTokenForUser(user) {
  const payload = {
    sub: String(user._id),
    role: user.role,
  };

  // include pointers if they exist on the user doc
  if (user.doctorId) payload.doctorId = String(user.doctorId);
  if (user.patientId) payload.patientId = String(user.patientId);
  if (user.staffId) payload.staffId = String(user.staffId);

  // optional convenience fields
  if (user.email) payload.email = user.email;
  if (user.name) payload.name = user.name;

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// POST /api/auth/login
// body: { email, password }
async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }

    const user = await User.findOne({ email }).exec();
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Support both hashed and plain passwords (for seeded/demo data)
    let ok = false;

    if (user.passwordHash) {
      // Normal secure path
      ok = await bcrypt.compare(password, user.passwordHash);
    } else if (user.password) {
      // Fallback: plain-text comparison (if your seeds/store `password` in clear)
      ok = password === user.password;
    }

    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signTokenForUser(user);

    // Frontend + tests expect this shape:
    return res.json({
      token,
      role: user.role,
      userId: String(user._id),
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { login, signTokenForUser };