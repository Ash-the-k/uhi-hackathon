const jwt = require('jsonwebtoken');
const User = require('../../db/models/User'); // ensure this model exists
const bcrypt = require('bcryptjs');

const adminLogin = async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'apiKey required' });
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Invalid admin key' });
  }

  const payload = { sub: 'admin', role: 'admin', name: 'UHI Admin' };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
  return res.json({ token, role: 'admin' });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email & password required' });
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  
  // Include domain IDs (doctorId, patientId, staffId) in JWT payload
  const payload = {
    sub: user._id.toString(),
    role: user.role,
    name: user.name,
    doctorId: user.doctorId ? user.doctorId.toString() : undefined,
    patientId: user.patientId ? user.patientId.toString() : undefined,
    staffId: user.staffId ? user.staffId.toString() : undefined
  };
  
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, role: user.role, userId: user._id });
};

module.exports = { adminLogin, login };
