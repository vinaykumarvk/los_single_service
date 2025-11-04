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
  }, [loadUser]);

  const login = useCallback(async (username: string, password: string) => {
    try {
      setLoading(true);
      // For Keycloak, this will throw (redirect flow)
      // For JWT, this will work normally
      await authProvider.login({ username, password });
      
      // After successful login, load user
      await loadUser();
    } catch (error: any) {
      // If error is redirect-related (Keycloak), that's expected
      if (error.message?.includes('redirect')) {
        // Keycloak will handle redirect, just return
        return;
      }
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

