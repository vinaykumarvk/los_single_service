/**
 * Step 3: Employment Details
 * Captures employment and income information and auto-saves on Next
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Loader2, Briefcase, DollarSign } from 'lucide-react';
import { rmAPI } from '../../lib/api';

const employmentSchema = z.object({
  employmentType: z.enum(['Salaried', 'Self-employed'], { required_error: 'Employment type is required' }),
  employerName: z.string().max(200).optional(),
  businessName: z.string().max(200).optional(),
  monthlyIncome: z.string()
    .min(1, 'Monthly income is required')
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0 && num >= 10000;
    }, 'Monthly income must be at least ₹10,000'),
  yearsInJob: z.string().optional(),
  otherIncomeSources: z.string().optional(),
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

interface EmploymentDetailsStepProps {
  applicationId: string;
  onNext: (data: any) => void | Promise<void>;
  onPrevious: () => void;
  loading: boolean;
}

export default function EmploymentDetailsStep({ applicationId, onNext, onPrevious, loading, showPropertyStep = true }: EmploymentDetailsStepProps) {
  const [fetching, setFetching] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EmploymentForm>({
    resolver: zodResolver(employmentSchema),
  });

  const employmentType = watch('employmentType');
  const monthlyIncome = watch('monthlyIncome');
  const otherIncomeSources = watch('otherIncomeSources');

  const totalAnnualIncome = (parseFloat(monthlyIncome || '0') + parseFloat(otherIncomeSources || '0')) * 12;

  useEffect(() => {
    loadExistingData();
  }, [applicationId]);

  const loadExistingData = async () => {
    try {
      setFetching(true);
      const response = await rmAPI.applicants.get(applicationId);
      if (response.data) {
        const applicant = response.data;
        setValue('employmentType', applicant.employment_type as any);
        setValue('employerName', applicant.employer_name || '');
        setValue('businessName', applicant.business_name || '');
        setValue('monthlyIncome', applicant.monthly_income?.toString() || '');
        setValue('yearsInJob', applicant.years_in_job?.toString() || '');
        setValue('otherIncomeSources', applicant.other_income_sources?.toString() || '');
      }
    } catch (err) {
      console.error('Failed to load employment data:', err);
    } finally {
      setFetching(false);
    }
  };

  const onSubmit = async (data: EmploymentForm) => {
    await onNext(data);
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Employment Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-600" />
            <CardTitle>Employment Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Employment Type *</label>
            <select
              {...register('employmentType')}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Employment Type</option>
              <option value="Salaried">Salaried</option>
              <option value="Self-employed">Self-employed</option>
            </select>
            {errors.employmentType && <p className="mt-1 text-sm text-red-600">{errors.employmentType.message}</p>}
          </div>

          {employmentType === 'Salaried' && (
            <Input
              label="Employer/Organization Name *"
              {...register('employerName')}
              error={errors.employerName?.message}
            />
          )}

          {employmentType === 'Self-employed' && (
            <Input
              label="Business Name"
              {...register('businessName')}
              error={errors.businessName?.message}
            />
          )}

          <Input
            label="Years in Current Job"
            type="number"
            {...register('yearsInJob')}
            error={errors.yearsInJob?.message}
            min="0"
            max="50"
          />
        </CardContent>
      </Card>

      {/* Income Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <CardTitle>Income Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Monthly Income (₹) *"
            type="number"
            {...register('monthlyIncome')}
            error={errors.monthlyIncome?.message}
            placeholder="50000"
            min="10000"
          />
          <Input
            label="Other Income Sources (Monthly ₹)"
            type="number"
            {...register('otherIncomeSources')}
            error={errors.otherIncomeSources?.message}
            placeholder="10000"
            min="0"
          />

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Annual Income:</span>
              <span className="text-lg font-bold text-green-600">
                ₹{totalAnnualIncome.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onPrevious} disabled={loading}>
          Previous
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            showPropertyStep ? 'Next: Property Details' : 'Next: Review & Submit'
          )}
        </Button>
      </div>
    </form>
  );
}

