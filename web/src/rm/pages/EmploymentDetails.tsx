/**
 * RM Employment/Income Details Page - Enhanced Mobile-First Design
 * Capture employment and income-related details
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { rmAPI } from '../lib/api';
import { useToast as useToastHook } from '../../components/ui/Toast';
import { ArrowLeft, ArrowRight, Save, Briefcase, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';
import ApplicationStepWrapper from '../components/ApplicationStepWrapper';

const employmentSchema = z.object({
  employmentType: z.enum(['Salaried', 'Self-employed'], { 
    required_error: 'Employment type is required',
    invalid_type_error: 'Please select an employment type'
  }),
  employerName: z.string()
    .max(200, 'Organization name must not exceed 200 characters')
    .optional(),
  businessName: z.string()
    .max(200, 'Business name must not exceed 200 characters')
    .optional(),
  monthlyIncome: z.string()
    .min(1, 'Monthly income is required')
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, 'Monthly income must be a positive number')
    .refine((val) => {
      const num = parseFloat(val);
      return num >= 10000;
    }, 'Monthly income must be at least ₹10,000'),
  yearsInJob: z.string()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 50;
    }, 'Years in job must be between 0 and 50 years')
    .optional(),
  otherIncomeSources: z.string()
    .max(500, 'Other income sources description must not exceed 500 characters')
    .optional(),
}).refine((data) => {
  if (data.employmentType === 'Salaried') {
    return !!data.employerName;
  }
  return true;
}, {
  message: 'Employer name is required for salaried employees',
  path: ['employerName'],
});

type EmploymentForm = z.infer<typeof employmentSchema>;

export default function RMEmploymentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToastHook();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    setValue,
  } = useForm<EmploymentForm>({
    resolver: zodResolver(employmentSchema),
  });

  const employmentType = watch('employmentType');
  const monthlyIncome = watch('monthlyIncome');
  const otherIncomeSources = watch('otherIncomeSources');

  const totalAnnualIncome = useMemo(() => {
    const monthly = parseFloat(monthlyIncome || '0');
    const other = parseFloat(otherIncomeSources || '0');
    return (monthly + other) * 12;
  }, [monthlyIncome, otherIncomeSources]);

  useEffect(() => {
    loadExistingData();
  }, [id]);

  const loadExistingData = async () => {
    if (!id) {
      console.warn('EmploymentDetails: Cannot load data - no application ID');
      return;
    }

    try {
      setFetching(true);
      console.log('EmploymentDetails: Loading employment data for application:', id);
      
      const response = await rmAPI.applicants.get(id);
      console.log('EmploymentDetails: Full API response:', response);
      
      // Handle axios response structure
      let applicant = null;
      if (response?.data?.data && typeof response.data.data === 'object') {
        applicant = response.data.data;
        console.log('EmploymentDetails: ✅ Found data in axios response structure (response.data.data)');
      } else if (response?.data && typeof response.data === 'object' && 'employment_type' in response.data) {
        applicant = response.data;
        console.log('EmploymentDetails: ✅ Found data in direct structure (response.data)');
      }
      
      if (applicant) {
        console.log('EmploymentDetails: Setting form values for applicant:', applicant);
        
        const fields = {
          employmentType: applicant.employment_type as any,
          employerName: applicant.employer_name || '',
          businessName: applicant.business_name || '',
          monthlyIncome: applicant.monthly_income?.toString() || '',
          yearsInJob: applicant.years_in_job?.toString() || '',
          otherIncomeSources: applicant.other_income_sources ? applicant.other_income_sources.toString() : '',
        };
        
        console.log('EmploymentDetails: Form fields to set:', fields);
        
        Object.entries(fields).forEach(([key, value]) => {
          setValue(key as any, value);
          console.log(`EmploymentDetails: Set ${key} = ${value}`);
        });
        
        console.log('EmploymentDetails: ✅ All form values set successfully');
      } else {
        console.error('EmploymentDetails: ❌ No applicant data found in response');
        addToast({
          type: 'warning',
          message: 'No employment data found for this application',
        });
      }
    } catch (err: any) {
      console.error('EmploymentDetails: ❌ Failed to load employment data:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
      });
      addToast({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Failed to load employment data',
      });
    } finally {
      setFetching(false);
      console.log('EmploymentDetails: Data loading completed');
    }
  };

  const onSubmit = async (data: EmploymentForm) => {
    if (!id) {
      addToast({
        type: 'error',
        message: 'Application ID is missing',
      });
      return;
    }

    try {
      setLoading(true);
      await rmAPI.applicants.update(id, {
        employmentType: data.employmentType,
        employerName: data.employerName,
        businessName: data.businessName,
        monthlyIncome: parseFloat(data.monthlyIncome),
        yearsInJob: data.yearsInJob ? parseFloat(data.yearsInJob) : undefined,
        otherIncomeSources: data.otherIncomeSources ? parseFloat(data.otherIncomeSources) : undefined,
      });

      addToast({
        type: 'success',
        message: 'Employment details saved successfully',
      });

      navigate(`/rm/applications/${id}/loan-property`);
    } catch (err: any) {
      console.error('Failed to save employment details:', err);
      addToast({
        type: 'error',
        message: err.message || 'Failed to save employment details',
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate form completion percentage
  const formData = watch();
  const completionPercentage = () => {
    const requiredFields = ['employmentType', 'monthlyIncome'];
    const conditionalFields = employmentType === 'Salaried' ? ['employerName'] : ['businessName'];
    const allRequired = [...requiredFields, ...conditionalFields];
    const filledFields = allRequired.filter(field => {
      const value = formData[field as keyof EmploymentForm];
      return value && value !== '';
    }).length;
    return Math.round((filledFields / allRequired.length) * 100);
  };

  if (fetching) {
    return (
      <ApplicationStepWrapper>
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </ApplicationStepWrapper>
    );
  }

  return (
    <ApplicationStepWrapper>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-4 sm:space-y-6 animate-fade-in safe-area-inset">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Employment & Income Details
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Step 2 of 4: Capture employment and income information
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(`/rm/applications/${id}/personal`)}
          className="w-full sm:w-auto touch-manipulation min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
      </div>

      {/* Progress Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Form Completion
            </span>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              {completionPercentage()}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage()}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
        {/* Employment Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <CardTitle>Employment Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Employment Type *
              </label>
              <select
                {...register('employmentType')}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white touch-manipulation min-h-[44px]"
              >
                <option value="">Select Employment Type</option>
                <option value="Salaried">Salaried</option>
                <option value="Self-employed">Self-employed</option>
              </select>
              {errors.employmentType && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.employmentType.message}
                </p>
              )}
            </div>

            {employmentType === 'Salaried' && (
              <div>
                <Input
                  label="Employer/Organization Name *"
                  {...register('employerName')}
                  error={errors.employerName?.message}
                  placeholder="Enter employer name"
                  className="touch-manipulation"
                />
              </div>
            )}

            {employmentType === 'Self-employed' && (
              <div>
                <Input
                  label="Business Name"
                  {...register('businessName')}
                  error={errors.businessName?.message}
                  placeholder="Enter business name"
                  className="touch-manipulation"
                />
              </div>
            )}

            <div>
              <Input
                label="Years in Current Job"
                {...register('yearsInJob')}
                error={errors.yearsInJob?.message}
                placeholder="0"
                type="number"
                min="0"
                max="50"
                inputMode="numeric"
                className="touch-manipulation"
              />
            </div>
          </CardContent>
        </Card>

        {/* Income Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              <CardTitle>Income Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                label="Monthly Income (₹) *"
                type="number"
                {...register('monthlyIncome')}
                error={errors.monthlyIncome?.message}
                placeholder="50000"
                min="10000"
                step="1000"
                inputMode="numeric"
                className="touch-manipulation"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Minimum ₹10,000 required
              </p>
            </div>

            <div>
              <Input
                label="Other Income Sources (Monthly ₹)"
                type="number"
                {...register('otherIncomeSources')}
                error={errors.otherIncomeSources?.message}
                placeholder="10000"
                min="0"
                step="1000"
                inputMode="numeric"
                className="touch-manipulation"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Rental income, dividends, etc.
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Total Annual Income:
                </span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  ₹{totalAnnualIncome.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Calculated as: (Monthly Income × 12) + (Other Income × 12)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/rm/applications/${id}/personal`)}
            className="w-full sm:w-auto touch-manipulation min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                const values = watch();
                await onSubmit(values as EmploymentForm);
              }}
              disabled={loading || !isDirty}
              className="w-full sm:w-auto touch-manipulation min-h-[44px]"
            >
              <Save className="h-4 w-4 mr-2" />
              Save as Draft
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto touch-manipulation min-h-[44px]"
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Save & Continue
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
      </div>
    </ApplicationStepWrapper>
  );
}
