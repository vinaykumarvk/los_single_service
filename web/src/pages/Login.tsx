import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { login, getUser } from '../lib/auth';
import { User } from 'oidc-client-ts';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getUser().then((user) => {
      if (user) {
        navigate('/');
      }
    });
  }, [navigate]);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await login();
    } catch (error) {
      console.error('Login failed', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login to LOS</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Sign in with Keycloak to access the Loan Origination System.
          </p>
          <Button onClick={handleLogin} disabled={loading} className="w-full">
            {loading ? 'Redirecting...' : 'Sign In with Keycloak'}
          </Button>
          <p className="mt-4 text-xs text-gray-500 text-center">
            Demo mode: Authentication is optional. Configure VITE_KEYCLOAK_* env vars to enable.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

