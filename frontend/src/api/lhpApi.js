import api from './httpClient';

export const lhpApi = {
  // Get full LHP for a patient
  getLhp: (patientId) => api.get(`/lhp/${patientId}`),

  // List suggestions for current doctor
  listSuggestions: () => api.get('/lhp/suggestions/list'),

  // Create suggestion (AI/backend/manual)
  createSuggestion: (data) => api.post('/lhp/suggestions', data),

  // Doctor acts on suggestion (accept / reject)
  actOnSuggestion: (id, action, editedEntry = null) => {
    const body = { action };
    if (editedEntry) {
      body.editedEntry = editedEntry;
    }
    return api.post(`/lhp/suggestions/${id}/action`, body);
  }
};

export default lhpApi;

