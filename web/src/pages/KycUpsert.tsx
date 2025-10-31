import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import api from '../lib/api';

const schema = z.object({
  applicantId: z.string().uuid('Invalid applicant ID'),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  dob: z.string().optional(),
  mobile: z.string().min(10),
  email: z.string().email(),
  pan: z.string().min(10),
  aadhaarMasked: z.string().min(4)
});

type FormData = z.infer<typeof schema>;

export default function KycUpsert() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      applicantId: '3b1d23ce-1111-4444-8888-aaaaaaaaaaaa',
      firstName: 'Asha',
      lastName: 'Raj',
      mobile: '9123456780',
      email: 'asha@example.com',
      pan: 'ABCDE1234F',
      aadhaarMasked: '123456789012'
    }
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true); setError(null); setMessage(null);
    try {
      await api.kyc.put(`/applicants/${data.applicantId}`, {
        firstName: data.firstName,
        lastName: data.lastName,
        dob: data.dob,
        mobile: data.mobile,
        email: data.email,
        pan: data.pan,
        aadhaarMasked: data.aadhaarMasked
      });
      setMessage('Applicant upserted');
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Failed to upsert');
    } finally { setLoading(false); }
  };

  const consent = async (applicantId: string) => {
    setLoading(true); setError(null); setMessage(null);
    try {
      await api.kyc.post(`/applicants/${applicantId}/consent`, { purpose: 'KYC' });
      setMessage('Consent captured');
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Failed to capture consent');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">KYC - Applicant</h1>
      <Card>
        <CardHeader>
          <CardTitle>Applicant Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Applicant ID" {...register('applicantId')} error={errors.applicantId?.message} />
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <Input label="First Name" {...register('firstName')} error={errors.firstName?.message} />
              <Input label="Last Name" {...register('lastName')} error={errors.lastName?.message} />
            </div>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <Input label="Mobile" {...register('mobile')} error={errors.mobile?.message} />
              <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
            </div>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <Input label="PAN" {...register('pan')} error={errors.pan?.message} />
              <Input label="Aadhaar (masked)" {...register('aadhaarMasked')} error={errors.aadhaarMasked?.message} />
            </div>
            {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}
            {message && <div className="text-sm text-green-700 bg-green-50 p-3 rounded">{message}</div>}
            <div className="flex gap-3">
              <Button disabled={loading} type="submit">{loading ? 'Saving…' : 'Save Applicant'}</Button>
              <Button disabled={loading} type="button" variant="outline" onClick={() => consent((document.querySelector('input[name="applicantId"]') as HTMLInputElement)?.value)}>Capture Consent</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


