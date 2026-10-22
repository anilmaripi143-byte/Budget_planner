/**
 * FastAPI Backend Client & Resilient Local Storage Adapter for Smart Budget India
 */

const API_BASE_URL = 'http://localhost:8000/api/v1';

// Token Management
export function getAuthToken() {
  return localStorage.getItem('sb_access_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('sb_access_token', token);
  } else {
    localStorage.removeItem('sb_access_token');
  }
}

// Helper fetch with fallback
async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `HTTP Error ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn(`[API] Failed to reach ${endpoint}, using fallback. Reason:`, err.message);
    throw err;
  }
}

// 1. Auth APIs
export async function registerUser(email, password, fullName) {
  const data = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, full_name: fullName })
  });
  if (data?.access_token) {
    setAuthToken(data.access_token);
  }
  return data;
}

export async function loginUser(email, password) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  if (data?.access_token) {
    setAuthToken(data.access_token);
  }
  return data;
}

// 2. Daily Budget Engine API
export async function fetchDailyBudget(targetDate = null) {
  const query = targetDate ? `?target_date=${targetDate}` : '';
  return await apiRequest(`/budget/daily${query}`);
}

export async function seedMasterDemo() {
  return await apiRequest('/budget/demo-seed', {
    method: 'POST'
  });
}

// 3. Transactions CRUD
export async function fetchTransactions(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.category && filters.category !== 'All') params.append('category', filters.category);
  if (filters.type && filters.type !== 'All') params.append('type', filters.type);
  if (filters.direction && filters.direction !== 'All') params.append('direction', filters.direction);
  
  const query = params.toString() ? `?${params.toString()}` : '';
  return await apiRequest(`/transactions${query}`);
}

export async function createTransaction(tx) {
  return await apiRequest('/transactions', {
    method: 'POST',
    body: JSON.stringify(tx)
  });
}

export async function deleteTransaction(txId) {
  return await apiRequest(`/transactions/${txId}`, {
    method: 'DELETE'
  });
}

// 4. CSV Statement Import
export async function previewCsvImport(csvRawText) {
  const formData = new FormData();
  formData.append('csv_raw_text', csvRawText);

  const token = getAuthToken();
  const res = await fetch(`${API_BASE_URL}/transactions/import-csv/preview`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to preview CSV statement');
  }
  return await res.json();
}

export async function confirmCsvImport(items) {
  return await apiRequest('/transactions/import-csv/confirm', {
    method: 'POST',
    body: JSON.stringify({ items })
  });
}

// 5. Account Aggregator APIs
export async function fetchAaInfo() {
  return await apiRequest('/account-aggregator/info');
}

export async function requestAaConsent(payload) {
  return await apiRequest('/account-aggregator/consent-request', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function listAaConsents() {
  return await apiRequest('/account-aggregator/consents');
}

export async function revokeAaConsent(consentId) {
  return await apiRequest(`/account-aggregator/consents/${consentId}/revoke`, {
    method: 'POST'
  });
}

// 6. Analytics API
export async function fetchAnalytics() {
  return await apiRequest('/analytics/overview');
}
