/**
 * Authentication Hook
 * Works with any auth provider (JWT, Keycloak, OAuth2)
 */

import { useState, useEffect, useCallback } from 'react';
import { authProvider } from '../lib/auth/providers';
import { User } from '../lib/auth/providers/base';
import { getAuthState, validateAuth, clearAuthData } from '../lib/auth/auth-stability';

export interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      
      // First, try to get user directly from localStorage as fast path
      const userStr = localStorage.getItem('los_token_user');
      if (userStr) {
        try {
          const cachedUser = JSON.parse(userStr);
          const token = localStorage.getItem('los_token');
          if (token) {
            // Verify token is valid
            try {
              const parts = token.split('.');
              if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                const expiresAt = payload.exp * 1000;
                if (Date.now() < expiresAt) {
                  // Token is valid, use cached user immediately
                  console.log('[useAuth] Using cached user from localStorage:', cachedUser);
                  setUser(cachedUser);
                  setLoading(false);
                  // Still validate in background, but don't wait
                  getAuthState().then(authState => {
                    if (!authState.isAuthenticated) {
                      console.warn('[useAuth] Auth state validation failed, clearing user');
                      setUser(null);
                    }
                  }).catch(console.error);
                  return;
                }
              }
            } catch (e) {
              console.warn('[useAuth] Token validation failed:', e);
            }
          }
        } catch (e) {
          console.warn('[useAuth] Failed to parse cached user:', e);
        }
      }
      
      // Fallback to full auth state check
      // CRITICAL: Use auth-stability module for consistent state checking
      const authState = await getAuthState();
      
      if (!authState.isAuthenticated) {
        // Not authenticated - clear user state
        setUser(null);
        setLoading(false);
        return;
      }

      // If authenticated, load user data
      const currentUser = await authProvider.getUser();
      
      // Double-check: verify token is still valid using stability module
      if (currentUser) {
        const isValid = await validateAuth();
        if (!isValid) {
          // Token became invalid, clear user
          setUser(null);
          await clearAuthData();
        } else {
          setUser(currentUser);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      setUser(null);
      // Clear any stale data on error using stability module
      await clearAuthData();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
    
    // Listen for storage changes (e.g., when login stores token in another tab/component)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'los_token' || e.key === 'los_token_user') {
        console.log('[useAuth] Storage changed, reloading user...');
        loadUser();
      }
    };
    
    // Also listen for custom events (for same-tab updates)
    const handleTokenUpdate = () => {
      console.log('[useAuth] Token update event received, reloading user...');
      loadUser();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('los_token_updated', handleTokenUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('los_token_updated', handleTokenUpdate);
    };
  }, [loadUser]);

  const login = useCallback(async (username: string, password: string) => {
    try {
      setLoading(true);
      console.log('[useAuth] Starting login for:', username);
      // For Keycloak, this will throw (redirect flow)
      // For JWT, this will work normally
      const result = await authProvider.login({ username, password });
      console.log('[useAuth] Login result received:', { hasUser: !!result?.user, hasToken: !!result?.token });
      
      // CRITICAL: Immediately set user state from login result if available
      // This prevents race condition where navigation happens before state updates
      if (result?.user) {
        console.log('[useAuth] Setting user immediately from login result:', result.user);
        setUser(result.user);
        setLoading(false); // Set loading false immediately so navigation can proceed
        // Still call loadUser in background to ensure token validation, but don't wait
        loadUser().catch(console.error);
        return;
      }
      
      // If no user in result, load from token (fallback)
      console.log('[useAuth] No user in result, loading from token...');
      await loadUser();
    } catch (error: any) {
      console.error('[useAuth] Login error caught:', error);
      // If error is redirect-related (Keycloak), that's expected
      if (error?.message?.includes('redirect')) {
        // Keycloak will handle redirect, just return
        console.log('[useAuth] Keycloak redirect, ignoring error');
        return;
      }
      // Re-throw error so Login component can catch and display it
      console.error('[useAuth] Re-throwing login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loadUser]);

  const logout = useCallback(async () => {
    try {
      // Use stability module for consistent logout
      await clearAuthData();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Force clear even if stability module fails
      setUser(null);
    }
  }, []);

  return {
    user,
    loading,
    isAuthenticated: user !== null,
    login,
    logout,
    refreshUser: loadUser,
  };
}

