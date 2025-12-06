const express = require('express');
const router = express.Router();

// import actual middleware functions
const { requireAuth } = require('../../middleware/authMiddleware');
const { requireRole } = require('../../middleware/roleMiddleware');
const ctrl = require('./appointments.controller');
const diagCtrl = require('./diagnostic.controller');

// DIAGNOSTIC — debug endpoint (any authenticated user)
router.get('/diagnostic/check', requireAuth, diagCtrl.diagnostic);

// PATIENT or ADMIN — create appointment
router.post('/', requireAuth, requireRole(['patient', 'admin']), ctrl.createAppointment);

// ADMIN — view all appointments
router.get('/', requireAuth, requireRole(['admin']), ctrl.getAllAppointments);

// PATIENT — get own appointments
router.get('/mine', requireAuth, requireRole(['patient']), ctrl.getMyAppointments);

// DOCTOR — get appointments assigned to the doctor
router.get('/doctor', requireAuth, requireRole(['doctor']), ctrl.getDoctorAppointments);

// DOCTOR/ADMIN — get appointment by id
router.get('/:id', requireAuth, requireRole(['doctor', 'admin']), ctrl.getAppointmentById);

// DOCTOR — update appointment status (completed/cancelled) — MUST come BEFORE /:id/start
router.patch('/:id/status', requireAuth, requireRole(['doctor']), ctrl.updateStatus);

// DOCTOR — start consultation — MUST come AFTER /:id/status to avoid pattern collision
router.patch('/:id/start', requireAuth, requireRole(['doctor']), ctrl.startAppointment);

module.exports = router;

