const fs = require('fs');
const path = require('path');

function read(template) {
  try {
    const p = path.join(__dirname, 'templates', template);
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return null;
  }
}

async function transcribeAudio(audioPath) {
  // return sample transcript text
  const obj = read('mock_transcript.json');
  return obj?.text || 'Patient complains of cough and fever for 3 days.';
}

async function generateSOAP(transcript) {
  const obj = read('mock_soap.json');
  return obj;
}

async function extractMeds(imagePath) {
  const obj = read('mock_meds.json');
  return obj.medications || [];
}

async function generateLhpSuggestionsFromConsultation(consultation) {
  // Simulate processing time (2 seconds)
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const obj = read('mock_lhp_suggestions.json');
  // Handle both formats: array or object with suggestions key
  let suggestions = [];
  if (Array.isArray(obj)) {
    suggestions = obj;
  } else if (obj && obj.suggestions) {
    suggestions = obj.suggestions;
  }
  
  // Map suggestions to use the actual consultation's patientId, doctorId, and consultationId
  // Also ensure section names match the enum (CURRENT_MED vs CURRENT_MEDICATION)
  return suggestions.map(s => {
    let section = s.section;
    // Normalize section names
    if (section === 'CURRENT_MEDICATION') section = 'CURRENT_MED';
    
    return {
      section: section,
      proposedEntry: s.proposedEntry || s,
      // Use consultation's actual IDs
      patientId: consultation.patientId,
      doctorId: consultation.doctorId,
      sourceEventId: consultation._id || consultation.id
    };
  });
}

module.exports = {
  transcribeAudio,
  generateSOAP,
  extractMeds,
  generateLhpSuggestionsFromConsultation,
  generateLhpSuggestionsFromPrescription: generateLhpSuggestionsFromConsultation
};
