import api from './httpClient';

export const usersApi = {
  // Get user by ID
  getById: (id) => api.get(`/users/${id}`),

  // List users (admin only)
  list: () => api.get('/users')
};

export default usersApi;
