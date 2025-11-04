/**
 * Step 2: Personal Details
 * Captures personal information and auto-saves on Next
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Loader2, User, MapPin, CreditCard } from 'lucide-react';
import { rmAPI } from '../../lib/api';

const personalInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required').min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(1, 'Last name is required').min(2, 'Last name must be at least 2 characters'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['Male', 'Female', 'Other'], { required_error: 'Gender is required' }),
  maritalStatus: z.enum(['Single', 'Married', 'Divorced', 'Widowed']).optional(),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Mobile number must be 10 digits starting with 6-9'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  addressLine1: z.string().min(1, 'Address line 1 is required').min(5, 'Address must be at least 5 characters'),
  addressLine2: z.string().optional(),
  pincode: z.string().regex(/^\d{6}$/, 'PIN code must be 6 digits'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'PAN must be in format ABCDE1234F').optional().or(z.literal('')),
});

type PersonalInfoForm = z.infer<typeof personalInfoSchema>;

interface PersonalDetailsStepProps {
  applicationId: string;
  onNext: (data: any) => void | Promise<void>;
  onPrevious: () => void;
  loading: boolean;
  productCode?: string;
}

export default function PersonalDetailsStep({ applicationId, onNext, onPrevious, loading }: PersonalDetailsStepProps) {
  const [fetching, setFetching] = useState(true);
  const [states] = useState(['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Gujarat', 'Punjab', 'Rajasthan']);
  const [cities] = useState(['Mumbai', 'Bangalore', 'Chennai', 'Delhi', 'Ahmedabad', 'Pune', 'Hyderabad']);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PersonalInfoForm>({
    resolver: zodResolver(personalInfoSchema),
  });

  const selectedState = watch('state');

  useEffect(() => {
    loadExistingData();
  }, [applicationId]);

  const loadExistingData = async () => {
    try {
      setFetching(true);
      const response = await rmAPI.applicants.get(applicationId);
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
    } catch (err) {
      console.error('Failed to load applicant data:', err);
    } finally {
      setFetching(false);
    }
  };

  const onSubmit = async (data: PersonalInfoForm) => {
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
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            <CardTitle>Basic Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="First Name *" {...register('firstName')} error={errors.firstName?.message} />
            <Input label="Last Name *" {...register('lastName')} error={errors.lastName?.message} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Date of Birth *</label>
              <Input type="date" {...register('dateOfBirth')} error={errors.dateOfBirth?.message} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Gender *</label>
              <select
                {...register('gender')}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {errors.gender && <p className="mt-1 text-sm text-red-600">{errors.gender.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Mobile Number *" {...register('mobile')} error={errors.mobile?.message} placeholder="9876543210" />
            <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
          </div>
        </CardContent>
      </Card>

      {/* Address Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-green-600" />
            <CardTitle>Address Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input label="Address Line 1 *" {...register('addressLine1')} error={errors.addressLine1?.message} />
          <Input label="Address Line 2" {...register('addressLine2')} error={errors.addressLine2?.message} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">State *</label>
              <select
                {...register('state')}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select State</option>
                {states.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
              {errors.state && <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">City *</label>
              <select
                {...register('city')}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select City</option>
                {cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>}
            </div>
            <Input label="PIN Code *" {...register('pincode')} error={errors.pincode?.message} maxLength={6} />
          </div>
        </CardContent>
      </Card>

      {/* Identity Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-orange-600" />
            <CardTitle>Identity Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Input label="PAN Number" {...register('pan')} error={errors.pan?.message} placeholder="ABCDE1234F" maxLength={10} className="uppercase" />
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
            'Next'
          )}
        </Button>
      </div>
    </form>
  );
}

