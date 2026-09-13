import api from './client';

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
  logout: () => api.post('/auth/logout'),
};

export const userApi = {
  getUsers: (params) => api.get('/users', { params }),
  getRoles: () => api.get('/users/roles'),
  getOnlineUsers: () => api.get('/users/online'),
  getUser: (id) => api.get(`/users/${id}`),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
  updateProfile: (data) => api.put('/users/profile', data),
  uploadAvatar: (formData) => api.post('/users/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  removeAvatar: () => api.delete('/users/avatar'),
};

export const leadApi = {
  getLeads: (params) => api.get('/leads', { params }),
  getLead: (id) => api.get(`/leads/${id}`),
  createLead: (data) => api.post('/leads', data),
  updateLead: (id, data) => api.put(`/leads/${id}`, data),
  deleteLead: (id) => api.delete(`/leads/${id}`),
  assignLead: (id, assigned_user_id) => api.post(`/leads/${id}/assign`, { assigned_user_id }),
  updateStatus: (id, status) => api.patch(`/leads/${id}/status`, { status }),
  getTimeline: (id) => api.get(`/leads/${id}/timeline`),
};

export const customerApi = {
  getCustomers: (params) => api.get('/customers', { params }),
  getCustomer: (id) => api.get(`/customers/${id}`),
  createCustomer: (data) => api.post('/customers', data),
  updateCustomer: (id, data) => api.put(`/customers/${id}`, data),
  deleteCustomer: (id) => api.delete(`/customers/${id}`),
};

export const companyApi = {
  getCompanies: (params) => api.get('/companies', { params }),
  getCompany: (id) => api.get(`/companies/${id}`),
  createCompany: (data) => api.post('/companies', data),
  updateCompany: (id, data) => api.put(`/companies/${id}`, data),
  deleteCompany: (id) => api.delete(`/companies/${id}`),
};

export const contactApi = {
  getContacts: (params) => api.get('/contacts', { params }),
  getContact: (id) => api.get(`/contacts/${id}`),
  createContact: (data) => api.post('/contacts', data),
  updateContact: (id, data) => api.put(`/contacts/${id}`, data),
  deleteContact: (id) => api.delete(`/contacts/${id}`),
};

export const dealApi = {
  getDeals: (params) => api.get('/deals', { params }),
  getDeal: (id) => api.get(`/deals/${id}`),
  createDeal: (data) => api.post('/deals', data),
  updateDeal: (id, data) => api.put(`/deals/${id}`, data),
  updateStage: (id, stage) => api.patch(`/deals/${id}/stage`, { stage }),
  deleteDeal: (id) => api.delete(`/deals/${id}`),
};

export const activityApi = {
  getActivities: (params) => api.get('/activities', { params }),
  getActivity: (id) => api.get(`/activities/${id}`),
  createActivity: (data) => api.post('/activities', data),
  updateActivity: (id, data) => api.put(`/activities/${id}`, data),
  deleteActivity: (id) => api.delete(`/activities/${id}`),
};

export const taskApi = {
  getTasks: (params) => api.get('/tasks', { params }),
  getTask: (id) => api.get(`/tasks/${id}`),
  createTask: (data) => api.post('/tasks', data),
  updateTask: (id, data) => api.put(`/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
};

export const followupApi = {
  getFollowups: (params) => api.get('/followups', { params }),
  getFollowup: (id) => api.get(`/followups/${id}`),
  createFollowup: (data) => api.post('/followups', data),
  updateFollowup: (id, data) => api.put(`/followups/${id}`, data),
  deleteFollowup: (id) => api.delete(`/followups/${id}`),
};

export const productApi = {
  getProducts: (params) => api.get('/products', { params }),
  getProduct: (id) => api.get(`/products/${id}`),
  createProduct: (data) => api.post('/products', data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/products/${id}`),
};

export const reportApi = {
  getDashboard: () => api.get('/reports/dashboard'),
  getLeadReport: (params) => api.get('/reports/leads', { params }),
  getSalesReport: (params) => api.get('/reports/sales', { params }),
  getSalespersonReport: (params) => api.get('/reports/salesperson', { params }),
  getCustomerReport: (params) => api.get('/reports/customers', { params }),
  exportExcelUrl: (type, dateRange, from, to) => {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api';
    const params = new URLSearchParams({ type, date_range: dateRange });
    if (from) params.append('custom_from', from);
    if (to) params.append('custom_to', to);
    return `${base}/reports/export/excel?${params.toString()}`;
  }
};

export const notificationApi = {
  getNotifications: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/mark-all-read'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
};

export const searchApi = {
  globalSearch: (q) => api.get('/search', { params: { q } }),
};

export const auditApi = {
  getAuditLogs: (params) => api.get('/audit-logs', { params }),
  getNotes: (entity_type, entity_id) => api.get('/notes', { params: { entity_type, entity_id } }),
  addNote: (data) => api.post('/notes', data),
  deleteNote: (id) => api.delete(`/notes/${id}`),
};

export const settingsApi = {
  getCompanySettings: () => api.get('/settings/company'),
  updateCompanySettings: (data) => api.put('/settings/company', data),
  uploadCompanyLogo: (formData) => api.post('/settings/company/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  removeCompanyLogo: () => api.delete('/settings/company/logo'),
  getUserPreferences: () => api.get('/settings/preferences'),
  updateUserPreferences: (data) => api.put('/settings/preferences', data),
};

