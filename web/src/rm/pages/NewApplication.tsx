/**
 * New Application Creation Page
 * Quick form to create a new application and start the capture process
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { rmAPI } from '../lib/api';
import { useAuth } from '../../shared/hooks/useAuth';
import { useToast as useToastHook } from '../../components/ui/Toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2 } from 'lucide-react';

const newApplicationSchema = z.object({
  productCode: z.enum(['HOME_LOAN_V1', 'PERSONAL_LOAN_V1', 'BALANCE_TRANSFER_V1'], {
    required_error: 'Please select a loan type',
  }),
  requestedAmount: z.string()
    .min(1, 'Loan amount is required')
    .refine((val) => {
      const amount = parseFloat(val);
      return !isNaN(amount) && amount > 0;
    }, 'Loan amount must be greater than 0')
    .refine((val) => {
      const amount = parseFloat(val);
      return amount >= 50000; // Minimum loan amount
    }, 'Minimum loan amount is ₹50,000')
    .refine((val) => {
      const amount = parseFloat(val);
      return amount <= 50000000; // Maximum loan amount
    }, 'Maximum loan amount is ₹5,00,00,000'),
  requestedTenureMonths: z.string()
    .min(1, 'Tenure is required')
    .refine((val) => {
      const months = parseFloat(val);
      // Accept both years (1-30) and months (12-360)
      // If value is <= 30, treat as years and convert to months
      const finalMonths = months <= 30 ? months * 12 : months;
      return !isNaN(finalMonths) && finalMonths >= 12 && finalMonths <= 360;
    }, 'Tenure must be between 1-30 years (12-360 months)'),
  channel: z.enum(['Branch', 'DSA', 'Online', 'Mobile'], {
    required_error: 'Please select a channel',
  }),
});

type NewApplicationForm = z.infer<typeof newApplicationSchema>;

export default function NewApplication() {
  console.log('[NewApplication] ✅ Component function called - ROUTE MATCHED!');
  
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToastHook();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Set mounted flag after component mounts
  useEffect(() => {
    setMounted(true);
    console.log('[NewApplication] Component mounted');
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('[NewApplication] Component render', {
      authLoading,
      hasUser: !!user,
      userId: user?.id,
      username: user?.username,
      pathname: window.location.pathname,
      mounted
    });
  }, [authLoading, user, mounted]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (mounted && !authLoading && !user?.id) {
      console.warn('[NewApplication] User not authenticated, redirecting to login');
      navigate('/login', { replace: true });
    }
  }, [mounted, authLoading, user?.id, navigate]);

  // Show loading state while auth is being checked or not mounted
  if (!mounted || authLoading) {
    console.log('[NewApplication] Showing loading state', { mounted, authLoading });
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in safe-area-inset p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  // Show error if user is not authenticated (single check)
  if (!user || !user.id) {
    console.warn('[NewApplication] User not available', { user, authLoading });
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in safe-area-inset p-6">
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  console.log('[NewApplication] Rendering form for user:', user.id);

  // Initialize form - moved outside try-catch to simplify
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<NewApplicationForm>({
    resolver: zodResolver(newApplicationSchema),
    defaultValues: {
      channel: 'Mobile',
      productCode: undefined,
      requestedAmount: '500000',
      requestedTenureMonths: '20',
    },
  });

  const selectedProduct = watch('productCode');

  const onSubmit = async (data: NewApplicationForm) => {
    if (!user || !user.id) {
      addToast({
        type: 'error',
        message: 'User not authenticated. Please login again.',
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Generate applicant ID using crypto API (available in modern browsers)
      const applicantId = crypto.randomUUID();
      console.log('[NewApplication] Starting creation flow', { applicantId, userId: user.id });

      // Create a minimal applicant record first (required by application service)
      // This will be updated with full details when personal info is saved
      try {
        console.log('[NewApplication] Creating applicant record...');
        const applicantStartTime = Date.now();
        await rmAPI.applicants.create(applicantId, {
          firstName: 'New',
          lastName: 'Applicant',
        });
        console.log('[NewApplication] Applicant created successfully', { duration: Date.now() - applicantStartTime });
      } catch (applicantErr: any) {
        // If applicant creation fails, log but continue - it might be created later
        console.warn('[NewApplication] Applicant creation failed (continuing anyway):', applicantErr?.message || 'See console for details', applicantErr);
      }

      // Create the application with the applicant ID
      // The backend will create the application in Draft status
      console.log('[NewApplication] Creating application...', {
        productCode: data.productCode,
        requestedAmount: parseFloat(data.requestedAmount),
        requestedTenureMonths: Math.round(parseFloat(data.requestedTenureMonths)),
        channel: data.channel,
        applicantId,
      });
      const applicationStartTime = Date.now();
      // Convert years to months if needed (if value <= 30, treat as years)
      let tenureMonths = parseFloat(data.requestedTenureMonths);
      if (tenureMonths <= 30) {
        tenureMonths = tenureMonths * 12; // Convert years to months
      }
      
      const response = await rmAPI.applications.create({
        productCode: data.productCode,
        requestedAmount: parseFloat(data.requestedAmount),
        requestedTenureMonths: Math.round(tenureMonths),
        channel: data.channel,
        applicantId: applicantId, // Required by backend
      });
      console.log('[NewApplication] Application creation response:', { 
        duration: Date.now() - applicationStartTime,
        response: response.data,
        hasApplicationId: !!response.data?.applicationId 
      });

      if (response.data?.applicationId) {
        const applicationId = response.data.applicationId;

        // Assign to current RM user
        try {
          await rmAPI.applications.assign(applicationId, user.id);
        } catch (assignErr) {
          console.warn('Failed to assign application to RM:', assignErr);
          // Continue anyway - assignment might be done automatically
        }

        addToast({
          type: 'success',
          message: 'Application created successfully. Please fill in the details.',
        });

        // Navigate to personal information step
        navigate(`/rm/applications/${applicationId}/personal`);
      } else {
        throw new Error('Application ID not received from server');
      }
    } catch (err: any) {
      console.error('Failed to create application:', err);
      addToast({
        type: 'error',
        message: err.message || 'Failed to create application. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Ensure we always render something
  console.log('[NewApplication] About to render form JSX');
  
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in safe-area-inset p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Create New Application
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Enter basic loan details to get started
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Loan Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Loan Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Loan Type <span className="text-red-500">*</span>
              </label>
              <select
                {...register('productCode')}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white touch-manipulation min-h-[44px] ${
                  errors.productCode ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="">Select Loan Type</option>
                <option value="HOME_LOAN_V1">Home Loan</option>
                <option value="PERSONAL_LOAN_V1">Personal Loan</option>
                <option value="BALANCE_TRANSFER_V1">Balance Transfer</option>
              </select>
              {errors.productCode && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.productCode.message}
                </p>
              )}
            </div>

            {/* Loan Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Loan Amount (₹) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                placeholder="Enter loan amount"
                {...register('requestedAmount')}
                error={errors.requestedAmount?.message}
                className="touch-manipulation min-h-[44px]"
                min="50000"
                max="50000000"
                step="10000"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Minimum: ₹50,000 | Maximum: ₹5,00,00,000
              </p>
            </div>

            {/* Tenure */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tenure (Years) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                placeholder="Enter tenure in years"
                {...register('requestedTenureMonths')}
                error={errors.requestedTenureMonths?.message}
                className="touch-manipulation min-h-[44px]"
                min="1"
                max="30"
                step="1"
                onChange={(e) => {
                  const years = parseFloat(e.target.value);
                  if (!isNaN(years) && years >= 1 && years <= 30) {
                    // Convert years to months for backend
                    register('requestedTenureMonths').onChange({
                      target: { value: (years * 12).toString() },
                    });
                  }
                }}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Range: 1-30 years
                {watch('requestedTenureMonths') && (
                  <span className="ml-2">
                    ({Math.round(parseFloat(watch('requestedTenureMonths')) / 12)} years)
                  </span>
                )}
              </p>
            </div>

            {/* Channel */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Channel <span className="text-red-500">*</span>
              </label>
              <select
                {...register('channel')}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white touch-manipulation min-h-[44px] ${
                  errors.channel ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="Mobile">Mobile App</option>
                <option value="Online">Online</option>
                <option value="Branch">Branch</option>
                <option value="DSA">DSA</option>
              </select>
              {errors.channel && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.channel.message}
                </p>
              )}
            </div>

            {/* Product-specific information */}
            {selectedProduct === 'HOME_LOAN_V1' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Home Loan:</strong> You will be asked to provide property details in the next steps.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/rm/applications')}
                className="flex-1 touch-manipulation min-h-[44px]"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 touch-manipulation min-h-[44px]"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Application
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-gray-50 dark:bg-gray-800">
        <CardContent className="pt-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            What happens next?
          </h3>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
            <li>• You'll be guided through a step-by-step process</li>
            <li>• Personal information, employment details, and documents will be captured</li>
            <li>• You can save your progress at any time</li>
            <li>• Submit when all mandatory information is complete</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

