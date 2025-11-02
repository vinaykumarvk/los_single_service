/**
 * Callback Page - Updated to use new auth system
 * Handles OAuth callbacks (Keycloak, OAuth2)
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner from '../components/ui/Spinner';
import { authProvider } from '../shared/lib/auth/providers';
import { config } from '../shared/lib/config';

export default function Callback() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // For Keycloak and OAuth2, handle the callback
      if (config.auth.provider === 'keycloak' || config.auth.provider === 'oauth2') {
        const user = await authProvider.handleCallback();
        if (user) {
          // Determine redirect path based on persona
          const persona = config.persona?.persona || 'all';
          if (persona === 'rm') {
            navigate('/rm');
          } else {
            navigate('/');
          }
        } else {
          setError('Failed to complete login');
          setTimeout(() => navigate('/login'), 2000);
        }
      } else {
        // For JWT, there's no callback - just redirect to login
        navigate('/login');
      }
    } catch (err: any) {
      console.error('Callback error:', err);
      setError(err.message || 'Authentication failed');
      setTimeout(() => navigate('/login'), 2000);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Spinner />
        <p className="mt-4 text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}
