const API_BASE = localStorage.getItem('API_BASE') || 'http://localhost:4000/api';

function getToken() {
  return localStorage.getItem('token');
}

async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request gagal (${res.status})`);
  }
  return data;
}

const api = {
  // Auth
  register: (body) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => apiFetch('/user/me'),

  // Apps
  listApps: () => apiFetch('/apps'),
  getApp: (slug) => apiFetch(`/apps/${slug}`),
  checkAccess: (slug) => apiFetch(`/apps/${slug}/access`),
  myApps: () => apiFetch('/user/apps'),

  // Payment
  createPayment: (applicationId) => apiFetch('/payment/create', {
    method: 'POST',
    body: JSON.stringify({ applicationId }),
  }),
  myTransactions: () => apiFetch('/payment/transactions'),
};