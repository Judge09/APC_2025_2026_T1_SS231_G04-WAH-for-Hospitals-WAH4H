import axios from 'axios';

const api = axios.create({
  baseURL:
    import.meta.env.STURDY_ADVENTURE_BASE_8000 ||
    import.meta.env.LOCAL_8000 ||
    import.meta.env.STURDY_ADVENTURE_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add auth token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 error and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          // Ideally use a separate axios instance to avoid infinite loops, but using raw axios here
          const baseURL = api.defaults.baseURL;
          const response = await axios.post(`${baseURL}/api/accounts/token/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          localStorage.setItem('accessToken', access);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Token refresh failed - clear storage so user is redirected to login
          console.error('Token refresh failed:', refreshError);
          // Optional: Dispatch a custom event or let the app handle the auth failure
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('currentUser');
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
