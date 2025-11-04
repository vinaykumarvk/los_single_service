/**
 * Step 4: Property Details (Home Loans only)
 * Captures property information and auto-saves on Next
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Loader2, Home } from 'lucide-react';
import { rmAPI } from '../../lib/api';

const propertySchema = z.object({
  propertyType: z.enum(['Flat', 'Plot', 'House', 'Under Construction'], { required_error: 'Property type is required' }),
  builderName: z.string().max(200).optional(),
  projectName: z.string().max(200).optional(),
  propertyValue: z.string().optional(),
  propertyAddress: z.string().max(500).optional(),
  propertyPincode: z.string().regex(/^[0-9]{6}$/).optional().or(z.literal('')),
  propertyCity: z.string().max(100).optional(),
  propertyState: z.string().max(100).optional(),
});

type PropertyForm = z.infer<typeof propertySchema>;

interface PropertyDetailsStepProps {
  applicationId: string;
  onNext: (data: any) => void | Promise<void>;
  onPrevious: () => void;
  loading: boolean;
}

export default function PropertyDetailsStep({ applicationId, onNext, onPrevious, loading }: PropertyDetailsStepProps) {
  const [fetching, setFetching] = useState(true);
  const [states] = useState(['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Gujarat']);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<PropertyForm>({
    resolver: zodResolver(propertySchema),
  });

  useEffect(() => {
    loadExistingData();
  }, [applicationId]);

  const loadExistingData = async () => {
    try {
      setFetching(true);
      // Try to load property data if it exists
      try {
        const propResponse = await rmAPI.property.get(applicationId);
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
    } catch (err) {
      console.error('Failed to load property data:', err);
    } finally {
      setFetching(false);
    }
  };

  const onSubmit = async (data: PropertyForm) => {
    // Save property details
    try {
      await rmAPI.property.createOrUpdate(applicationId, {
        propertyType: data.propertyType,
        builderName: data.builderName,
        projectName: data.projectName,
        propertyValue: data.propertyValue ? parseFloat(data.propertyValue) : undefined,
        propertyAddress: data.propertyAddress,
        propertyPincode: data.propertyPincode,
        propertyCity: data.propertyCity,
        propertyState: data.propertyState,
      });
    } catch (err) {
      console.error('Failed to save property details:', err);
    }
    
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
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-green-600" />
            <CardTitle>Property Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Property Type *</label>
            <select
              {...register('propertyType')}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Property Type</option>
              <option value="Flat">Flat</option>
              <option value="Plot">Plot</option>
              <option value="House">House</option>
              <option value="Under Construction">Under Construction</option>
            </select>
            {errors.propertyType && <p className="mt-1 text-sm text-red-600">{errors.propertyType.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Builder Name" {...register('builderName')} error={errors.builderName?.message} />
            <Input label="Project Name" {...register('projectName')} error={errors.projectName?.message} />
          </div>

          <Input
            label="Property Value (₹)"
            type="number"
            {...register('propertyValue')}
            error={errors.propertyValue?.message}
            placeholder="5000000"
            min="0"
          />

          <Input label="Property Address" {...register('propertyAddress')} error={errors.propertyAddress?.message} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">State</label>
              <select
                {...register('propertyState')}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select State</option>
                {states.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            <Input label="City" {...register('propertyCity')} error={errors.propertyCity?.message} />
            <Input label="PIN Code" {...register('propertyPincode')} error={errors.propertyPincode?.message} maxLength={6} />
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
            'Next'
          )}
        </Button>
      </div>
    </form>
  );
}

