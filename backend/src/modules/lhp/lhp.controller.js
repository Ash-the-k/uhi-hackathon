// backend/src/modules/lhp/lhp.controller.js
const svc = require('./lhp.service');

async function getLhp(req, res, next) {
  try {
    const patientId = req.params.patientId;

    // Patients can only access their own LHP
    if (
      req.user.role === 'patient' &&
      String(req.user.patientId) !== String(patientId)
    ) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const viewer = {
      role: req.user.role,
      userId: req.user.userId,
      doctorId: req.user.doctorId,
      patientId: req.user.patientId
    };

    const lhp = await svc.getLhp(patientId, viewer);
    return res.json({ success: true, data: lhp });
  } catch (err) {
    next(err);
  }
}


async function listSuggestions(req, res, next) {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ success: false, message: 'Only doctors can view suggestions' });
    }
    const doctorId = req.user.doctorId;
    const rows = await svc.listSuggestionsForDoctor(doctorId);
    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

async function createSuggestion(req, res, next) {
  try {
    const doc = await svc.createSuggestion(req.body);
    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
}

async function actOnSuggestion(req, res, next) {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Only doctors can act on suggestions'
      });
    }

    const suggestionId = req.params.id;
    const { action, editedEntry } = req.body; // 'accept' or 'reject', optional editedEntry

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action'
      });
    }

    // 🔐 Ownership + status check
    const suggestion = await svc.getSuggestionById(suggestionId);
    if (!suggestion) {
      return res.status(404).json({
        success: false,
        message: 'Suggestion not found'
      });
    }

    if (String(suggestion.doctorId) !== String(req.user.doctorId)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: suggestion is not assigned to this doctor'
      });
    }

    if (suggestion.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Suggestion is not in PENDING state'
      });
    }

    // 🔁 Reject path
    if (action === 'reject') {
      const updated = await svc.actOnSuggestion(
        suggestionId,
        action,
        req.user.userId
      );
      return res.json({ success: true, data: updated });
    }

    // ✅ Accept → create entry + mark suggestion accepted
    // If editedEntry is provided, use it instead of the original proposedEntry
    const createdEntry = await svc.acceptSuggestionAndCreateEntry(
      suggestionId,
      req.user.userId,
      editedEntry // Pass edited entry if provided
    );
    return res.json({ success: true, data: createdEntry });
  } catch (err) {
    next(err);
  }
}


module.exports = {
  getLhp,
  listSuggestions,
  createSuggestion,
  actOnSuggestion
};
