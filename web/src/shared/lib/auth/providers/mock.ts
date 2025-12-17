/**
 * Mock Auth Provider
 * For demo/development mode without backend
 */

import { AuthProvider, LoginCredentials, AuthResult, User } from './base';

// Demo users for testing
const DEMO_USERS: Record<string, { password: string; user: User }> = {
  rm1: {
    password: 'rm1',
    user: {
      id: 'rm1-user-id',
      username: 'rm1',
      email: 'rm1@los.local',
      roles: ['rm', 'relationship_manager'],
    },
  },
  rm2: {
    password: 'rm2',
    user: {
      id: 'rm2-user-id',
      username: 'rm2',
      email: 'rm2@los.local',
      roles: ['rm', 'relationship_manager'],
    },
  },
  admin1: {
    password: 'admin1',
    user: {
      id: 'admin1-user-id',
      username: 'admin1',
      email: 'admin1@los.local',
      roles: ['admin', 'pii:read'],
    },
  },
  ops1: {
    password: 'ops1',
    user: {
      id: 'ops1-user-id',
      username: 'ops1',
      email: 'ops1@los.local',
      roles: ['ops', 'checker'],
    },
  },
};

// Generate a fake JWT token for demo purposes
function generateMockToken(user: User): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
    })
  );
  const signature = btoa('mock-signature');
  return `${header}.${payload}.${signature}`;
}

export class MockAuthProvider implements AuthProvider {
  private storageKey = 'los_token';

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    const { username, password } = credentials;

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const demoUser = DEMO_USERS[username.toLowerCase()];

    if (!demoUser || demoUser.password !== password) {
      throw new Error('Invalid username or password');
    }

    const token = generateMockToken(demoUser.user);

    // Store in localStorage
    localStorage.setItem(this.storageKey, token);
    localStorage.setItem(`${this.storageKey}_user`, JSON.stringify(demoUser.user));

    // Dispatch event
    window.dispatchEvent(
      new CustomEvent('los_token_updated', { detail: { user: demoUser.user } })
    );

    console.log('✅ [MockAuth] Demo login successful:', demoUser.user.username);

    return {
      token,
      user: demoUser.user,
    };
  }

  async logout(): Promise<void> {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(`${this.storageKey}_refresh`);
    localStorage.removeItem(`${this.storageKey}_user`);
    console.log('👋 [MockAuth] Logged out');
  }

  async getToken(): Promise<string | null> {
    return localStorage.getItem(this.storageKey);
  }

  async getAccessToken(): Promise<string | null> {
    return this.getToken();
  }

  async refreshToken(): Promise<string | null> {
    // Mock refresh - just return existing token
    return this.getToken();
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    if (!token) return false;

    // Check if token is expired
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() < payload.exp * 1000;
    } catch {
      return false;
    }
  }

  async getUser(): Promise<User | null> {
    const token = await this.getToken();
    if (!token) return null;

    const userStr = localStorage.getItem(`${this.storageKey}_user`);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  async handleCallback(): Promise<User | null> {
    return this.getUser();
  }
}

