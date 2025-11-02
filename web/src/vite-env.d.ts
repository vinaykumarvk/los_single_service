/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_GATEWAY?: string;
  readonly VITE_AUTH_PROVIDER?: string;
  readonly VITE_KEYCLOAK_ISSUER_URL?: string;
  readonly VITE_KEYCLOAK_CLIENT_ID?: string;
  readonly VITE_PERSONA?: string;
  readonly VITE_JWT_STORAGE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

