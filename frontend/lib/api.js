const API_BASE = '/api';

export async function apiCall(endpoint, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'API Error');
  }

  return data;
}

export const auth = {
  login: (email, password) =>
    apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email, password, name, role) =>
    apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, role }),
    }),

  me: () => apiCall('/auth/me'),
};

export const data = {
  uploadCSV: async (file) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/upload/csv`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Upload failed');
    }

    return response.json();
  },

  getSample: () => apiCall('/data/sample'),
  getStats: () => apiCall('/data/stats'),
};

export const analysis = {
  outlierAnalysis: (params = {}) =>
    apiCall('/analysis/outlier', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  trainDrift: () => apiCall('/analysis/drift-train', { method: 'POST' }),

  predictDrift: (params) =>
    apiCall('/analysis/drift-predict', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  batchDrift: () => apiCall('/analysis/drift-batch', { method: 'POST' }),

  getDashboard: () => apiCall('/analysis/dashboard'),

  getExplanation: (componentId) =>
    apiCall(`/analysis/explain/${componentId}`),

  comprehensiveAnalysis: (params = {}) =>
    apiCall('/analysis/comprehensive', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
};
