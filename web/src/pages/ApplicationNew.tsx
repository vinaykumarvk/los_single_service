import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import api from '../lib/api';

const schema = z.object({
  applicantId: z.string().uuid('Invalid applicant ID format'),
  channel: z.string().min(1, 'Channel is required'),
  productCode: z.string().min(1, 'Product code is required'),
  requestedAmount: z.number().positive('Amount must be positive'),
  requestedTenureMonths: z.number().int().positive('Tenure must be a positive integer'),
});

type FormData = z.infer<typeof schema>;

export default function ApplicationNew() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      applicantId: '3b1d23ce-1111-4444-8888-aaaaaaaaaaaa',
      channel: 'Online',
      productCode: 'HOME_LOAN_V1',
      requestedAmount: 800000,
      requestedTenureMonths: 120,
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.application.post('/applications', data);
      navigate(`/applications/${response.data.applicationId}`, {
        state: { application: response.data },
      });
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create New Application</h1>
      <Card>
        <CardHeader>
          <CardTitle>Application Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Applicant ID"
              type="text"
              {...register('applicantId')}
              error={errors.applicantId?.message}
            />
            <Input
              label="Channel"
              type="text"
              {...register('channel')}
              error={errors.channel?.message}
            />
            <Input
              label="Product Code"
              type="text"
              {...register('productCode')}
              error={errors.productCode?.message}
            />
            <Input
              label="Requested Amount (₹)"
              type="number"
              {...register('requestedAmount', { valueAsNumber: true })}
              error={errors.requestedAmount?.message}
            />
            <Input
              label="Requested Tenure (months)"
              type="number"
              {...register('requestedTenureMonths', { valueAsNumber: true })}
              error={errors.requestedTenureMonths?.message}
            />
            {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}
            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Application'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/applications')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

