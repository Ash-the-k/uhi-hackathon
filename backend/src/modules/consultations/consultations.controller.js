// consultations.controller.js (fixed)
// - uses createdByRole & createdByUserId to match ConsultationEvent schema
// - enforces doctor/patient access in getById
// - list respects role-based filters and admin query override
// - verifySoap pushes previous version into history (keeps history)
const svc = require('./consultations.service');
const fs = require('fs');
const path = require('path');

/**
 * List consultations (role-filtered)
 */
async function list(req, res, next) {
  try {
    const user = req.user || {}; // must be set by requireAuth
    let filter = {};

    if (user.role === 'doctor') {
      // expect req.user.doctorId to be set by JWT or auth middleware
      if (!user.doctorId) return res.status(400).json({ error: 'Doctor context missing (doctorId)' });
      filter.doctorId = user.doctorId;
    } else if (user.role === 'patient') {
      if (!user.patientId) return res.status(400).json({ error: 'Patient context missing (patientId)' });
      filter.patientId = user.patientId;
    } else if (user.role === 'staff') {
      // staff: optionally filter by query params (default: none)
      // leave filter empty to show all; frontend should narrow with query params
      filter = {};
    } else {
      // admin / other: allow optional query filters (e.g., ?patientId=...)
      if (req.query.patientId) filter.patientId = req.query.patientId;
      if (req.query.doctorId) filter.doctorId = req.query.doctorId;
    }

    const rows = await svc.list(filter);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return next(err);
  }
}

/**
 * Get consultation by id with access checks
 */
async function getById(req, res, next) {
  try {
    const id = req.params.id;
    const doc = await svc.getById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });

    const user = req.user || {};
    if (user.role === 'doctor' && String(doc.doctorId) !== String(user.doctorId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    if (user.role === 'patient' && String(doc.patientId) !== String(user.patientId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    return res.json({ success: true, data: doc });
  } catch (err) {
    return next(err);
  }
}

/**
 * Create consultation
 * - expects patientId and doctorId in body
 * - sets createdByRole & createdByUserId (schema fields)
 */
async function create(req, res, next) {
  try {
    const payload = req.body || {};

    // Ensure required ids exist (basic validation)
    if (!payload.patientId || !payload.doctorId) {
      return res.status(400).json({ success: false, message: 'patientId and doctorId are required' });
    }

    // attach createdByRole / createdByUserId to match schema
    payload.createdByRole = req.user?.role || payload.createdByRole || 'unknown';
    payload.createdByUserId = req.user?.userId || req.user?.sub || payload.createdByUserId;

    const newDoc = await svc.create(payload);
    return res.status(201).json({ success: true, data: newDoc });
  } catch (err) {
    return next(err);
  }
}

/**
 * verifySoap - doctor action
 * - pushes existing soap.current into soap.history (if present)
 * - updates current soap and marks VERIFIED_DOCTOR
 */
async function verifySoap(req, res, next) {
  try {
    if (req.user?.role !== 'doctor') return res.status(403).json({ success:false, message:'Only doctors can verify' });

    const id = req.params.id;
    const newSoap = req.body.soap;
    if (!newSoap) return res.status(400).json({ success:false, message:'soap object required' });

    // load current doc
    const doc = await svc.getById(id);
    if (!doc) return res.status(404).json({ success:false, message:'Consultation not found' });

    // enforce doctor ownership
    if (String(doc.doctorId) !== String(req.user.doctorId)) {
      return res.status(403).json({ success:false, message:'Forbidden: not your consultation' });
    }

    // prepare history: push existing current into history if exists
    const history = Array.isArray(doc.soap?.history) ? doc.soap.history.slice() : [];
    if (doc.soap && doc.soap.current && Object.keys(doc.soap.current).length) {
      history.unshift(doc.soap.current);
    }

    // set updated soap
    const soapToSave = {
      current: {
        subjective: newSoap.subjective,
        objective: newSoap.objective,
        assessment: newSoap.assessment,
        plan: newSoap.plan,
        editedByUserId: req.user.userId || req.user.sub,
        editedByRole: req.user.role,
        editedAt: new Date()
      },
      history
    };

    const updated = await svc.update(id, {
      soap: soapToSave,
      status: 'VERIFIED_DOCTOR',
      lastVerifiedBy: req.user.userId || req.user.sub,
      lastVerifiedAt: new Date()
    });

    return res.json({ success:true, data: updated });
  } catch(err) {
    return next(err);
  }
}

/**
 * Upload audio for consultation
 */
async function uploadAudio(req, res, next) {
  try {
    if (req.user?.role !== 'doctor') {
      return res.status(403).json({ success: false, message: 'Only doctors can upload audio' });
    }

    const id = req.params.id;
    const doc = await svc.getById(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Consultation not found' });
    }

    // Enforce doctor ownership
    if (String(doc.doctorId) !== String(req.user.doctorId)) {
      return res.status(403).json({ success: false, message: 'Forbidden: not your consultation' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Audio file is required' });
    }

    // Rename file to use consultation ID
    const fileExtension = path.extname(req.file.filename);
    const newFilename = `audio_${id}${fileExtension}`;
    const oldPath = req.file.path;
    const audioUploadDir = path.join(__dirname, '../../uploads/audio');
    const newPath = path.join(audioUploadDir, newFilename);

    // Delete old audio file if it exists
    if (doc.audioPath) {
      const oldAudioPath = path.join(audioUploadDir, path.basename(doc.audioPath));
      if (fs.existsSync(oldAudioPath)) {
        try {
          fs.unlinkSync(oldAudioPath);
        } catch (err) {
          console.error('Error deleting old audio file:', err);
        }
      }
    }

    // Rename the new file
    fs.renameSync(oldPath, newPath);

    // Update consultation with audio path
    const audioPath = `/uploads/audio/${newFilename}`;
    const updated = await svc.update(id, { audioPath });

    return res.json({ success: true, data: updated });
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, getById, create, verifySoap, uploadAudio };
