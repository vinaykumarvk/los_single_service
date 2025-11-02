import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_GATEWAY 
  ? {
      // When using gateway, routes are: /application, /kyc, /document, etc.
      application: `${import.meta.env.VITE_API_GATEWAY}/application/api`,
      kyc: `${import.meta.env.VITE_API_GATEWAY}/kyc/api`,
      document: `${import.meta.env.VITE_API_GATEWAY}/document/api`,
      underwriting: `${import.meta.env.VITE_API_GATEWAY}/underwriting/api`,
      sanction: `${import.meta.env.VITE_API_GATEWAY}/sanction/api`,
      payments: `${import.meta.env.VITE_API_GATEWAY}/payments/api`,
      disbursement: `${import.meta.env.VITE_API_GATEWAY}/disbursement/api`,
      reporting: `${import.meta.env.VITE_API_GATEWAY}/reporting/api`,
    }
  : {
      application: import.meta.env.VITE_API_APPLICATION || 'http://localhost:3001/api',
      kyc: import.meta.env.VITE_API_KYC || 'http://localhost:3002/api',
      document: import.meta.env.VITE_API_DOCUMENT || 'http://localhost:3003/api',
      underwriting: import.meta.env.VITE_API_UNDERWRITING || 'http://localhost:3006/api',
      sanction: import.meta.env.VITE_API_SANCTION || 'http://localhost:3007/api',
      payments: import.meta.env.VITE_API_PAYMENTS || 'http://localhost:3008/api',
      disbursement: import.meta.env.VITE_API_DISBURSEMENT || 'http://localhost:3009/api',
      reporting: import.meta.env.VITE_API_REPORTING || 'http://localhost:3015/api',
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

const api = {
  application: getClient(`${API_BASE.application}/applications`),
  kyc: getClient(`${API_BASE.kyc}/applicants`),
  document: getClient(`${API_BASE.document}/applications`),
  underwriting: getClient(`${API_BASE.underwriting}/applications`),
  sanction: getClient(`${API_BASE.sanction}/applications`),
  payments: getClient(`${API_BASE.payments}/applications`),
  disbursement: getClient(`${API_BASE.disbursement}/applications`),
  reporting: getClient(`${API_BASE.reporting}/reporting`),
};

export default api;

