/**
 * RM-specific API client
 * Provides RM-related API methods
 */

import { apiClient } from '../../shared/lib/api-client';

/**
 * RM API methods
 * These endpoints should be available in any LOS backend (ours or third-party)
 */
export const rmAPI = {
  // Applications
  applications: {
    list: (params?: {
      status?: string[];
      assignedTo?: string;
      page?: number;
      limit?: number;
      search?: string;
    }) =>
      apiClient.get('/api/applications', { params }),

    get: (id: string) =>
      apiClient.get(`/api/applications/${id}`),

    create: (data: {
      productCode: string;
      requestedAmount: number;
      requestedTenureMonths: number;
      channel?: string;
    }) =>
      apiClient.post('/api/applications', data),

    update: (id: string, data: Partial<{
      productCode: string;
      requestedAmount: number;
      requestedTenureMonths: number;
      channel: string;
    }>) =>
      apiClient.put(`/api/applications/${id}`, data),

    submit: (id: string) =>
      apiClient.post(`/api/applications/${id}/submit`),

    submitForVerification: (id: string) =>
      apiClient.post(`/api/applications/${id}/submit-for-verification`),

    getCompleteness: (id: string) =>
      apiClient.get(`/api/applications/${id}/completeness`),

    getTimeline: (id: string) =>
      apiClient.get(`/api/applications/${id}/timeline`),

    assign: (id: string, userId: string) =>
      apiClient.patch(`/api/applications/${id}/assign`, { assignedTo: userId }),

    getDashboard: () =>
      apiClient.get('/api/applications/rm/dashboard'),
  },

  // Applicants
  applicants: {
    update: (applicationId: string, data: {
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      gender?: string;
      maritalStatus?: string;
      mobile: string;
      email?: string;
      pan?: string;
      addressLine1?: string;
      city?: string;
      state?: string;
      pincode?: string;
      employmentType?: string;
      monthlyIncome?: number;
      employerName?: string;
      otherIncomeSources?: string;
      yearsInJob?: number;
      bankAccountNumber?: string;
      bankIfsc?: string;
      accountHolderName?: string;
      bankName?: string;
      bankVerified?: boolean;
      bankVerifiedAt?: string;
      bankVerificationMethod?: string;
    }) =>
      apiClient.put(`/api/applications/${applicationId}/applicant`, data),

    get: (applicationId: string) =>
      apiClient.get(`/api/applications/${applicationId}/applicant`),
  },

  // Property Details
  property: {
    createOrUpdate: (applicationId: string, data: {
      propertyType: string;
      builderName?: string;
      projectName?: string;
      propertyValue?: number;
      propertyAddress?: string;
      propertyPincode?: string;
      propertyCity?: string;
      propertyState?: string;
    }) =>
      apiClient.post(`/api/applications/${applicationId}/property`, data),

    get: (applicationId: string) =>
      apiClient.get(`/api/applications/${applicationId}/property`),
  },

  // Documents
  documents: {
    list: (applicationId: string) =>
      apiClient.get(`/api/applications/${applicationId}/documents`),

    upload: (applicationId: string, file: File, documentCode: string, onProgress?: (progress: number) => void) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentCode', documentCode);
      
      return apiClient.post(`/api/applications/${applicationId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });
    },

    delete: (documentId: string) =>
      apiClient.delete(`/api/documents/${documentId}`),

    getChecklist: (applicationId: string) =>
      apiClient.get(`/api/applications/${applicationId}/documents/checklist`),
  },

  // Integrations
  integrations: {
    pan: {
      validate: (pan: string, applicantName?: string) =>
        apiClient.post('/api/integrations/pan/validate', { pan, applicantName }),
    },

    aadhaar: {
      start: (applicationId: string, applicantId: string, aadhaar: string, mobile: string, consent: boolean) =>
        apiClient.post('/api/integrations/ekyc/start', {
          applicationId,
          applicantId,
          aadhaar,
          mobile,
          consent,
          purpose: 'KYC',
        }),

      submitOTP: (sessionId: string, otp: string) =>
        apiClient.post('/api/integrations/ekyc/submit-otp', {
          sessionId,
          otp,
        }),

      getStatus: (sessionId: string) =>
        apiClient.get(`/api/integrations/ekyc/${sessionId}/status`),
    },

    bank: {
      verify: (accountNumber: string, ifsc: string, accountHolderName: string) =>
        apiClient.post('/api/integrations/bank/verify', {
          accountNumber,
          ifsc,
          accountHolderName,
        }),

      verifyName: (accountNumber: string, ifsc: string, accountHolderName: string) =>
        apiClient.post('/api/integrations/bank/verify-name', {
          accountNumber,
          ifsc,
          accountHolderName,
        }),

      pennyDrop: (accountNumber: string, ifsc: string, amount?: number) =>
        apiClient.post('/api/integrations/bank/penny-drop', {
          accountNumber,
          ifsc,
          amount: amount || 1,
        }),

      getPennyDropStatus: (requestId: string) =>
        apiClient.get(`/api/integrations/bank/penny-drop/${requestId}/status`),
    },

    cibil: {
      pull: (pan: string, dateOfBirth: string, mobile: string) =>
        apiClient.post('/api/integrations/bureau/pull', {
          pan,
          dateOfBirth,
          mobile,
        }),

      getReport: (requestId: string) =>
        apiClient.get(`/api/integrations/bureau/${requestId}/report`),
    },
  },

  // Masters
  masters: {
    branches: () =>
      apiClient.get('/api/masters/branches'),

    getLoanTypes: () =>
      apiClient.get('/api/masters/products'),

    getDocumentTypes: () =>
      apiClient.get('/api/masters/documents'),

    getRoles: () =>
      apiClient.get('/api/masters/roles'),

    getCitiesStates: () =>
      apiClient.get('/api/masters/cities-states'),
  },
};

export default rmAPI;

