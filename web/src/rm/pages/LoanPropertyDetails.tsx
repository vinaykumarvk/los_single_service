/**
 * RM Loan & Property Details Page
 * Record loan amount, property details, and purpose
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

const loanPropertySchema = z.object({
  loanType: z.enum(['Home Loan', 'Balance Transfer', 'Top-up'], { 
    required_error: 'Loan type is required',
    invalid_type_error: 'Please select a loan type'
  }),
  requestedAmount: z.string()
    .min(1, 'Loan amount is required')
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, 'Loan amount must be a positive number')
    .refine((val) => {
      const num = parseFloat(val);
      return num >= 100000;
    }, 'Loan amount must be at least ₹1,00,000')
    .refine((val) => {
      const num = parseFloat(val);
      return num <= 100000000; // 10 crores max
    }, 'Loan amount must not exceed ₹10,00,00,000'),
  tenureYears: z.string()
    .min(1, 'Tenure is required')
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 1 && num <= 30;
    }, 'Tenure must be between 1 and 30 years'),
  propertyType: z.enum(['Flat', 'Plot', 'House', 'Under Construction'], { 
    required_error: 'Property type is required',
    invalid_type_error: 'Please select a property type'
  }),
  builderName: z.string()
    .max(200, 'Builder name must not exceed 200 characters')
    .optional(),
  projectName: z.string()
    .max(200, 'Project name must not exceed 200 characters')
    .optional(),
  propertyValue: z.string()
    .refine((val) => {
      if (!val || val === '') return true; // Optional
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, 'Property value must be a positive number')
    .optional(),
  propertyAddress: z.string()
    .max(500, 'Property address must not exceed 500 characters')
    .optional(),
  propertyPincode: z.string()
    .regex(/^[0-9]{6}$/, 'Property PIN code must be exactly 6 digits')
    .optional()
    .or(z.literal('')),
  propertyCity: z.string()
    .max(100, 'Property city must not exceed 100 characters')
    .optional(),
  propertyState: z.string()
    .max(100, 'Property state must not exceed 100 characters')
    .optional(),
});

type LoanPropertyForm = z.infer<typeof loanPropertySchema>;

export default function RMLoanPropertyDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToastHook();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [states, setStates] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<LoanPropertyForm>({
    resolver: zodResolver(loanPropertySchema),
  });

  const requestedAmount = watch('requestedAmount');
  const tenureYears = watch('tenureYears');
  const loanType = watch('loanType');

  // Calculate EMI estimate (simplified)
  const emiEstimate = useMemo(() => {
    const principal = parseFloat(requestedAmount || '0');
    const years = parseFloat(tenureYears || '0');
    if (principal === 0 || years === 0) return 0;
    
    // Simplified EMI calculation (assuming 8.5% interest rate)
    const rate = 8.5 / 100 / 12; // Monthly interest rate
    const months = years * 12;
    if (rate === 0) return principal / months;
    
    const emi = (principal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
    return emi;
  }, [requestedAmount, tenureYears]);

  useEffect(() => {
    loadExistingData();
    loadStates();
  }, [id]);

  const loadStates = async () => {
    try {
      const response = await rmAPI.masters.branches();
      if (response.data?.branches) {
        const uniqueStates = [...new Set(response.data.branches.map((b: any) => b.state).filter(Boolean))] as string[];
        setStates(uniqueStates.sort());
      }
    } catch {
      setStates(['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Gujarat']);
    }
  };

  const loadExistingData = async () => {
    if (!id) return;

    try {
      setFetching(true);
      
      // Load application data
      const appResponse = await rmAPI.applications.get(id);
      if (appResponse.data) {
        const app = appResponse.data;
        setValue('loanType', 'Home Loan' as any); // Default to Home Loan
        setValue('requestedAmount', app.requested_amount?.toString() || '');
        setValue('tenureYears', app.requested_tenure_months ? (app.requested_tenure_months / 12).toString() : '');
      }

      // Load property data
      try {
        const propResponse = await rmAPI.property.get(id);
        if (propResponse.data) {
          const prop = propResponse.data;
          setValue('propertyType', prop.property_type as any);
          setValue('builderName', prop.builder_name || '');
          setValue('projectName', prop.project_name || '');
          setValue('propertyValue', prop.property_value?.toString() || '');
          setValue('propertyAddress', prop.property_address || '');
          setValue('propertyPincode', prop.property_pincode || '');
          setValue('propertyCity', prop.property_city || '');
          setValue('propertyState', prop.property_state || '');
        }
      } catch {
        // Property data may not exist yet
      }
    } catch (err: any) {
      console.error('Failed to load loan/property data:', err);
      addToast({
        type: 'error',
        message: 'Failed to load loan/property data',
      });
    } finally {
      setFetching(false);
    }
  };

  const onSubmit = async (data: LoanPropertyForm) => {
    if (!id) {
      addToast({
        type: 'error',
        message: 'Application ID is missing',
      });
      return;
    }

    try {
      setLoading(true);

      // Update application with loan details
      await rmAPI.applications.update(id, {
        productCode: data.loanType === 'Home Loan' ? 'HOME_LOAN_V1' : 'PERSONAL_LOAN_V1',
        requestedAmount: parseFloat(data.requestedAmount),
        requestedTenureMonths: Math.round(parseFloat(data.tenureYears) * 12),
      });

      // Update/create property details
      if (data.propertyType) {
        await rmAPI.property.createOrUpdate(id, {
          propertyType: data.propertyType,
          builderName: data.builderName,
          projectName: data.projectName,
          propertyValue: data.propertyValue ? parseFloat(data.propertyValue) : undefined,
          propertyAddress: data.propertyAddress,
          propertyPincode: data.propertyPincode,
          propertyCity: data.propertyCity,
          propertyState: data.propertyState,
        });
      }

      addToast({
        type: 'success',
        message: 'Loan & property details saved successfully',
      });

      navigate(`/rm/applications/${id}/documents`);
    } catch (err: any) {
      console.error('Failed to save loan/property details:', err);
      addToast({
        type: 'error',
        message: err.message || 'Failed to save loan/property details',
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
          <h1 className="text-2xl font-bold text-gray-900">Loan & Property Details</h1>
          <p className="text-sm text-gray-500 mt-1">Record loan requirements and property information</p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/rm/applications/${id}/employment`)}>
          ← Back
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Loan Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loan Type *
              </label>
              <select
                {...register('loanType')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Loan Type</option>
                <option value="Home Loan">Home Loan</option>
                <option value="Balance Transfer">Balance Transfer</option>
                <option value="Top-up">Top-up</option>
              </select>
              {errors.loanType && (
                <p className="mt-1 text-sm text-red-600">{errors.loanType.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Loan Amount Required (₹) *"
                  type="number"
                  {...register('requestedAmount')}
                  error={errors.requestedAmount?.message}
                  placeholder="5000000"
                  min="100000"
                  step="100000"
                />
              </div>
              <div>
                <Input
                  label="Tenure (Years) *"
                  type="number"
                  {...register('tenureYears')}
                  error={errors.tenureYears?.message}
                  placeholder="20"
                  min="1"
                  max="30"
                />
                <p className="mt-1 text-xs text-gray-500">Range: 1-30 years</p>
              </div>
            </div>

            {requestedAmount && tenureYears && emiEstimate > 0 && (
              <div className="bg-blue-50 p-4 rounded-md">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Estimated EMI:</span>
                  <span className="text-lg font-bold text-blue-600">
                    ₹{Math.round(emiEstimate).toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  * Based on 8.5% interest rate (approximate)
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {loanType === 'Home Loan' && (
          <Card>
            <CardHeader>
              <CardTitle>Property Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Type *
                </label>
                <select
                  {...register('propertyType')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Property Type</option>
                  <option value="Flat">Flat</option>
                  <option value="Plot">Plot</option>
                  <option value="House">House</option>
                  <option value="Under Construction">Under Construction</option>
                </select>
                {errors.propertyType && (
                  <p className="mt-1 text-sm text-red-600">{errors.propertyType.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Builder Name"
                    {...register('builderName')}
                    error={errors.builderName?.message}
                    placeholder="ABC Builders"
                  />
                </div>
                <div>
                  <Input
                    label="Project Name"
                    {...register('projectName')}
                    error={errors.projectName?.message}
                    placeholder="ABC Heights"
                  />
                </div>
              </div>

              <div>
                <Input
                  label="Property Value (₹)"
                  type="number"
                  {...register('propertyValue')}
                  error={errors.propertyValue?.message}
                  placeholder="10000000"
                  min="0"
                  step="100000"
                />
              </div>

              <div>
                <Input
                  label="Property Address"
                  {...register('propertyAddress')}
                  error={errors.propertyAddress?.message}
                  placeholder="123 Property Street"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property State
                  </label>
                  <select
                    {...register('propertyState')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select State</option>
                    {states.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Input
                    label="Property City"
                    {...register('propertyCity')}
                    error={errors.propertyCity?.message}
                    placeholder="Mumbai"
                  />
                </div>
                <div>
                  <Input
                    label="Property PIN Code"
                    {...register('propertyPincode')}
                    error={errors.propertyPincode?.message}
                    placeholder="400001"
                    maxLength={6}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/rm/applications/${id}/employment`)}
          >
            ← Previous
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                const values = watch();
                await onSubmit(values as LoanPropertyForm);
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

