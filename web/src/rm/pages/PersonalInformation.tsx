/**
 * RM Personal Information Page
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
import Spinner from '../../components/ui/Spinner';
import { rmAPI } from '../lib/api';
import { useToast as useToastHook } from '../../components/ui/Toast';

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
  }).optional(),
  mobile: z.string()
    .min(1, 'Mobile number is required')
    .regex(/^[6-9][0-9]{9}$/, 'Mobile number must be 10 digits and start with 6, 7, 8, or 9'),
  email: z.string()
    .email('Please enter a valid email address (e.g., user@example.com)')
    .optional()
    .or(z.literal('')),
  addressLine1: z.string()
    .min(1, 'Address line 1 is required')
    .min(10, 'Address must be at least 10 characters')
    .max(500, 'Address must not exceed 500 characters'),
  addressLine2: z.string()
    .max(500, 'Address line 2 must not exceed 500 characters')
    .optional(),
  pincode: z.string()
    .min(1, 'PIN code is required')
    .regex(/^[0-9]{6}$/, 'PIN code must be exactly 6 digits (e.g., 400001)'),
  city: z.string()
    .min(1, 'City is required')
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City must not exceed 100 characters'),
  state: z.string()
    .min(1, 'State is required')
    .min(2, 'State must be at least 2 characters')
    .max(100, 'State must not exceed 100 characters'),
  pan: z.string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'PAN must be in format: ABCDE1234F (5 letters, 4 digits, 1 letter)')
    .optional()
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
      // Load branches to get cities/states
      const response = await rmAPI.masters.branches();
      if (response.data?.branches) {
        const uniqueStates = [...new Set(response.data.branches.map((b: any) => b.state).filter(Boolean))] as string[];
        const uniqueCities = [...new Set(response.data.branches.map((b: any) => b.city).filter(Boolean))] as string[];
        setStates(uniqueStates.sort());
        setCities(uniqueCities.sort());
      }
    } catch (err) {
      // Fallback to hardcoded states/cities if API fails
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
        email: data.email || undefined,
        addressLine1: data.addressLine1,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        pan: data.pan || undefined,
      });

      addToast({
        type: 'success',
        message: 'Personal information saved successfully',
      });

      // Navigate to next step
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

  // Filter cities based on selected state
  useEffect(() => {
    if (selectedState) {
      loadMasters();
    }
  }, [selectedState]);

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
          <h1 className="text-2xl font-bold text-gray-900">Personal Information</h1>
          <p className="text-sm text-gray-500 mt-1">Capture customer's personal details</p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/rm/applications/${id}`)}>
          ← Back
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="First Name *"
                  {...register('firstName')}
                  error={errors.firstName?.message}
                />
              </div>
              <div>
                <Input
                  label="Last Name *"
                  {...register('lastName')}
                  error={errors.lastName?.message}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth *
                </label>
                <Input
                  type="date"
                  {...register('dateOfBirth')}
                  error={errors.dateOfBirth?.message}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender *
                </label>
                <select
                  {...register('gender')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {errors.gender && (
                  <p className="mt-1 text-sm text-red-600">{errors.gender.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marital Status
                </label>
                <select
                  {...register('maritalStatus')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Marital Status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Mobile Number *"
                  {...register('mobile')}
                  error={errors.mobile?.message}
                  placeholder="9876543210"
                  maxLength={10}
                />
              </div>
              <div>
                <Input
                  label="Email ID"
                  type="email"
                  {...register('email')}
                  error={errors.email?.message}
                  placeholder="customer@example.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Address Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                label="Address Line 1 *"
                {...register('addressLine1')}
                error={errors.addressLine1?.message}
              />
            </div>
            <div>
              <Input
                label="Address Line 2"
                {...register('addressLine2')}
                error={errors.addressLine2?.message}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State *
                </label>
                <select
                  {...register('state')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select State</option>
                  {states.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                {errors.state && (
                  <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <select
                  {...register('city')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={!selectedState}
                >
                  <option value="">Select City</option>
                  {cities
                    .filter((city) => {
                      // Filter cities by selected state if we have that info
                      return true; // Show all cities for now
                    })
                    .map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                </select>
                {errors.city && (
                  <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                )}
              </div>
              <div>
                <Input
                  label="PIN Code *"
                  {...register('pincode')}
                  error={errors.pincode?.message}
                  placeholder="400001"
                  maxLength={6}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Identity Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                label="PAN Number"
                {...register('pan')}
                error={errors.pan?.message}
                placeholder="ABCDE1234F"
                maxLength={10}
                className="uppercase"
              />
              <p className="mt-1 text-xs text-gray-500">Format: ABCDE1234F</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/rm/applications/${id}`)}
          >
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                const values = watch();
                await onSubmit(values as PersonalInfoForm);
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

