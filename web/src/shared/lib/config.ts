/**
 * Central configuration system
 * Supports both environment variables and runtime configuration
 */

export interface APIConfig {
  baseURL: string;
  apiVersion?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface AuthConfig {
  provider: 'keycloak' | 'jwt' | 'oauth2' | 'custom';
  keycloak?: {
    issuerUrl: string;
    clientId: string;
    redirectUri: string;
    realm?: string;
  };
  jwt?: {
    loginEndpoint: string;
    refreshEndpoint?: string;
    storageKey?: string;
  };
  oauth2?: {
    authorizationEndpoint: string;
    tokenEndpoint: string;
    clientId: string;
    redirectUri: string;
  };
}

export interface PersonaConfig {
  persona: 'rm' | 'admin' | 'operations' | 'all';
  allowedRoles?: string[];
}

export interface AppConfig {
  api: APIConfig;
  auth: AuthConfig;
  persona?: PersonaConfig;
}

// Runtime configuration interface (injected via window)
declare global {
  interface Window {
    __LOS_CONFIG__?: Partial<AppConfig>;
  }
}

/**
 * Get configuration from environment variables or runtime config
 */
export function getConfig(): AppConfig {
  // Check for runtime configuration first (for third-party LOS integration)
  const runtimeConfig = typeof window !== 'undefined' ? window.__LOS_CONFIG__ : undefined;

  // API Configuration
  const apiConfig: APIConfig = {
    baseURL:
      runtimeConfig?.api?.baseURL ||
      import.meta.env.VITE_API_BASE_URL ||
      import.meta.env.VITE_API_GATEWAY ||
      'http://localhost:3000',
    apiVersion: runtimeConfig?.api?.apiVersion || import.meta.env.VITE_API_VERSION || 'v1',
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10),
    headers: {
      'Content-Type': 'application/json',
      ...runtimeConfig?.api?.headers,
    },
  };

  // Auth Configuration
  const authProvider =
    runtimeConfig?.auth?.provider ||
    (import.meta.env.VITE_AUTH_PROVIDER as 'keycloak' | 'jwt' | 'oauth2' | 'custom') ||
    'jwt';

  const authConfig: AuthConfig = {
    provider: authProvider,
    keycloak: {
      issuerUrl:
        runtimeConfig?.auth?.keycloak?.issuerUrl ||
        import.meta.env.VITE_KEYCLOAK_ISSUER_URL ||
        'http://localhost:8080/realms/los',
      clientId:
        runtimeConfig?.auth?.keycloak?.clientId ||
        import.meta.env.VITE_KEYCLOAK_CLIENT_ID ||
        'los-ui',
      redirectUri:
        runtimeConfig?.auth?.keycloak?.redirectUri ||
        (typeof window !== 'undefined' ? `${window.location.origin}/callback` : '/callback'),
      realm: runtimeConfig?.auth?.keycloak?.realm || import.meta.env.VITE_KEYCLOAK_REALM,
    },
    jwt: {
      loginEndpoint:
        runtimeConfig?.auth?.jwt?.loginEndpoint ||
        import.meta.env.VITE_AUTH_SERVICE_URL ||
        `${apiConfig.baseURL}/api/auth/login` ||
        'http://localhost:3002/api/auth/login',
      refreshEndpoint:
        runtimeConfig?.auth?.jwt?.refreshEndpoint ||
        `${apiConfig.baseURL}/api/auth/refresh` ||
        'http://localhost:3002/api/auth/refresh',
      storageKey: runtimeConfig?.auth?.jwt?.storageKey || import.meta.env.VITE_JWT_STORAGE_KEY || 'los_token',
    },
    oauth2: {
      authorizationEndpoint:
        runtimeConfig?.auth?.oauth2?.authorizationEndpoint || '',
      tokenEndpoint: runtimeConfig?.auth?.oauth2?.tokenEndpoint || '',
      clientId: runtimeConfig?.auth?.oauth2?.clientId || '',
      redirectUri:
        runtimeConfig?.auth?.oauth2?.redirectUri ||
        (typeof window !== 'undefined' ? `${window.location.origin}/callback` : '/callback'),
    },
  };

  // Persona Configuration
  const persona =
    (runtimeConfig?.persona?.persona ||
      import.meta.env.VITE_PERSONA ||
      'all') as 'rm' | 'admin' | 'operations' | 'all';

  return {
    api: apiConfig,
    auth: authConfig,
    persona: {
      persona,
      allowedRoles: runtimeConfig?.persona?.allowedRoles,
    },
  };
}

// Export singleton config instance
export const config = getConfig();

