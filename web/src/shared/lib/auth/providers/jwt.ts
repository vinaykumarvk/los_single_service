/**
 * JWT Auth Provider
 * Works with any LOS backend that supports JWT authentication
 */

import { AuthProvider, LoginCredentials, AuthResult, User } from './base';
import { AuthConfig } from '../../config';

export class JWTAuthProvider implements AuthProvider {
  private config: AuthConfig['jwt'];
  private storageKey: string;

  constructor(config: AuthConfig['jwt']) {
    this.config = config!;
    this.storageKey = config?.storageKey || 'los_token';
  }

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const loginUrl = this.config!.loginEndpoint;
      console.log('🔐 Attempting login to:', loginUrl);
      console.log('📝 Username:', credentials.username);
      
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
        }),
      });

      console.log('📡 Response status:', response.status, response.statusText);
      // Headers might not support entries() in all environments
      try {
        const headersObj: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headersObj[key] = value;
        });
        console.log('📡 Response headers:', headersObj);
      } catch (e) {
        console.log('📡 Response headers: (unable to read)');
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Login failed - Response:', errorText);
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText || 'Login failed' };
        }
        throw new Error(error.error || error.message || 'Login failed');
      }

      const data = await response.json();
      console.log('✅ Login successful - Response:', { ...data, accessToken: data.accessToken ? '***' : null });
      
      const token = data.accessToken || data.token;
      const refreshToken = data.refreshToken;

      if (token) {
        // Store tokens
        localStorage.setItem(this.storageKey, token);
        if (refreshToken) {
          localStorage.setItem(`${this.storageKey}_refresh`, refreshToken);
        }

        // Store user info if provided
        if (data.user) {
          localStorage.setItem(`${this.storageKey}_user`, JSON.stringify(data.user));
        }

        return {
          token,
          refreshToken,
          user: data.user,
        };
      }

      throw new Error('No token received from server');
    } catch (error: any) {
      console.error('JWT Login Error:', error);
      // If it's a network error, provide more helpful message
      if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('Failed to fetch')) {
        throw new Error('Network error: Unable to connect to authentication service. Please check if the server is running.');
      }
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      // Call logout endpoint if available
      const token = await this.getToken();
      if (token && this.config?.loginEndpoint) {
        const logoutEndpoint = this.config.loginEndpoint.replace('/login', '/logout');
        try {
          await fetch(logoutEndpoint, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        } catch (err) {
          // Ignore logout endpoint errors
          console.warn('Logout endpoint call failed:', err);
        }
      }
    } finally {
      // Clear local storage
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(`${this.storageKey}_refresh`);
      localStorage.removeItem(`${this.storageKey}_user`);
    }
  }

  async getToken(): Promise<string | null> {
    const token = localStorage.getItem(this.storageKey);
    
    // If no token, return null
    if (!token) {
      // Ensure user data is also cleared
      localStorage.removeItem(`${this.storageKey}_user`);
      return null;
    }
    
    // Validate token format first
    const parts = token.split('.');
    if (parts.length !== 3) {
      // Invalid token format, clear everything
      console.log('[JWT] Invalid token format, clearing...');
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(`${this.storageKey}_refresh`);
      localStorage.removeItem(`${this.storageKey}_user`);
      return null;
    }
    
    // Check if token is expired (basic check)
    try {
      
      const payload = JSON.parse(atob(parts[1]));
      
      // Check if token has expiration
      if (!payload.exp) {
        // No expiration, assume invalid
        console.warn('Token has no expiration, clearing...');
        await this.logout();
        return null;
      }
      
      const expiresAt = payload.exp * 1000; // Convert to milliseconds
      
      // Add 5 second buffer to account for clock skew
      if (Date.now() >= (expiresAt - 5000)) {
        // Token expired or about to expire, try to refresh
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          // Refresh failed, clear everything
          await this.logout();
          return null;
        }
        return refreshed;
      }
      
      return token;
    } catch (err) {
      // If parsing fails, assume token is invalid - clear everything
      console.warn('Token parsing failed, clearing:', err);
      await this.logout();
      return null;
    }
  }

  async getAccessToken(): Promise<string | null> {
    return this.getToken(); // Alias for compatibility
  }

  async refreshToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem(`${this.storageKey}_refresh`);
    
    if (!refreshToken || !this.config?.refreshEndpoint) {
      return null;
    }

    try {
      const response = await fetch(this.config.refreshEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken,
        }),
      });

      if (!response.ok) {
        // Refresh failed, clear tokens
        await this.logout();
        return null;
      }

      const data = await response.json();
      const newToken = data.accessToken || data.token;

      if (newToken) {
        localStorage.setItem(this.storageKey, newToken);
        if (data.refreshToken) {
          localStorage.setItem(`${this.storageKey}_refresh`, data.refreshToken);
        }
        return newToken;
      }

      return null;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.logout();
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    if (!token) {
      return false;
    }
    
    // Also verify user exists - token alone is not enough
    const user = await this.getUser();
    return user !== null;
  }

  async getUser(): Promise<User | null> {
    // First, validate token exists and is not expired
    const token = await this.getToken();
    if (!token) {
      // No valid token, clear any stale user data
      localStorage.removeItem(`${this.storageKey}_user`);
      return null;
    }

    // Token exists and is valid (not expired), now get user data
    const userStr = localStorage.getItem(`${this.storageKey}_user`);
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        // Verify token is still valid by checking expiration
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const expiresAt = payload.exp * 1000;
          if (Date.now() >= expiresAt) {
            // Token expired, clear everything
            await this.logout();
            return null;
          }
          return user;
        } catch {
          // Token parsing failed, clear everything
          await this.logout();
          return null;
        }
      } catch {
        // User data parsing failed, clear it
        localStorage.removeItem(`${this.storageKey}_user`);
      }
    }

    // If no user in storage, try to extract from token
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresAt = payload.exp * 1000;
      
      // Check if token is expired
      if (Date.now() >= expiresAt) {
        await this.logout();
        return null;
      }

      return {
        id: payload.sub || payload.sub || payload.user_id,
        username: payload.username || payload.preferred_username,
        email: payload.email,
        roles: payload.roles || payload.authorities || [],
      };
    } catch {
      // Token parsing failed, clear everything
      await this.logout();
      return null;
    }
  }

  async handleCallback(): Promise<User | null> {
    // JWT provider doesn't use OAuth callbacks
    // Return current user if authenticated
    return this.getUser();
  }
}

