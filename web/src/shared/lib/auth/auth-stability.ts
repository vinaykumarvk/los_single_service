/**
 * Authentication Stability Module
 * 
 * This module provides a single source of truth for authentication state
 * to prevent regressions. All authentication checks should go through
 * this module rather than directly accessing localStorage or tokens.
 * 
 * CRITICAL: Do not modify this file without thorough testing.
 */

import { authProvider } from './providers';

export interface AuthState {
  isAuthenticated: boolean;
  hasValidToken: boolean;
  hasUser: boolean;
  isLoading: boolean;
}

/**
 * Get the current authentication state
 * This is the ONLY way authentication should be checked
 */
export async function getAuthState(): Promise<AuthState> {
  try {
    // Step 1: Check if we have a valid token
    const token = await authProvider.getToken();
    const hasValidToken = token !== null;

    // Step 2: Check if we have a user (token alone is not enough)
    let hasUser = false;
    if (hasValidToken) {
      const user = await authProvider.getUser();
      hasUser = user !== null;
    }

    // Step 3: Only authenticated if BOTH token and user exist
    const isAuthenticated = hasValidToken && hasUser;

    return {
      isAuthenticated,
      hasValidToken,
      hasUser,
      isLoading: false,
    };
  } catch (error) {
    console.error('[AuthStability] Error checking auth state:', error);
    // On any error, assume not authenticated
    return {
      isAuthenticated: false,
      hasValidToken: false,
      hasUser: false,
      isLoading: false,
    };
  }
}

/**
 * Clear all authentication data
 * Use this instead of directly accessing localStorage
 */
export async function clearAuthData(): Promise<void> {
  try {
    await authProvider.logout();
  } catch (error) {
    console.error('[AuthStability] Error clearing auth data:', error);
    // Force clear even if logout fails
    if (typeof window !== 'undefined') {
      localStorage.removeItem('los_token');
      localStorage.removeItem('los_token_refresh');
      localStorage.removeItem('los_token_user');
    }
  }
}

/**
 * Validate that authentication requirements are met
 * Returns true only if token AND user are both valid
 */
export async function validateAuth(): Promise<boolean> {
  const state = await getAuthState();
  return state.isAuthenticated;
}

