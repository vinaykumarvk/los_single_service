/**
 * Keycloak Auth Provider
 * Uses OIDC client for Keycloak integration
 */

import { UserManager, User } from 'oidc-client-ts';
import { AuthProvider, LoginCredentials, AuthResult, User as AppUser } from './base';
import { AuthConfig } from '../../config';

export class KeycloakAuthProvider implements AuthProvider {
  private userManager: UserManager;
  private config: AuthConfig['keycloak'];

  constructor(config: AuthConfig['keycloak']) {
    this.config = config!;
    
    this.userManager = new UserManager({
      authority: this.config!.issuerUrl,
      client_id: this.config!.clientId,
      redirect_uri: this.config!.redirectUri,
      response_type: 'code',
      scope: 'openid profile email',
      post_logout_redirect_uri: typeof window !== 'undefined' ? window.location.origin : '/',
    });
  }

  async login(_credentials?: LoginCredentials): Promise<AuthResult> {
    // Keycloak uses redirect-based login
    await this.userManager.signinRedirect();
    // Note: This will redirect, so the promise won't resolve normally
    // The actual result comes from handleCallback()
    throw new Error('Keycloak login uses redirect flow');
  }

  async logout(): Promise<void> {
    await this.userManager.signoutRedirect();
  }

  async getToken(): Promise<string | null> {
    try {
      const user = await this.userManager.getUser();
      return user?.access_token || null;
    } catch {
      return null;
    }
  }

  async getAccessToken(): Promise<string | null> {
    return this.getToken(); // Alias for compatibility
  }

  async refreshToken(): Promise<string | null> {
    try {
      const user = await this.userManager.getUser();
      if (user && user.expired) {
        await this.userManager.signinSilent();
        const refreshedUser = await this.userManager.getUser();
        return refreshedUser?.access_token || null;
      }
      return user?.access_token || null;
    } catch {
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const user = await this.userManager.getUser();
    return user !== null && !user.expired;
  }

  async getUser(): Promise<AppUser | null> {
    try {
      const user = await this.userManager.getUser();
      if (!user) return null;

      const realmAccess = user.profile.realm_access as { roles?: string[] } | undefined;
      return {
        id: user.profile.sub,
        username: user.profile.preferred_username || user.profile.name || '',
        email: user.profile.email || '',
        roles: (realmAccess?.roles || []) as string[],
      };
    } catch {
      return null;
    }
  }

  async handleCallback(): Promise<AppUser | null> {
    try {
      const user = await this.userManager.signinRedirectCallback();
      if (user) {
        const realmAccess = user.profile.realm_access as { roles?: string[] } | undefined;
        return {
          id: user.profile.sub,
          username: user.profile.preferred_username || user.profile.name || '',
          email: user.profile.email || '',
          roles: (realmAccess?.roles || []) as string[],
        };
      }
      return null;
    } catch (error) {
      console.error('Keycloak callback error:', error);
      return null;
    }
  }
}

