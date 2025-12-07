// consultations.controller.js (FINAL MERGED VERSION)
// - Compatible with existing frontend
// - Includes: list, getById, create, update (PATCH), verifySoap, uploadAudio

const svc = require('./consultations.service');
const fs = require('fs');
const path = require('path');

/* -----------------------------------------------
 * LIST (role-filtered)
 * ---------------------------------------------*/
async function list(req, res, next) {
  try {
    const user = req.user || {};
    let filter = {};

    if (user.role === 'doctor') {
      if (!user.doctorId)
        return res.status(400).json({ error: 'Doctor context missing (doctorId)' });
      filter.doctorId = user.doctorId;

    } else if (user.role === 'patient') {
      if (!user.patientId)
        return res.status(400).json({ error: 'Patient context missing (patientId)' });
      filter.patientId = user.patientId;

    } else if (user.role === 'staff') {
      filter = {}; // staff sees all unless FE filters

    } else {
      // Admin / other roles may filter via query
      if (req.query.patientId) filter.patientId = req.query.patientId;
      if (req.query.doctorId) filter.doctorId = req.query.doctorId;
    }

    const rows = await svc.list(filter);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return next(err);
  }
}

/* -----------------------------------------------
 * GET BY ID (with access rules)
 * ---------------------------------------------*/
async function getById(req, res, next) {
  try {
    const id = req.params.id;
    const doc = await svc.getById(id);

    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });

    const user = req.user || {};

    if (user.role === 'doctor' && String(doc.doctorId) !== String(user.doctorId))
      return res.status(403).json({ success: false, message: 'Forbidden' });

    if (user.role === 'patient' && String(doc.patientId) !== String(user.patientId))
      return res.status(403).json({ success: false, message: 'Forbidden' });

    return res.json({ success: true, data: doc });
  } catch (err) {
    return next(err);
  }
}

/* -----------------------------------------------
 * CREATE consultation
 * ---------------------------------------------*/
async function create(req, res, next) {
  try {
    const payload = req.body || {};

    if (!payload.patientId || !payload.doctorId)
      return res.status(400).json({
        success: false,
        message: 'patientId and doctorId are required'
      });

    payload.createdByRole = req.user?.role || 'unknown';
    payload.createdByUserId = req.user?.userId || req.user?.sub;

    const newDoc = await svc.create(payload);
    return res.status(201).json({ success: true, data: newDoc });
  } catch (err) {
    return next(err);
  }
}

/* -----------------------------------------------
 * PATCH update (audio, transcript, *flat soap*)
 * ---------------------------------------------*/
async function update(req, res, next) {
  try {
    const id = req.params.id;
    const user = req.user || {};
    const existing = await svc.getById(id);

    if (!existing)
      return res.status(404).json({ success: false, message: 'Not found' });

    // Access: doctor can modify their own consult, admin can, patient cannot
    if (user.role === 'doctor' && String(existing.doctorId) !== String(user.doctorId))
      return res.status(403).json({ success: false, message: 'Forbidden: not your consultation' });

    if (user.role === 'patient')
      return res.status(403).json({ success: false, message: 'Forbidden for patients' });

    const payload = { ...(req.body || {}) };

    // If soap is sent flat → wrap as soap.current (NOT verify)
    if (payload.soap && !payload.soap.current) {
      const s = payload.soap;
      const history = Array.isArray(existing.soap?.history)
        ? existing.soap.history
        : [];

      payload.soap = {
        current: {
          subjective: s.subjective,
          objective: s.objective,
          assessment: s.assessment,
          plan: s.plan,
          editedByUserId: user.userId || user.sub,
          editedByRole: user.role,
          editedAt: new Date()
        },
        history
      };
    }

    const updated = await svc.update(id, payload);
    return res.json({ success: true, data: updated });
  } catch (err) {
    return next(err);
  }
}

/* -----------------------------------------------
 * VERIFY SOAP (doctor only, moves history)
 * ---------------------------------------------*/
async function verifySoap(req, res, next) {
  try {
    if (req.user?.role !== 'doctor')
      return res.status(403).json({ success: false, message: 'Only doctors can verify' });

    const id = req.params.id;
    const newSoap = req.body.soap;

    if (!newSoap)
      return res.status(400).json({ success: false, message: 'soap object required' });

    const doc = await svc.getById(id);
    if (!doc)
      return res
        .status(404)
        .json({ success: false, message: 'Consultation not found' });

    if (String(doc.doctorId) !== String(req.user.doctorId))
      return res.status(403).json({
        success: false,
        message: 'Forbidden: not your consultation'
      });

    const history = Array.isArray(doc.soap?.history) ? doc.soap.history.slice() : [];

    if (doc.soap && doc.soap.current && Object.keys(doc.soap.current).length)
      history.unshift(doc.soap.current);

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

    return res.json({ success: true, data: updated });
  } catch (err) {
    return next(err);
  }
}

