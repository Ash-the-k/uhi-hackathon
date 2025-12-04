import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
});

// attach token on every request
api.interceptors.request.use((cfg) => {
  try {
    const s = localStorage.getItem('auth');
    const token = s ? JSON.parse(s).token : null;
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
  } catch {}
  return cfg;
}, (err) => Promise.reject(err));

// global response handler: if backend returns 401, clear auth and redirect to /login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      try {
        // remove auth and broadcast to other tabs
        localStorage.removeItem('auth');
        // optional: save a logout flag so other tabs can detect
        localStorage.setItem('auth-logout', Date.now().toString());
      } catch {}
      // redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
