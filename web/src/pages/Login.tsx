/**
 * Login Page - Enhanced Mobile-First Design
 * Implements global best practices for mobile-first UX
 * Phase 1: Critical Mobile-First Enhancements
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../shared/hooks/useAuth';
import { config } from '../shared/lib/config';
import { authProvider } from '../shared/lib/auth/providers';
import { Eye, EyeOff, AlertCircle, Lock, User, Loader2 } from 'lucide-react';
import PasswordStrength from '../components/ui/PasswordStrength';

export default function Login() {
  const navigate = useNavigate();
  const [rememberMe, setRememberMe] = useState(false);
  const { login, loading, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
    
    // Load remembered username if available
    const remembered = localStorage.getItem('los_remember_me');
    if (remembered === 'true') {
      const rememberedUsername = localStorage.getItem('los_remembered_username');
      if (rememberedUsername) {
        setUsername(rememberedUsername);
        setRememberMe(true);
      }
    }
  }, [isAuthenticated, navigate]);

  // Real-time validation
  const validateField = (field: 'username' | 'password', value: string) => {
    const errors: { username?: string; password?: string } = {};
    
    if (field === 'username') {
      if (!value.trim()) {
        errors.username = 'Username is required';
      } else if (value.trim().length < 3) {
        errors.username = 'Username must be at least 3 characters';
      }
    }
    
    if (field === 'password') {
      if (!value) {
        errors.password = 'Password is required';
      } else if (value.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
    }
    
    setFieldErrors(prev => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Validate all fields
    const usernameValid = validateField('username', username);
    const passwordValid = validateField('password', password);

    if (!usernameValid || !passwordValid) {
      return;
    }

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
        
        // Store remember me preference
        if (rememberMe) {
          localStorage.setItem('los_remember_me', 'true');
          localStorage.setItem('los_remembered_username', username);
        } else {
          localStorage.removeItem('los_remember_me');
          localStorage.removeItem('los_remembered_username');
        }
        
        // After login, wait for user state to update, then redirect based on roles
        setTimeout(async () => {
          const currentUser = await authProvider.getUser();
          if (currentUser?.roles && currentUser.roles.length > 0) {
            // Redirect based on persona
            if (currentUser.roles.includes('rm') || currentUser.roles.includes('relationship_manager')) {
              navigate('/rm');
            } else if (currentUser.roles.includes('admin')) {
              navigate('/admin');
            } else if (currentUser.roles.includes('ops') || currentUser.roles.includes('operations')) {
              navigate('/operations');
            } else {
              navigate('/');
            }
          } else {
            navigate('/');
          }
        }, 300);
      } catch (err: any) {
        const errorMessage = err.message || 'Login failed. Please check your credentials.';
        setError(errorMessage);
        
        // Parse specific error messages for better UX
        if (errorMessage.toLowerCase().includes('invalid credentials') || 
            errorMessage.toLowerCase().includes('incorrect')) {
          setFieldErrors({
            username: ' ',
            password: 'Invalid username or password',
          });
        }
      }
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    if (fieldErrors.username) {
      validateField('username', value);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (fieldErrors.password) {
      validateField('password', value);
    }
  };

  const handleUsernameBlur = () => {
    validateField('username', username);
  };

  const handlePasswordBlur = () => {
    validateField('password', password);
  };

  // Handle Enter key to move to next field or submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: 'username' | 'password') => {
    if (e.key === 'Enter') {
      if (field === 'username') {
        // Focus password field
        const passwordInput = document.getElementById('password') as HTMLInputElement;
        if (passwordInput) {
          passwordInput.focus();
        }
      } else {
        // Submit form
        if (username && password && !loading) {
          handleSubmit(e as any);
        }
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center 
      bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 
      dark:from-gray-900 dark:via-gray-800 dark:to-gray-900
      px-4 sm:px-6 lg:px-8 py-8 sm:py-12
      safe-area-inset">
      <div className="w-full max-w-md mx-auto">
        {/* Brand/Logo Section */}
        <div className="text-center mb-8 sm:mb-10 animate-fade-in">
          {/* Logo - Try to load actual logo, fallback to icon */}
          <div className="inline-flex items-center justify-center mb-4">
            <div className="relative">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 
                bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 
                rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300
                transform hover:scale-105 transition-transform">
                <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              {/* Optional: Add logo image if available */}
              {/* <img 
                src="/logo.svg" 
                alt="LOS Logo" 
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                onError={(e) => {
                  // Hide image if not found, show icon instead
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              /> */}
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 
            animate-slide-up">
            Welcome Back
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300
            animate-slide-up animation-delay-100">
            Sign in to continue to your dashboard
          </p>
        </div>

        <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm
          animate-slide-up animation-delay-200">
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-xl sm:text-2xl text-center">Login to LOS</CardTitle>
          </CardHeader>
          <CardContent>
            {config.auth.provider === 'keycloak' ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-6">
                  Sign in with Keycloak to access the Loan Origination System.
                </p>
                <Button
                  onClick={() => login('', '')}
                  disabled={loading}
                  className="w-full h-12 sm:h-11 text-base sm:text-sm"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Spinner className="mr-2" />
                      Redirecting...
                    </>
                  ) : (
                    'Sign In with Keycloak'
                  )}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-4">
                {/* Username Field */}
                <div>
                  <label 
                    htmlFor="username" 
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Username / RM ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={handleUsernameChange}
                      onBlur={handleUsernameBlur}
                      onKeyDown={(e) => handleKeyDown(e, 'username')}
                      required
                      autoComplete="username"
                      inputMode="text"
                      className={`
                        block w-full h-12 sm:h-11 pl-10 sm:pl-11 pr-3 sm:pr-4
                        text-base sm:text-sm
                        border rounded-lg
                        bg-white dark:bg-gray-700
                        text-gray-900 dark:text-white
                        placeholder-gray-400 dark:placeholder-gray-500
                        transition-all duration-200
                        touch-manipulation
                        ${fieldErrors.username ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'}
                        focus:outline-none focus:ring-2 focus:ring-offset-0
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                      placeholder="Enter your username"
                      disabled={loading}
                      aria-invalid={fieldErrors.username ? 'true' : 'false'}
                      aria-describedby={fieldErrors.username ? 'username-error' : undefined}
                    />
                  </div>
                  {fieldErrors.username && fieldErrors.username.trim() !== '' && (
                    <div 
                      id="username-error"
                      className="mt-2 flex items-start text-sm text-red-600 dark:text-red-400"
                      role="alert"
                    >
                      <AlertCircle className="h-4 w-4 mr-1.5 mt-0.5 flex-shrink-0" />
                      <span>{fieldErrors.username}</span>
                    </div>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label 
                    htmlFor="password" 
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={handlePasswordChange}
                      onBlur={handlePasswordBlur}
                      onKeyDown={(e) => handleKeyDown(e, 'password')}
                      required
                      autoComplete="current-password"
                      className={`
                        block w-full h-12 sm:h-11 pl-10 sm:pl-11 pr-12 sm:pr-14
                        text-base sm:text-sm
                        border rounded-lg
                        bg-white dark:bg-gray-700
                        text-gray-900 dark:text-white
                        placeholder-gray-400 dark:placeholder-gray-500
                        transition-all duration-200
                        touch-manipulation
                        ${fieldErrors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'}
                        focus:outline-none focus:ring-2 focus:ring-offset-0
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                      placeholder="Enter your password"
                      disabled={loading}
                      aria-invalid={fieldErrors.password ? 'true' : 'false'}
                      aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center
                        text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                        focus:outline-none focus:text-gray-600 dark:focus:text-gray-300
                        transition-colors
                        touch-manipulation
                        min-w-[44px] min-h-[44px]"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <div 
                      id="password-error"
                      className="mt-2 flex items-start text-sm text-red-600 dark:text-red-400"
                      role="alert"
                    >
                      <AlertCircle className="h-4 w-4 mr-1.5 mt-0.5 flex-shrink-0" />
                      <span>{fieldErrors.password}</span>
                    </div>
                  )}
                  
                  {/* Password Strength Indicator (only show when typing, not on error) */}
                  {password && !fieldErrors.password && (
                    <PasswordStrength password={password} showStrength={true} />
                  )}
                </div>

                {/* General Error Message */}
                {error && !fieldErrors.username && !fieldErrors.password && (
                  <div 
                    className="flex items-start p-3 sm:p-4 rounded-lg 
                      bg-red-50 dark:bg-red-900/20 
                      border border-red-200 dark:border-red-800
                      text-sm text-red-700 dark:text-red-400"
                    role="alert"
                  >
                    <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">Login failed</p>
                      <p className="mt-1">{error}</p>
                    </div>
                  </div>
                )}

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 sm:w-5 sm:h-4 text-blue-600 border-gray-300 rounded 
                        focus:ring-blue-500 focus:ring-2 
                        cursor-pointer
                        touch-manipulation
                        min-w-[44px] min-h-[44px]"
                    />
                    <span className="ml-2 sm:ml-3 text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                      Remember me
                    </span>
                  </label>
                  <a 
                    href="/forgot-password" 
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 
                      font-medium transition-colors
                      touch-manipulation
                      min-h-[44px] flex items-center"
                  >
                    Forgot password?
                  </a>
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  disabled={loading || !username.trim() || !password || !!fieldErrors.username || !!fieldErrors.password} 
                  className="w-full h-12 sm:h-11 text-base sm:text-sm font-semibold
                    shadow-lg hover:shadow-xl transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                    touch-manipulation
                    relative overflow-hidden group"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <span className="relative z-10">Sign In</span>
                      <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    </>
                  )}
                </Button>

                {/* Help/Support Links */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-300 text-center mb-3">
                    Need help?
                  </p>
                  <div className="flex flex-wrap justify-center gap-3 sm:gap-4 text-xs">
                    <a 
                      href="/help" 
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300
                        transition-colors duration-200
                        touch-manipulation
                        min-h-[44px] flex items-center font-medium"
                    >
                      Help Center
                    </a>
                    <span className="text-gray-300 dark:text-gray-600 self-center">•</span>
                    <a 
                      href="/support" 
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300
                        transition-colors duration-200
                        touch-manipulation
                        min-h-[44px] flex items-center font-medium"
                    >
                      Contact Support
                    </a>
                  </div>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Footer Info */}
        <p className="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">
          {config.auth.provider === 'jwt' 
            ? 'Secure login with username and password'
            : 'Demo mode: Authentication is optional. Configure VITE_KEYCLOAK_* env vars to enable.'}
        </p>
      </div>
    </div>
  );
}
