/**
 * Backward Compatible Auth Module
 * Re-exports from new auth provider system for gradual migration
 */

export { useAuth } from '../hooks/useAuth';
export { authProvider } from './auth/providers';

// Backward compatibility exports
export async function login() {
  const { authProvider } = await import('./auth/providers');
  await authProvider.login({ username: '', password: '' });
}

export async function logout() {
  const { authProvider } = await import('./auth/providers');
  await authProvider.logout();
}

export async function getUser() {
  const { authProvider } = await import('./auth/providers');
  return authProvider.getUser();
}

export async function handleCallback() {
  const { authProvider } = await import('./auth/providers');
  return authProvider.handleCallback();
}

export function getAccessToken(): Promise<string | null> {
  return import('./auth/providers').then(({ authProvider }) => authProvider.getToken());
}

