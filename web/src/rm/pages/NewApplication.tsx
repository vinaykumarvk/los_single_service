/**
 * New Application Creation - Simplified Flow
 * Step 1: Capture basic loan details and create application
 * After creation, navigates to personal information step
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';
import { useToast as useToastHook } from '../../components/ui/Toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Loader2, Plus } from 'lucide-react';
import { rmAPI } from '../lib/api';

export default function NewApplication() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToastHook();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    productCode: '',
    requestedAmount: '500000',
    requestedTenureYears: '20',
    channel: 'Mobile',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate form
  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.productCode) {
      newErrors.productCode = 'Please select a loan type';
    }
    
    const amount = parseFloat(formData.requestedAmount);
    if (!amount || amount < 50000 || amount > 50000000) {
      newErrors.requestedAmount = 'Amount must be between ₹50,000 and ₹5,00,00,000';
    }
    
    const years = parseFloat(formData.requestedTenureYears);
    if (!years || years < 1 || years > 30) {
      newErrors.requestedTenureYears = 'Tenure must be between 1-30 years';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission - Create application and navigate to personal info
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[NewApplication] Form submitted', { formData, user: user?.id });
    
    if (!validate()) {
      console.log('[NewApplication] Validation failed');
      addToast({ type: 'error', message: 'Please fix the errors in the form' });
      return;
    }

    if (!user?.id) {
      console.log('[NewApplication] User not authenticated');
      addToast({ type: 'error', message: 'User not authenticated' });
      return;
    }

    try {
      setLoading(true);
      console.log('[NewApplication] Starting application creation...');
      
      // Generate applicant ID (backend will create minimal record if needed)
      const applicantId = crypto.randomUUID();
      
      // Convert years to months
      const tenureMonths = Math.round(parseFloat(formData.requestedTenureYears) * 12);

      const requestData = {
        productCode: formData.productCode,
        requestedAmount: parseFloat(formData.requestedAmount),
        requestedTenureMonths: tenureMonths,
        channel: formData.channel as 'Branch' | 'DSA' | 'Online' | 'Mobile',
        applicantId,
      };

      console.log('[NewApplication] Calling API with:', requestData);

      // Create application - Backend saves to database
      const response = await rmAPI.applications.create(requestData);

      console.log('[NewApplication] API Response:', response);

      const applicationId = response.data?.applicationId;

      if (applicationId) {
        console.log('[NewApplication] ✅ Application created, ID:', applicationId);
        addToast({ type: 'success', message: 'Application created! Now add personal details.' });
        // Navigate to personal information step
        navigate(`/rm/applications/${applicationId}/personal`);
      } else {
        console.error('[NewApplication] ❌ No application ID in response:', response.data);
        throw new Error('Application ID not received');
      }
    } catch (err: any) {
      console.error('[NewApplication] ❌ Error creating application:', err);
      console.error('[NewApplication] Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      addToast({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Failed to create application',
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user?.id) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p className="text-red-600">Please log in to create an application.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Create New Application
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Enter basic loan details to get started
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Loan Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Loan Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Loan Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.productCode}
                onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-h-[44px] ${
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
                  {errors.productCode}
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
                value={formData.requestedAmount}
                onChange={(e) => setFormData({ ...formData, requestedAmount: e.target.value })}
                error={errors.requestedAmount}
                className="min-h-[44px]"
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
                placeholder="Enter tenure in years (1-30)"
                value={formData.requestedTenureYears}
                onChange={(e) => setFormData({ ...formData, requestedTenureYears: e.target.value })}
                error={errors.requestedTenureYears}
                className="min-h-[44px]"
                min="1"
                max="30"
                step="1"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Range: 1-30 years
              </p>
            </div>

            {/* Channel */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Channel <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.channel}
                onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-h-[44px] ${
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
                  {errors.channel}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/rm/applications')}
                className="flex-1 min-h-[44px]"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 min-h-[44px]"
                disabled={loading || !formData.productCode}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Application
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
