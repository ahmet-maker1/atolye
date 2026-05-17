// API client - backend'le tüm iletişim burada
const API = '/api';

// ─── Auth state (in-memory + localStorage) ──────────────────────
const TOKEN_KEY = 'atolye_token';
const USER_KEY = 'atolye_user';

export const auth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  getUser:  () => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
  },
  set: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  // Backwards compat — old code calls auth.get()
  get: () => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
  },
};

// ─── Core request helper ────────────────────────────────────────
async function request(path, options = {}) {
  const opts = { ...options };
  const headers = { ...(opts.headers || {}) };

  if (opts.body && !(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const token = auth.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  opts.headers = headers;

  const res = await fetch(API + path, opts);

  // 401 → token expired/invalid → boot to login (skip on /login itself)
  if (res.status === 401 && !path.startsWith('/users/login')) {
    auth.clear();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Oturum süresi doldu');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Bilinmeyen hata' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Dashboard
  dashboard: () => request('/dashboard'),

  // Devices
  devicesList:   (params = {}) => request('/devices?' + new URLSearchParams(params)),
  device:        (id) => request(`/devices/${id}`),
  deviceByQR:    (token) => request(`/devices/qr/${token}`),
  deviceCreate:  (data) => request('/devices', { method: 'POST', body: JSON.stringify(data) }),
  deviceUpdate:  (id, data) => request(`/devices/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deviceDelete:  (id) => request(`/devices/${id}`, { method: 'DELETE' }),
  deviceRestore: (id) => request(`/devices/${id}/restore`, { method: 'POST' }),

  // Photos
  uploadPhotos: async (deviceId, files) => {
    const fd = new FormData();
    for (const f of files) fd.append('photos', f);
    const headers = {};
    const token = auth.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API}/devices/${deviceId}/photos`, {
      method: 'POST', body: fd, headers,
    });
    if (res.status === 401) {
      auth.clear();
      window.location.href = '/login';
      throw new Error('Oturum süresi doldu');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Yükleme hatası' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },
  deletePhoto: (deviceId, idx) => request(`/devices/${deviceId}/photos/${idx}`, { method: 'DELETE' }),

  // Customers

  // Transactions
  txCreate: (data) => request('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  txDelete: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),

  // Services
  servicesList:  (params = {}) => request('/services?' + new URLSearchParams(params)),
  serviceCreate: (data) => request('/services', { method: 'POST', body: JSON.stringify(data) }),
  serviceUpdate: (id, data) => request(`/services/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Cash
  cashList:    (params = {}) => request('/cash?' + new URLSearchParams(params)),
  cashSummary: () => request('/cash/summary'),
  cashCreate:  (data) => request('/cash', { method: 'POST', body: JSON.stringify(data) }),

  // Users
  usersList:  () => request('/users'),
  me:         () => request('/users/me'),
  login: async (email, password) => {
    const r = await request('/users/login', {
      method: 'POST', body: JSON.stringify({ email, password })
    });
    auth.set(r.token, r.user);
    return r;
  },
  logout: () => auth.clear(),
  userCreate: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  userUpdate: (id, data) => request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Backup
  backupInfo: () => request('/backup/info'),
  // Browser navigation (download). Token query param ile auth — sadece Admin'e izinli.
  backupDownload: () => {
    const token = auth.getToken();
    if (!token) throw new Error('Giriş gerekli');
    window.location.href = `${API}/backup?token=${encodeURIComponent(token)}`;
  },

  // ─── Audit log ────────────────────────────────────────────────
  auditList:  (params = {}) => request('/audit?' + new URLSearchParams(params)),
  auditStats: ()            => request('/audit/stats'),
};

// Currency formatting
export const fmt = (n) => new Intl.NumberFormat('tr-TR').format(Math.round(n || 0));
export const tl = (n) => '₺' + fmt(n);
export const tlSigned = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + '₺' + fmt(Math.abs(n || 0));

export const fmtBytes = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};
