import { create } from 'zustand';
import { authApi, usersApi } from '../api';
import { configureAxiosAuth } from '../api/axiosClient';

const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  // idle -> loading -> authenticated | unauthenticated
  status: 'idle',
  error: null,

  async initialize() {
    if (get().status !== 'idle') return;
    set({ status: 'loading' });
    try {
      const { user, accessToken } = await authApi.refresh();
      set({ user, accessToken, status: 'authenticated', error: null });
    } catch {
      set({ user: null, accessToken: null, status: 'unauthenticated' });
    }
  },

  async signup(data) {
    set({ error: null });
    return authApi.signup(data);
  },

  async login(data) {
    set({ error: null });
    const { user, accessToken } = await authApi.login(data);
    set({ user, accessToken, status: 'authenticated' });
    return user;
  },

  async logout() {
    try {
      await authApi.logout();
    } finally {
      set({ user: null, accessToken: null, status: 'unauthenticated' });
    }
  },

  async refreshProfile() {
    const { user } = await usersApi.getMe();
    set({ user });
    return user;
  },

  setUser(user) {
    set({ user });
  },
}));

// Wire this store into the axios client so 401s trigger a token refresh
// (or a full logout if the refresh itself fails, e.g. the session expired).
configureAxiosAuth({
  getAccessToken: () => useAuthStore.getState().accessToken,
  onUnauthorized: {
    onRefreshed: ({ user, accessToken }) => useAuthStore.setState({ user, accessToken, status: 'authenticated' }),
    onFailed: () => useAuthStore.setState({ user: null, accessToken: null, status: 'unauthenticated' }),
  },
});

export default useAuthStore;
