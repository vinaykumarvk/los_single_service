/**
 * Authentication Hook
 * Works with any auth provider (JWT, Keycloak, OAuth2)
 */

import { useState, useEffect, useCallback } from 'react';
import { authProvider } from '../lib/auth/providers';
import { User } from '../lib/auth/providers/base';

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
      const currentUser = await authProvider.getUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to load user:', error);
      setUser(null);
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
      await authProvider.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
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

