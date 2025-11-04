/**
 * RM Forgot Password Page
 * Request password reset OTP via username or email
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import { useToast as useToastHook } from '../../components/ui/Toast';
import { apiClient } from '../../shared/lib/api-client';
import { ArrowLeft, Mail, User } from 'lucide-react';

const forgotPasswordSchema = z.object({
  username: z.string().min(1).optional(),
  email: z.string().email().optional(),
}).refine((data) => data.username || data.email, {
  message: 'Either username or email is required',
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { addToast } = useToastHook();
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState<string | null>(null);
  const [userIdentifier, setUserIdentifier] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const username = watch('username');
  const email = watch('email');

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      setLoading(true);
      
      // Store identifier for reset password page
      const identifier = data.username || data.email || '';
      setUserIdentifier(identifier);

      const response = await apiClient.post('/api/auth/forgot-password', {
        username: data.username || undefined,
        email: data.email || undefined,
      }, { skipAuth: true });

      // In development/mock mode, OTP is returned in response
      if (response.data.otp) {
        setOtp(response.data.otp);
        addToast({
          type: 'info',
          message: `OTP sent! For development: ${response.data.otp}`,
        });
      } else {
        addToast({
          type: 'success',
          message: 'If the account exists, a password reset OTP has been sent to your email/mobile',
        });
      }

      setOtpSent(true);
    } catch (err: any) {
      console.error('Failed to request password reset:', err);
      addToast({
        type: 'error',
        message: err.response?.data?.error || 'Failed to request password reset. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = () => {
    // Navigate to reset password page with identifier
    const params = new URLSearchParams();
    if (username) params.set('username', username);
    if (email) params.set('email', email);
    navigate(`/rm/reset-password?${params.toString()}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/rm/login')}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-xl">Reset Password</CardTitle>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Enter your username or email to receive a password reset OTP
          </p>
        </CardHeader>
        <CardContent>
          {!otpSent ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username / RM ID <span className="text-gray-500">(optional)</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    {...register('username')}
                    className="pl-10"
                    placeholder="Enter your username"
                    disabled={loading}
                  />
                </div>
                {errors.username && (
                  <p className="text-sm text-red-600 mt-1">{errors.username.message}</p>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">OR</span>
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address <span className="text-gray-500">(optional)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    className="pl-10"
                    placeholder="Enter your email"
                    disabled={loading}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                )}
              </div>

              {errors.root && (
                <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded">
                  {errors.root.message}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || (!username && !email)}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Sending OTP...
                  </>
                ) : (
                  'Send OTP'
                )}
              </Button>

              <div className="text-center">
                <Link
                  to="/rm/login"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  Back to Login
                </Link>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  OTP Sent Successfully
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {otp 
                    ? `For development/testing: Your OTP is ${otp}. This will be sent via email/SMS in production.`
                    : 'If the account exists, a password reset OTP has been sent to your email/mobile. Please check your inbox.'
                  }
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  OTP expires in 5 minutes
                </p>
              </div>

              <Button
                onClick={handleResetPassword}
                className="w-full"
              >
                Continue to Reset Password
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setOtpSent(false);
                  setOtp(null);
                }}
                className="w-full"
              >
                Request New OTP
              </Button>

              <div className="text-center">
                <Link
                  to="/rm/login"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

