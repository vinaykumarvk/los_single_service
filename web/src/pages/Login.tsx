/**
 * Login Page - Updated to use new auth system
 * Works with both JWT and Keycloak providers
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAuth } from '../shared/hooks/useAuth';
import { config } from '../shared/lib/config';

export default function Login() {
  const navigate = useNavigate();
  const { login, loading, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Keycloak uses redirect flow, so handle differently
    if (config.auth.provider === 'keycloak') {
      try {
        await login(username, password);
      } catch (err: any) {
        // If it's a redirect error, that's expected for Keycloak
        if (!err.message?.includes('redirect')) {
          setError(err.message || 'Login failed');
        }
      }
    } else {
      // JWT or other providers
      try {
        await login(username, password);
        navigate('/');
      } catch (err: any) {
        setError(err.message || 'Login failed. Please check your credentials.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login to LOS</CardTitle>
        </CardHeader>
        <CardContent>
          {config.auth.provider === 'keycloak' ? (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Sign in with Keycloak to access the Loan Origination System.
              </p>
              <Button
                onClick={() => login('', '')}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Redirecting...' : 'Sign In with Keycloak'}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Username / RM ID
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your username"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password"
                />
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                  {error}
                </div>
              )}
              <Button type="submit" disabled={loading || !username || !password} className="w-full">
                {loading ? 'Logging in...' : 'Login'}
              </Button>
              <p className="text-xs text-gray-500 text-center mt-4">
                <a href="/forgot-password" className="text-blue-600 hover:text-blue-800">
                  Forgot password?
                </a>
              </p>
            </form>
          )}
          <p className="mt-4 text-xs text-gray-500 text-center">
            {config.auth.provider === 'jwt' 
              ? 'Login with username and password'
              : 'Demo mode: Authentication is optional. Configure VITE_KEYCLOAK_* env vars to enable.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
