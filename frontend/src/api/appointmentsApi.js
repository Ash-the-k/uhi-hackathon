import api from './httpClient';

export const appointmentsApi = {
  // Patient or Admin creates appointment
  create: (data) => api.post('/appointments', data),

  // Patient views their own appointments
  getMyAppointments: () => api.get('/appointments/mine'),

  // Doctor views their appointments
  getDoctorAppointments: () => api.get('/appointments/doctor'),

  // Admin views all appointments
  getAll: () => api.get('/appointments'),

  // Doctor starts a consultation
  startConsultation: (appointmentId) => 
    api.patch(`/appointments/${appointmentId}/start`),

  // Doctor updates status (completed, cancelled, etc.)
  updateStatus: (appointmentId, status) => 
    api.patch(`/appointments/${appointmentId}/status`, { status }),

  // Diagnostic endpoint
  diagnostic: () => api.get('/appointments/diagnostic/check')
};

export default appointmentsApi;
