/**
 * Auth Provider Factory
 * Creates the appropriate auth provider based on configuration
 */

import { AuthProvider } from './base';
import { JWTAuthProvider } from './jwt';
import { KeycloakAuthProvider } from './keycloak';
import { config } from '../../config';

export function createAuthProvider(): AuthProvider {
  switch (config.auth.provider) {
    case 'keycloak':
      return new KeycloakAuthProvider(config.auth.keycloak);
    case 'jwt':
      return new JWTAuthProvider(config.auth.jwt);
    case 'oauth2':
      // TODO: Implement OAuth2 provider when needed
      throw new Error('OAuth2 provider not yet implemented');
    default:
      // Default to JWT for compatibility with any LOS backend
      return new JWTAuthProvider(config.auth.jwt);
  }
}

// Export singleton auth provider instance
export const authProvider = createAuthProvider();

