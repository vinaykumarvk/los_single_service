/**
 * RM Employment/Income Details Page
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
import Spinner from '../../components/ui/Spinner';
import { rmAPI } from '../lib/api';
import { useToast as useToastHook } from '../../components/ui/Toast';

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
      if (!val || val === '') return true; // Optional field
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 50;
    }, 'Years in job must be between 0 and 50 years')
    .optional(),
  otherIncomeSources: z.string()
    .max(500, 'Other income sources description must not exceed 500 characters')
    .optional(),
}).refine((data) => {
  if (data.employmentType === 'Salaried') {
    return !!data.employerName && data.employerName.trim().length > 0;
  }
  return true;
}, {
  message: 'Organization name is required for salaried employees',
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
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<EmploymentForm>({
    resolver: zodResolver(employmentSchema),
    defaultValues: {
      employmentType: undefined,
    },
  });

  const employmentType = watch('employmentType');
  const monthlyIncome = watch('monthlyIncome');
  const otherIncomeSources = watch('otherIncomeSources');

  // Calculate total annual income
  const totalAnnualIncome = useMemo(() => {
    const monthly = parseFloat(monthlyIncome || '0');
    const other = parseFloat(otherIncomeSources || '0');
    return (monthly * 12) + (other * 12);
  }, [monthlyIncome, otherIncomeSources]);

  useEffect(() => {
    loadExistingData();
  }, [id]);

  const loadExistingData = async () => {
    if (!id) return;

    try {
      setFetching(true);
      const response = await rmAPI.applicants.get(id);
      if (response.data) {
        const applicant = response.data;
        setValue('employmentType', applicant.employment_type as any);
        setValue('employerName', applicant.employer_name || '');
        setValue('monthlyIncome', applicant.monthly_income?.toString() || '');
        setValue('yearsInJob', applicant.years_in_job?.toString() || '');
        setValue('otherIncomeSources', applicant.other_income_sources || '');
      }
    } catch (err: any) {
      console.error('Failed to load employment data:', err);
      addToast({
        type: 'error',
        message: 'Failed to load employment data',
      });
    } finally {
      setFetching(false);
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
      // Get existing applicant data first
      const existingApplicant = await rmAPI.applicants.get(id);
      await rmAPI.applicants.update(id, {
        firstName: existingApplicant.data?.first_name || '',
        lastName: existingApplicant.data?.last_name || '',
        dateOfBirth: existingApplicant.data?.date_of_birth || '',
        mobile: existingApplicant.data?.mobile || '',
        employmentType: data.employmentType,
        employerName: data.employmentType === 'Salaried' ? data.employerName : undefined,
        monthlyIncome: parseFloat(data.monthlyIncome),
        yearsInJob: data.yearsInJob ? parseFloat(data.yearsInJob) : undefined,
        otherIncomeSources: data.otherIncomeSources || undefined,
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

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employment & Income Details</h1>
          <p className="text-sm text-gray-500 mt-1">Capture employment and income information</p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/rm/applications/${id}/personal`)}>
          ← Back
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Employment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employment Type *
              </label>
              <select
                {...register('employmentType')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Employment Type</option>
                <option value="Salaried">Salaried</option>
                <option value="Self-employed">Self-employed</option>
              </select>
              {errors.employmentType && (
                <p className="mt-1 text-sm text-red-600">{errors.employmentType.message}</p>
              )}
            </div>

            {employmentType === 'Salaried' && (
              <div>
                <Input
                  label="Organization Name *"
                  {...register('employerName')}
                  error={errors.employerName?.message}
                  placeholder="ABC Corporation Pvt Ltd"
                />
              </div>
            )}

            {employmentType === 'Self-employed' && (
              <div>
                <Input
                  label="Business Name"
                  {...register('businessName')}
                  error={errors.businessName?.message}
                  placeholder="ABC Traders"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Years in Job/Business"
                  type="number"
                  {...register('yearsInJob')}
                  error={errors.yearsInJob?.message}
                  placeholder="5"
                  min="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Income Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                label="Monthly Income (₹) *"
                type="number"
                {...register('monthlyIncome')}
                error={errors.monthlyIncome?.message}
                placeholder="50000"
                min="0"
                step="1000"
              />
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
              />
              <p className="mt-1 text-xs text-gray-500">Rental income, dividends, etc.</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Total Annual Income:</span>
                <span className="text-lg font-bold text-green-600">
                  ₹{totalAnnualIncome.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Calculated as: (Monthly Income × 12) + (Other Income × 12)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Income Document Upload (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Upload salary slips or ITR for automatic income validation
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/rm/applications/${id}/documents`)}
            >
              Upload Documents
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Documents can be uploaded and parsed later
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/rm/applications/${id}/personal`)}
          >
            ← Previous
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                const values = watch();
                await onSubmit(values as EmploymentForm);
              }}
              disabled={loading || !isDirty}
            >
              Save as Draft
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save & Continue'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

