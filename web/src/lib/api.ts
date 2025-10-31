import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_GATEWAY 
  ? `${import.meta.env.VITE_API_GATEWAY}/api`
  : {
      application: import.meta.env.VITE_API_APPLICATION || 'http://localhost:3001/api',
      kyc: import.meta.env.VITE_API_KYC || 'http://localhost:3002/api',
      document: import.meta.env.VITE_API_DOCUMENT || 'http://localhost:3003/api',
      underwriting: import.meta.env.VITE_API_UNDERWRITING || 'http://localhost:3006/api',
      sanction: import.meta.env.VITE_API_SANCTION || 'http://localhost:3007/api',
      payments: import.meta.env.VITE_API_PAYMENTS || 'http://localhost:3008/api',
      disbursement: import.meta.env.VITE_API_DISBURSEMENT || 'http://localhost:3009/api',
    };

function getClient(base: string) {
  const client = axios.create({
    baseURL: base,
    headers: { 'Content-Type': 'application/json' },
  });

  // Add auth token if available
  client.interceptors.request.use(async (config) => {
    const { getUser } = await import('./auth');
    const user = await getUser();
    if (user?.access_token) {
      config.headers.Authorization = `Bearer ${user.access_token}`;
    }
    return config;
  });

  return client;
}

const api = typeof API_BASE === 'string'
  ? {
      application: getClient(`${API_BASE}/applications`),
      kyc: getClient(`${API_BASE}/applicants`),
      document: getClient(`${API_BASE}/applications`),
      underwriting: getClient(`${API_BASE}/applications`),
      sanction: getClient(`${API_BASE}/applications`),
      payments: getClient(`${API_BASE}/applications`),
      disbursement: getClient(`${API_BASE}/applications`),
    }
  : {
      application: getClient(`${API_BASE.application}/applications`),
      kyc: getClient(`${API_BASE.kyc}/applicants`),
      document: getClient(`${API_BASE.document}/applications`),
      underwriting: getClient(`${API_BASE.underwriting}/applications`),
      sanction: getClient(`${API_BASE.sanction}/applications`),
      payments: getClient(`${API_BASE.payments}/applications`),
      disbursement: getClient(`${API_BASE.disbursement}/applications`),
    };

export default api;

