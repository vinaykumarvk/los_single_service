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
      const response = await fetch(this.config!.loginEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Login failed' }));
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
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
    } catch (error) {
      console.error('JWT Login Error:', error);
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
    
    // Check if token is expired (basic check)
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiresAt = payload.exp * 1000; // Convert to milliseconds
        
        if (Date.now() >= expiresAt) {
          // Token expired, try to refresh
          const refreshed = await this.refreshToken();
          return refreshed;
        }
      } catch (err) {
        // If parsing fails, assume token is invalid
        console.warn('Token parsing failed:', err);
        return null;
      }
    }
    
    return token;
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
    return token !== null;
  }

  async getUser(): Promise<User | null> {
    const userStr = localStorage.getItem(`${this.storageKey}_user`);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }

    // If no user in storage, token might have user info
    const token = await this.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return {
          id: payload.sub || payload.sub || payload.user_id,
          username: payload.username || payload.preferred_username,
          email: payload.email,
          roles: payload.roles || payload.authorities || [],
        };
      } catch {
        return null;
      }
    }

    return null;
  }

  async handleCallback(): Promise<User | null> {
    // JWT provider doesn't use OAuth callbacks
    // Return current user if authenticated
    return this.getUser();
  }
}

