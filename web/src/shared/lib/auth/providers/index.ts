/**
 * Auth Provider Factory
 * Creates the appropriate auth provider based on configuration
 */

import { AuthProvider } from './base';
import { JWTAuthProvider } from './jwt';
import { KeycloakAuthProvider } from './keycloak';
import { MockAuthProvider } from './mock';
import { config } from '../../config';

// Check if we should use demo mode (no backend)
const isDemoMode = () => {
  // Check URL param or localStorage flag
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('demo') === 'true' || 
         localStorage.getItem('los_demo_mode') === 'true' ||
         import.meta.env.VITE_DEMO_MODE === 'true';
};

export function createAuthProvider(): AuthProvider {
  // Use mock provider in demo mode
  if (isDemoMode()) {
    console.log('🎭 [Auth] Running in DEMO MODE - no backend required');
    return new MockAuthProvider();
  }

  switch (config.auth.provider) {
    case 'keycloak':
      return new KeycloakAuthProvider(config.auth.keycloak);
    case 'jwt':
      return new JWTAuthProvider(config.auth.jwt);
    case 'oauth2':
      // TODO: Implement OAuth2 provider when needed
      throw new Error('OAuth2 provider not yet implemented');
    case 'mock':
      return new MockAuthProvider();
    default:
      // Default to JWT for compatibility with any LOS backend
      return new JWTAuthProvider(config.auth.jwt);
  }
}

// Export singleton auth provider instance
export const authProvider = createAuthProvider();

// Helper to enable demo mode
export function enableDemoMode() {
  localStorage.setItem('los_demo_mode', 'true');
  window.location.reload();
}

// Helper to disable demo mode
export function disableDemoMode() {
  localStorage.removeItem('los_demo_mode');
  window.location.reload();
}

