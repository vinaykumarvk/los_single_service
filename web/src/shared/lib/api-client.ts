/**
 * Configurable API Client
 * Works with any LOS backend via configurable base URL
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosProgressEvent } from 'axios';
import { config } from './config';
import { authProvider } from './auth/providers';

export interface APIRequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean; // Skip adding auth header
  onUploadProgress?: (progress: AxiosProgressEvent) => void;
}

/**
 * Generic API Client that can connect to any LOS backend
 */
export class APIClient {
  private axiosInstance: AxiosInstance;
  private baseURL: string;

  constructor(baseURL?: string) {
    this.baseURL = baseURL || config.api.baseURL;
    
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: config.api.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...config.api.headers,
      },
    });

    // Add auth token and request logging interceptor
    this.axiosInstance.interceptors.request.use(
      async (axiosConfig) => {
        // Log request
        console.log('[API] Making request', { 
          url: axiosConfig.url, 
          method: axiosConfig.method,
          baseURL: axiosConfig.baseURL 
        });
        
        // Skip auth if explicitly requested
        if ((axiosConfig as APIRequestConfig).skipAuth) {
          return axiosConfig;
        }

        try {
          const token = await authProvider.getAccessToken();
          if (token) {
            axiosConfig.headers = axiosConfig.headers || {};
            axiosConfig.headers.Authorization = `Bearer ${token}`;
            console.log('[API] Auth token added to request', { 
              url: axiosConfig.url, 
              hasToken: !!token,
              tokenLength: token?.length 
            });
          } else {
            console.warn('[API] No auth token available', { url: axiosConfig.url });
          }
        } catch (error) {
          console.warn('[API] Failed to get auth token:', error);
        }

        return axiosConfig;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Log successful responses for debugging
        console.log('[API] Request successful', { 
          url: response.config.url, 
          method: response.config.method,
          status: response.status 
        });
        return response;
      },
      async (error) => {
        // Log errors with details
        const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
        const errorDetails = {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          statusText: error.response?.statusText,
          isTimeout,
          message: error.message,
          code: error.code,
        };
        
        if (isTimeout) {
          console.error('[API] Request timeout', errorDetails);
        } else {
          console.error('[API] Request failed', errorDetails);
        }
        
        // Handle 401 Unauthorized - try to refresh token
        if (error.response?.status === 401) {
          try {
            const refreshed = await authProvider.refreshToken();
            if (refreshed && error.config) {
              // Retry original request with new token
              error.config.headers = error.config.headers || {};
              error.config.headers.Authorization = `Bearer ${refreshed}`;
              return this.axiosInstance.request(error.config);
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            console.warn('Token refresh failed, redirecting to login');
            // Don't redirect here - let the app handle it
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async get<T = any>(url: string, config?: APIRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get<T>(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: APIRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post<T>(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: APIRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put<T>(url, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: APIRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.patch<T>(url, data, config);
  }

  async delete<T = any>(url: string, config?: APIRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete<T>(url, config);
  }

  // File upload helper
  async upload(url: string, file: File, onProgress?: (progress: number) => void): Promise<AxiosResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.axiosInstance.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  }

  // Get the base URL (useful for constructing absolute URLs)
  getBaseURL(): string {
    return this.baseURL;
  }
}

// Export singleton API client instance
export const apiClient = new APIClient();
