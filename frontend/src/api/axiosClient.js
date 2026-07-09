import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const axiosClient = axios.create({
  baseURL: API_URL,
  // Needed so the httpOnly refresh-token cookie is sent to /api/auth/refresh
  // and /api/auth/logout.
  withCredentials: true,
});

// Set lazily from main.jsx/App.jsx after the auth store exists, avoiding a
// hard circular import between this module and the store (the store also
// needs to call the auth API for login/refresh/logout).
let getAccessToken = () => null;
let onUnauthorized = () => {};

export function configureAxiosAuth({ getAccessToken: getter, onUnauthorized: handler }) {
  getAccessToken = getter;
  onUnauthorized = handler;
}

axiosClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    const isAuthEndpoint = config?.url?.includes('/auth/login') || config?.url?.includes('/auth/refresh');

    if (response?.status === 401 && !config._retried && !isAuthEndpoint) {
      config._retried = true;
      try {
        // Multiple requests can 401 at once (e.g. several widgets loading in
        // parallel) - share a single in-flight refresh instead of racing.
        if (!refreshPromise) {
          refreshPromise = axiosClient.post('/auth/refresh').finally(() => {
            refreshPromise = null;
          });
        }
        const { data } = await refreshPromise;
        onUnauthorized.onRefreshed?.(data);
        config.headers.Authorization = `Bearer ${data.accessToken}`;
        return axiosClient(config);
      } catch (refreshError) {
        onUnauthorized.onFailed?.();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
