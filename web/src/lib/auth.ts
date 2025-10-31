import { UserManager, User } from 'oidc-client-ts';

const keycloakConfig = {
  authority: import.meta.env.VITE_KEYCLOAK_ISSUER_URL || 'http://localhost:8080/realms/los',
  client_id: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'los-ui',
  redirect_uri: `${window.location.origin}/callback`,
  response_type: 'code',
  scope: 'openid profile email',
  post_logout_redirect_uri: window.location.origin,
};

const userManager = new UserManager(keycloakConfig);

export async function login() {
  await userManager.signinRedirect();
}

export async function logout() {
  await userManager.signoutRedirect();
}

export async function getUser(): Promise<User | null> {
  try {
    return await userManager.getUser();
  } catch {
    return null;
  }
}

export async function handleCallback(): Promise<User | null> {
  try {
    return await userManager.signinRedirectCallback();
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  // Token is automatically managed by UserManager
  // In production, you'd retrieve it from userManager.getUser()
  return null;
}

export { userManager };

