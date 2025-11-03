/**
 * RM Personal Information Page - Enhanced Mobile-First Design
 * Capture customer's personal details
 */

import { useEffect, useState } from 'react';
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
import { ArrowLeft, Save, FileText, User, MapPin, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';

const personalInfoSchema = z.object({
  firstName: z.string()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters')
    .regex(/^[A-Za-z\s]+$/, 'First name must contain only alphabets and spaces'),
  lastName: z.string()
    .min(1, 'Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must not exceed 50 characters')
    .regex(/^[A-Za-z\s]+$/, 'Last name must contain only alphabets and spaces'),
  dateOfBirth: z.string()
    .min(1, 'Date of birth is required')
    .refine((date) => {
      const dob = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        return age - 1 >= 18;
      }
      return age >= 18;
    }, 'Applicant must be at least 18 years old')
    .refine((date) => {
      const dob = new Date(date);
      return dob < new Date();
    }, 'Date of birth cannot be in the future'),
  gender: z.enum(['Male', 'Female', 'Other'], { 
    required_error: 'Gender is required',
    invalid_type_error: 'Please select a valid gender'
  }),
  maritalStatus: z.enum(['Single', 'Married', 'Divorced', 'Widowed'], {
    invalid_type_error: 'Please select a valid marital status'
  })
    .or(z.literal('')),
  mobile: z.string()
    .min(1, 'Mobile number is required')
    .regex(/^[6-9]\d{9}$/, 'Mobile number must be 10 digits starting with 6-9'),
  email: z.string()
    .email('Invalid email address')
    .or(z.literal('')),
  addressLine1: z.string()
    .min(1, 'Address line 1 is required')
    .min(5, 'Address must be at least 5 characters')
    .max(200, 'Address must not exceed 200 characters'),
  addressLine2: z.string()
    .max(200, 'Address must not exceed 200 characters')
    .or(z.literal('')),
  pincode: z.string()
    .min(1, 'PIN code is required')
    .regex(/^\d{6}$/, 'PIN code must be 6 digits'),
  city: z.string()
    .min(1, 'City is required'),
  state: z.string()
    .min(1, 'State is required'),
  pan: z.string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'PAN must be in format ABCDE1234F')
    .or(z.literal('')),
});

type PersonalInfoForm = z.infer<typeof personalInfoSchema>;

