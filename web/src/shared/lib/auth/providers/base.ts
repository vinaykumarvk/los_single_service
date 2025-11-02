/**
 * Abstract Auth Provider Interface
 * All authentication providers must implement this interface
 */

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResult {
  token: string;
  refreshToken?: string;
  user?: User;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  roles?: string[];
  [key: string]: any;
}

export interface AuthProvider {
  login(credentials: LoginCredentials): Promise<AuthResult>;
  logout(): Promise<void>;
  getToken(): Promise<string | null>;
  getAccessToken(): Promise<string | null>; // Alias for getToken for compatibility
  refreshToken(): Promise<string | null>;
  isAuthenticated(): Promise<boolean>;
  getUser(): Promise<User | null>;
  handleCallback(): Promise<User | null>;
}

