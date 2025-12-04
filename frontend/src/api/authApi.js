import api from './httpClient';

export const loginApi = (payload) => api.post('/auth/login', payload).then(res => res.data);
