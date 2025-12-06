import api from './httpClient';

export const consultationsApi = {
  // List consultations (role-filtered)
  list: () => api.get('/consultations'),

  // Get consultation by ID
  getById: (id) => api.get(`/consultations/${id}`),

  // Create consultation
  create: (data) => api.post('/consultations', data),

  // Update SOAP draft (doctor only)
  updateSoapDraft: (id, soap) => api.put(`/consultations/${id}/soap-draft`, { soap }),

  // Verify SOAP (doctor only)
  verifySoap: (id, soap) => api.put(`/consultations/${id}/verify`, { soap }),

  // Upload audio
  uploadAudio: (id, audioFile) => {
    const formData = new FormData();
    formData.append('audio', audioFile);
    return api.post(`/consultations/${id}/upload-audio`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Upload transcription (for transcription team)
  uploadTranscription: (id, transcript) => api.post(`/consultations/${id}/upload-transcription`, { transcript })
};

export default consultationsApi;
