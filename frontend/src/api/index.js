import axiosClient from './axiosClient';

export const authApi = {
  signup: (data) => axiosClient.post('/auth/signup', data).then((r) => r.data),
  verifyEmail: (token) => axiosClient.post('/auth/verify-email', { token }).then((r) => r.data),
  resendVerification: (email) => axiosClient.post('/auth/resend-verification', { email }).then((r) => r.data),
  login: (data) => axiosClient.post('/auth/login', data).then((r) => r.data),
  refresh: () => axiosClient.post('/auth/refresh').then((r) => r.data),
  logout: () => axiosClient.post('/auth/logout').then((r) => r.data),
  forgotPassword: (email) => axiosClient.post('/auth/forgot-password', { email }).then((r) => r.data),
  resetPassword: (token, newPassword) =>
    axiosClient.post('/auth/reset-password', { token, newPassword }).then((r) => r.data),
};

export const usersApi = {
  getMe: () => axiosClient.get('/users/me').then((r) => r.data),
  updateProfile: (data) => axiosClient.patch('/users/me', data).then((r) => r.data),
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append('avatar', file);
    return axiosClient.post('/users/me/avatar', form).then((r) => r.data);
  },
  changePassword: (currentPassword, newPassword) =>
    axiosClient.patch('/users/me/password', { currentPassword, newPassword }).then((r) => r.data),
  getActivityLog: (cursor) =>
    axiosClient.get('/users/me/activity-log', { params: { cursor } }).then((r) => r.data),
  search: (q) => axiosClient.get('/users/search', { params: { q } }).then((r) => r.data),
  getProfile: (id) => axiosClient.get(`/users/${id}`).then((r) => r.data),
  block: (id) => axiosClient.post(`/users/${id}/block`).then((r) => r.data),
  unblock: (id) => axiosClient.delete(`/users/${id}/block`).then((r) => r.data),
  listBlocked: () => axiosClient.get('/users/blocked').then((r) => r.data),
};

export const friendsApi = {
  sendRequest: (receiverId) => axiosClient.post('/friends/requests', { receiverId }).then((r) => r.data),
  listRequests: (type) => axiosClient.get('/friends/requests', { params: { type } }).then((r) => r.data),
  accept: (id) => axiosClient.post(`/friends/requests/${id}/accept`).then((r) => r.data),
  reject: (id) => axiosClient.post(`/friends/requests/${id}/reject`).then((r) => r.data),
  cancel: (id) => axiosClient.delete(`/friends/requests/${id}`).then((r) => r.data),
  list: () => axiosClient.get('/friends').then((r) => r.data),
  remove: (userId) => axiosClient.delete(`/friends/${userId}`).then((r) => r.data),
};

export const conversationsApi = {
  list: (type = 'all') => axiosClient.get('/conversations', { params: { type } }).then((r) => r.data),
  createDirect: (friendId) => axiosClient.post('/conversations/direct', { friendId }).then((r) => r.data),
  get: (id) => axiosClient.get(`/conversations/${id}`).then((r) => r.data),
  getMessages: (id, cursor) =>
    axiosClient.get(`/conversations/${id}/messages`, { params: { cursor } }).then((r) => r.data),
  sendMessage: (id, content) =>
    axiosClient.post(`/conversations/${id}/messages`, { content }).then((r) => r.data),
  markRead: (id) => axiosClient.post(`/conversations/${id}/read`).then((r) => r.data),
  remove: (id) => axiosClient.delete(`/conversations/${id}`).then((r) => r.data),
};

export const messagesApi = {
  edit: (id, content) => axiosClient.patch(`/messages/${id}`, { content }).then((r) => r.data),
  delete: (id) => axiosClient.delete(`/messages/${id}`).then((r) => r.data),
};

export const groupsApi = {
  create: (data) => axiosClient.post('/groups', data).then((r) => r.data),
  get: (id) => axiosClient.get(`/groups/${id}`).then((r) => r.data),
  update: (id, data) => axiosClient.patch(`/groups/${id}`, data).then((r) => r.data),
  uploadAvatar: (id, file) => {
    const form = new FormData();
    form.append('avatar', file);
    return axiosClient.post(`/groups/${id}/avatar`, form).then((r) => r.data);
  },
  delete: (id) => axiosClient.delete(`/groups/${id}`).then((r) => r.data),
  listMembers: (id) => axiosClient.get(`/groups/${id}/members`).then((r) => r.data),
  addMember: (id, userId) => axiosClient.post(`/groups/${id}/members`, { userId }).then((r) => r.data),
  removeMember: (id, userId) => axiosClient.delete(`/groups/${id}/members/${userId}`).then((r) => r.data),
  banMember: (id, userId) => axiosClient.post(`/groups/${id}/members/${userId}/ban`).then((r) => r.data),
  unbanMember: (id, userId) => axiosClient.delete(`/groups/${id}/members/${userId}/ban`).then((r) => r.data),
  changeRole: (id, userId, role) =>
    axiosClient.patch(`/groups/${id}/members/${userId}/role`, { role }).then((r) => r.data),
  getActivityLog: (id, cursor) =>
    axiosClient.get(`/groups/${id}/activity-log`, { params: { cursor } }).then((r) => r.data),
};

export const notificationsApi = {
  list: (unreadOnly) => axiosClient.get('/notifications', { params: { unreadOnly } }).then((r) => r.data),
  markRead: (id) => axiosClient.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => axiosClient.patch('/notifications/read-all').then((r) => r.data),
};

function triggerBlobDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export const backupApi = {
  exportAll: async () => {
    const response = await axiosClient.get('/backup/export', { responseType: 'blob' });
    triggerBlobDownload(response.data, `skychat-backup-${Date.now()}.json`);
  },
  exportConversation: async (conversationId) => {
    const response = await axiosClient.get(`/backup/export/${conversationId}`, { responseType: 'blob' });
    triggerBlobDownload(response.data, `skychat-conversation-${conversationId}.json`);
  },
};
