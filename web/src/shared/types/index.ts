/**
 * Shared Types
 * Common types used across all personas
 */

export interface Application {
  application_id: string;
  applicant_id: string;
  channel: string;
  product_code: string;
  requested_amount: number;
  requested_tenure_months: number;
  status: string;
  assigned_to?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Applicant {
  applicant_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender?: string;
  marital_status?: string;
  mobile: string;
  email?: string;
  pan?: string;
  aadhaar?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  employment_type?: string;
  monthly_income?: number;
  employer_name?: string;
}

export interface Document {
  document_id: string;
  application_id: string;
  document_code: string;
  document_name: string;
  file_url?: string;
  verification_status?: string;
  uploaded_at?: string;
}

export interface APIError {
  error: string;
  message?: string;
  details?: any;
}

