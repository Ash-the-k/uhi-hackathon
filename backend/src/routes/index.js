// backend/src/routes/index.js
const express = require('express');
const path = require('path');

const router = express.Router();

function tryRequire(modPath) {
  try {
    const required = require(modPath);
    return required;
  } catch (err) {
    console.warn(`routes: failed to require ${modPath} — ${err.message}`);
    return null;
  }
}

function mountIfRouter(mountPath, modPath) {
  const mod = tryRequire(modPath);
  if (!mod) return;

  // module could export router directly, or export an object with router property
  const candidate = mod.router || mod;

  // router objects usually have 'use' or 'stack' or 'handle'
  const looksLikeRouter = candidate && (
    typeof candidate === 'function' ||
    typeof candidate.use === 'function' ||
    Array.isArray(candidate.stack) ||
    typeof candidate.handle === 'function'
  );

  if (looksLikeRouter) {
    router.use(mountPath, candidate);
    console.log(`routes: mounted ${modPath} @ ${mountPath}`);
  } else {
    console.warn(`routes: skipping ${modPath} — exported value is not an express router`);
  }
}

// Mount known modules (if some modules are missing or empty, they will be skipped)
// Edit this list as modules are added/removed
mountIfRouter('/auth', path.join(__dirname, '..', 'modules', 'auth', 'auth.routes'));
mountIfRouter('/users', path.join(__dirname, '..', 'modules', 'users', 'users.routes'));
mountIfRouter('/patients', path.join(__dirname, '..', 'modules', 'patients', 'patients.routes'));
mountIfRouter('/doctors', path.join(__dirname, '..', 'modules', 'doctors', 'doctors.routes'));
mountIfRouter('/staff', path.join(__dirname, '..', 'modules', 'staff', 'staff.routes'));
mountIfRouter('/consultations', path.join(__dirname, '..', 'modules', 'consultations', 'consultations.routes'));
mountIfRouter('/prescriptions', path.join(__dirname, '..', 'modules', 'prescriptions', 'prescriptions.routes'));
mountIfRouter('/lhp', path.join(__dirname, '..', 'modules', 'lhp', 'lhp.routes'));
mountIfRouter('/timeline', path.join(__dirname, '..', 'modules', 'timeline', 'timeline.routes'));
mountIfRouter('/notifications', path.join(__dirname, '..', 'modules', 'notifications', 'notifications.routes'));
mountIfRouter('/appointments', path.join(__dirname, '..', 'modules', 'appointments', 'appointments.routes'));
// default health / info route on the router (optional)
router.get('/', (req, res) => res.json({ ok: true, routes: 'see server logs for mounted routes' }));

module.exports = router;