/* -----------------------------------------------
 * UPLOAD AUDIO (doctor-only)
 * ---------------------------------------------*/
async function uploadAudio(req, res, next) {
  try {
    if (req.user?.role !== 'doctor')
      return res.status(403).json({
        success: false,
        message: 'Only doctors can upload audio'
      });

    const id = req.params.id;
    const doc = await svc.getById(id);
    if (!doc)
      return res.status(404).json({ success: false, message: 'Consultation not found' });

    if (String(doc.doctorId) !== String(req.user.doctorId))
      return res.status(403).json({
        success: false,
        message: 'Forbidden: not your consultation'
      });

    if (!req.file)
      return res.status(400).json({ success: false, message: 'Audio file is required' });

    // Always save as .mp3 (convert extension)
    const newFilename = `audio_${id}.mp3`;

    const audioDir = path.join(__dirname, '../../uploads/audio');
    const oldPath = req.file.path;
    const newPath = path.join(audioDir, newFilename);

    // Delete old audio if exists
    if (doc.audioPath) {
      const oldAudioPath = path.join(audioDir, path.basename(doc.audioPath));
      if (fs.existsSync(oldAudioPath)) {
        try {
          fs.unlinkSync(oldAudioPath);
        } catch {}
      }
    }

    // Rename file (if it was webm, we're just changing extension - proper conversion would need ffmpeg)
    fs.renameSync(oldPath, newPath);

    const audioPath = `/uploads/audio/${newFilename}`;
    const updated = await svc.update(id, { audioPath });

    // Trigger async transcript and SOAP generation
    // Don't await - let it run in background
    processAudioAndGenerateSOAP(id, audioPath).catch(err => {
      console.error('Error processing audio/transcript/SOAP:', err);
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    return next(err);
  }
}

/* -----------------------------------------------
 * Process audio: transcript → SOAP → LHP Suggestions (async)
 * ---------------------------------------------*/
async function processAudioAndGenerateSOAP(consultationId, audioPath) {
  try {
    const aiService = require('../../services/aiService/mock');
    const lhpService = require('../lhp/lhp.service');
    const fullAudioPath = path.join(__dirname, '../../', audioPath);

    // Step 1: Transcribe audio
    console.log(`[Consultation ${consultationId}] Starting transcription...`);
    const transcript = await aiService.transcribeAudio(fullAudioPath);
    
    // Step 2: Update consultation with transcript
    await svc.update(consultationId, { transcript });
    console.log(`[Consultation ${consultationId}] Transcript updated`);

    // Step 3: Generate SOAP from transcript
    console.log(`[Consultation ${consultationId}] Generating SOAP...`);
    const soapData = await aiService.generateSOAP(transcript);
    
    // Step 4: Update consultation with SOAP (using PATCH - no history push)
    if (soapData && (soapData.subjective || soapData.objective || soapData.assessment || soapData.plan)) {
      await svc.update(consultationId, { soap: soapData });
      console.log(`[Consultation ${consultationId}] SOAP generated and updated`);
    }

    // Step 5: Get updated consultation with SOAP
    const updatedConsultation = await svc.getById(consultationId);
    
    // Step 6: Wait a few seconds before generating LHP Suggestions (gap between SOAP and suggestions)
    console.log(`[Consultation ${consultationId}] Waiting before generating LHP Suggestions...`);
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
    
    // Step 7: Generate LHP Suggestions from consultation (after SOAP is ready)
    console.log(`[Consultation ${consultationId}] Generating LHP Suggestions...`);
    const suggestions = await aiService.generateLhpSuggestionsFromConsultation(updatedConsultation);
    
    // Step 8: Create LHP suggestions in database
    if (suggestions && Array.isArray(suggestions) && suggestions.length > 0) {
      for (const suggestion of suggestions) {
        try {
          await lhpService.createSuggestion({
            patientId: suggestion.patientId || updatedConsultation.patientId,
            doctorId: suggestion.doctorId || updatedConsultation.doctorId,
            sourceType: 'CONSULTATION',
            sourceEventId: suggestion.sourceEventId || consultationId,
            section: suggestion.section,
            proposedEntry: suggestion.proposedEntry,
            status: 'PENDING'
          });
        } catch (suggestionErr) {
          console.error(`[Consultation ${consultationId}] Error creating suggestion:`, suggestionErr);
        }
      }
      console.log(`[Consultation ${consultationId}] Created ${suggestions.length} LHP suggestions`);
    }
  } catch (err) {
    console.error(`[Consultation ${consultationId}] Error in processAudioAndGenerateSOAP:`, err);
    throw err;
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  verifySoap,
  uploadAudio
};
