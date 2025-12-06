import api from './httpClient';

export const patientsApi = {
  // Get patient by ID
  getById: (id) => api.get(`/patients/${id}`),

  // List patients (admin only typically)
  list: () => api.get('/patients')
};

export default patientsApi;