export default function RMPersonalInformation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToastHook();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [cities, setCities] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
  } = useForm<PersonalInfoForm>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      gender: undefined,
    },
  });

  useEffect(() => {
    loadExistingData();
    loadMasters();
  }, [id]);

  const loadExistingData = async () => {
    if (!id) return;

    try {
      setFetching(true);
      const response = await rmAPI.applicants.get(id);
      if (response.data) {
        const applicant = response.data;
        setValue('firstName', applicant.first_name || '');
        setValue('lastName', applicant.last_name || '');
        setValue('dateOfBirth', applicant.date_of_birth || '');
        setValue('gender', applicant.gender as any);
        setValue('maritalStatus', applicant.marital_status as any);
        setValue('mobile', applicant.mobile || '');
        setValue('email', applicant.email || '');
        setValue('addressLine1', applicant.address_line1 || '');
        setValue('addressLine2', applicant.address_line2 || '');
        setValue('pincode', applicant.pincode || '');
        setValue('city', applicant.city || '');
        setValue('state', applicant.state || '');
        setValue('pan', applicant.pan || '');
      }
    } catch (err: any) {
      console.error('Failed to load applicant data:', err);
      addToast({
        type: 'error',
        message: 'Failed to load applicant data',
      });
    } finally {
      setFetching(false);
    }
  };

  const loadMasters = async () => {
    try {
      const response = await rmAPI.masters.branches();
      if (response.data?.branches) {
        const uniqueStates = [...new Set(response.data.branches.map((b: any) => b.state).filter(Boolean))] as string[];
        const uniqueCities = [...new Set(response.data.branches.map((b: any) => b.city).filter(Boolean))] as string[];
        setStates(uniqueStates.sort());
        setCities(uniqueCities.sort());
      }
    } catch (err) {
      setStates(['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Gujarat']);
      setCities(['Mumbai', 'Bangalore', 'Chennai', 'Delhi', 'Ahmedabad']);
    }
  };

  const onSubmit = async (data: PersonalInfoForm) => {
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
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        maritalStatus: data.maritalStatus,
        mobile: data.mobile,
        email: data.email,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        pincode: data.pincode,
        city: data.city,
        state: data.state,
        pan: data.pan,
      });
      
      addToast({
        type: 'success',
        message: 'Personal information saved successfully',
      });
      
      navigate(`/rm/applications/${id}/employment`);
    } catch (err: any) {
      console.error('Failed to save personal information:', err);
      addToast({
        type: 'error',
        message: err.message || 'Failed to save personal information',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedState = watch('state');

  useEffect(() => {
    if (selectedState) {
      loadMasters();
    }
  }, [selectedState]);

  // Calculate form completion percentage
  const formData = watch();
  const completionPercentage = () => {
    const requiredFields = [
      'firstName', 'lastName', 'dateOfBirth', 'gender', 'mobile',
      'addressLine1', 'pincode', 'city', 'state'
    ];
    const filledFields = requiredFields.filter(field => {
      const value = formData[field as keyof PersonalInfoForm];
      return value && value !== '';
    }).length;
    return Math.round((filledFields / requiredFields.length) * 100);
  };

  if (fetching) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-4 sm:space-y-6 animate-fade-in safe-area-inset">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Personal Information
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Step 1 of 4: Capture customer's personal details
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(`/rm/applications/${id}`)}
          className="w-full sm:w-auto touch-manipulation min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
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
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <CardTitle>Basic Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="First Name *"
                  {...register('firstName')}
                  error={errors.firstName?.message}
                  className="touch-manipulation"
                />
              </div>
              <div>
                <Input
                  label="Last Name *"
                  {...register('lastName')}
                  error={errors.lastName?.message}
                  className="touch-manipulation"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date of Birth *
                </label>
                <Input
                  type="date"
                  {...register('dateOfBirth')}
                  error={errors.dateOfBirth?.message}
                  className="touch-manipulation min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gender *
                </label>
                <select
                  {...register('gender')}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white touch-manipulation min-h-[44px]"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {errors.gender && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.gender.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Marital Status
              </label>
              <select
                {...register('maritalStatus')}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white touch-manipulation min-h-[44px]"
              >
                <option value="">Select Marital Status</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
              <CardTitle>Contact Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Mobile Number *"
                  {...register('mobile')}
                  error={errors.mobile?.message}
                  placeholder="9876543210"
                  maxLength={10}
                  inputMode="numeric"
                  className="touch-manipulation"
                />
              </div>
              <div>
                <Input
                  label="Email ID"
                  type="email"
                  {...register('email')}
                  error={errors.email?.message}
                  placeholder="customer@example.com"
                  inputMode="email"
                  className="touch-manipulation"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <CardTitle>Address Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                label="Address Line 1 *"
                {...register('addressLine1')}
                error={errors.addressLine1?.message}
                className="touch-manipulation"
              />
            </div>
            <div>
              <Input
                label="Address Line 2"
                {...register('addressLine2')}
                error={errors.addressLine2?.message}
                className="touch-manipulation"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  State *
                </label>
                <select
                  {...register('state')}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white touch-manipulation min-h-[44px]"
                >
                  <option value="">Select State</option>
                  {states.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                {errors.state && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.state.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  City *
                </label>
                <select
                  {...register('city')}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white touch-manipulation min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!selectedState}
                >
                  <option value="">Select City</option>
                  {cities
                    .filter((city) => true)
                    .map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                </select>
                {errors.city && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.city.message}
                  </p>
                )}
              </div>
              <div>
                <Input
                  label="PIN Code *"
                  {...register('pincode')}
                  error={errors.pincode?.message}
                  placeholder="400001"
                  maxLength={6}
                  inputMode="numeric"
                  className="touch-manipulation"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Identity Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <CardTitle>Identity Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                label="PAN Number"
                {...register('pan')}
                error={errors.pan?.message}
                placeholder="ABCDE1234F"
                maxLength={10}
                className="uppercase touch-manipulation"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Format: ABCDE1234F
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/rm/applications/${id}`)}
            className="w-full sm:w-auto touch-manipulation min-h-[44px]"
          >
            Cancel
          </Button>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                const values = watch();
                await onSubmit(values as PersonalInfoForm);
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
  );
}
