// backend/src/modules/lhp/lhp.service.js

const mongoose = require('mongoose');
const LhpChronicCondition = require('../../db/models/LhpChronicCondition');
const LhpAllergy = require('../../db/models/LhpAllergy');
const LhpCurrentMedication = require('../../db/models/LhpCurrentMedication');
const LhpPastProcedure = require('../../db/models/LhpPastProcedure');
const LhpSuggestion = require('../../db/models/LhpSuggestion');

module.exports = {
  // 1) Read LHP for a patient, with role-based visibility
  async getLhp(patientId, viewer = {}) {
    const { role, patientId: viewerPatientId } = viewer || {};

    // Ensure patientId is converted to ObjectId
    let patientObjectId = patientId;
    if (mongoose.Types.ObjectId.isValid(patientId)) {
      patientObjectId = new mongoose.Types.ObjectId(patientId);
    }

    const baseFilter = { patientId: patientObjectId };

    let statusFilter = {};

    if (role === 'doctor') {
      // Doctors see only LHP entries that were verified by a doctor.
      statusFilter = { status: 'VERIFIED_DOCTOR' };
    } else if (role === 'patient') {
      // Controller already ensures patient can only access their own LHP.
      // Patients see full LHP, including UNVERIFIED/IGNORED.
      statusFilter = {};
    } else if (role === 'admin') {
      // Admin sees everything.
      statusFilter = {};
    } else {
      // Any other roles (staff, unknown) – safest default: only verified LHP.
      statusFilter = { status: 'VERIFIED_DOCTOR' };
    }

    const filter = { ...baseFilter, ...statusFilter };

    const [chronic, allergies, meds, procedures] = await Promise.all([
      LhpChronicCondition.find(filter).lean().exec(),
      LhpAllergy.find(filter).lean().exec(),
      LhpCurrentMedication.find(filter).lean().exec(),
      LhpPastProcedure.find(filter).lean().exec()
    ]);

    return {
      chronic,
      allergies,
      currentMedications: meds,
      pastProcedures: procedures
    };
  },

  

  // 2) Suggestions

  async createSuggestion(suggestion) {
    const doc = await LhpSuggestion.create(suggestion);
    return doc.toObject();
  },

  async listSuggestionsForDoctor(doctorId) {
    return LhpSuggestion
      .find({ doctorId, status: 'PENDING' })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  },

  async getSuggestionById(id) {
    return LhpSuggestion.findById(id).lean().exec();
  },

  async actOnSuggestion(suggestionId, action, actedByUserId) {
    const update = {
      status: action === 'accept' ? 'ACCEPTED' : 'REJECTED',
      actedByDoctorId: actedByUserId,
      actedAt: new Date()
    };
    await LhpSuggestion.findByIdAndUpdate(suggestionId, update).exec();
    return LhpSuggestion.findById(suggestionId).lean().exec();
  },

  // 3) Accept suggestion and create LHP entries

  async createChronicFromSuggestion(suggestion, actedByUserId) {
  const entry = suggestion.proposedEntry || {};
  const doc = await LhpChronicCondition.create({
    patientId: suggestion.patientId,
    label: entry.label,
    notes: entry.notes,
    // Doctor accepting = verification
    status: 'VERIFIED_DOCTOR',
    source: { type: suggestion.sourceType, eventId: suggestion.sourceEventId },
    createdByUserId: actedByUserId
  });
  return doc.toObject();
  },

  async createAllergyFromSuggestion(suggestion, actedByUserId) {
  const entry = suggestion.proposedEntry || {};
  const doc = await LhpAllergy.create({
    patientId: suggestion.patientId,
    substance: entry.substance,
    reaction: entry.reaction,
    severity: entry.severity,
    status: 'VERIFIED_DOCTOR',
    source: { type: suggestion.sourceType, eventId: suggestion.sourceEventId },
    createdByUserId: actedByUserId
  });
  return doc.toObject();
  },

  async createMedicationFromSuggestion(suggestion, actedByUserId) {
  const entry = suggestion.proposedEntry || {};
  const doc = await LhpCurrentMedication.create({
    patientId: suggestion.patientId,
    name: entry.name,
    dosage: entry.dosage,
    frequency: entry.frequency,
    route: entry.route,
    startDate: entry.startDate,
    endDate: entry.endDate,
    isCurrent: entry.isCurrent !== false,
    status: 'VERIFIED_DOCTOR',
    source: { type: suggestion.sourceType, eventId: suggestion.sourceEventId },
    createdByUserId: actedByUserId
  });
  return doc.toObject();
  },

  async createPastProcedureFromSuggestion(suggestion, actedByUserId) {
  const entry = suggestion.proposedEntry || {};
  const doc = await LhpPastProcedure.create({
    patientId: suggestion.patientId,
    procedure: entry.procedure,
    date: entry.date,
    notes: entry.notes,
    status: 'VERIFIED_DOCTOR',
    source: { type: suggestion.sourceType, eventId: suggestion.sourceEventId },
    createdByUserId: actedByUserId
  });
  return doc.toObject();
  },

  async acceptSuggestionAndCreateEntry(suggestionId, actedByUserId, editedEntry = null) {
    const suggestion = await LhpSuggestion.findById(suggestionId).lean().exec();
    if (!suggestion) throw new Error('Suggestion not found');

    // Use edited entry if provided, otherwise use original proposedEntry
    const entryToUse = editedEntry || suggestion.proposedEntry;
    
    // Create a modified suggestion object with the entry to use
    const modifiedSuggestion = {
      ...suggestion,
      proposedEntry: entryToUse
    };

    let created;
    switch (suggestion.section) {
      case 'CHRONIC_CONDITION':
        created = await this.createChronicFromSuggestion(modifiedSuggestion, actedByUserId);
        break;
      case 'ALLERGY':
        created = await this.createAllergyFromSuggestion(modifiedSuggestion, actedByUserId);
        break;
      case 'CURRENT_MED':
        created = await this.createMedicationFromSuggestion(modifiedSuggestion, actedByUserId);
        break;
      case 'PAST_PROCEDURE':
        created = await this.createPastProcedureFromSuggestion(modifiedSuggestion, actedByUserId);
        break;
      default:
        throw new Error('Unknown suggestion section');
    }

    await LhpSuggestion.findByIdAndUpdate(suggestionId, {
      status: 'ACCEPTED',
      actedByDoctorId: actedByUserId,
      actedAt: new Date()
    }).exec();

    return created;
  }
};
