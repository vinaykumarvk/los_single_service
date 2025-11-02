/**
 * API Hook
 * Provides access to the API client
 */

import { useMemo } from 'react';
import { apiClient, APIClient } from '../lib/api-client';

export function useAPI(): APIClient {
  return useMemo(() => apiClient, []);
}

