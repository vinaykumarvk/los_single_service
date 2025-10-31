import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import api from '../lib/api';
import { Send, CheckCircle, Clock, XCircle } from 'lucide-react';

const schema = z.object({
  amount: z.number().positive('Amount must be positive'),
  beneficiaryAccount: z.string().min(6, 'Account number must be at least 6 characters'),
  ifsc: z.string().min(4, 'IFSC must be at least 4 characters'),
});

type FormData = z.infer<typeof schema>;

interface DisbursementResult {
  disbursementId: string;
  status: string;
  message?: string;
}

export default function Disbursement() {
  const { id: applicationId } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DisbursementResult | null>(null);
  const [idempotencyKey] = useState(() => `idemp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: 750000,
      beneficiaryAccount: '001122334455',
      ifsc: 'HDFC0001234',
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!applicationId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await api.disbursement.post(`/applications/${applicationId}/disburse`, data, {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      });
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Disbursement request failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'DISBURSED' || status === 'SUCCESS')
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (status === 'FAILED' || status === 'REJECTED')
      return <XCircle className="h-5 w-5 text-red-500" />;
    return <Clock className="h-5 w-5 text-yellow-500" />;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Disbursement</h1>
      {applicationId && <p className="text-gray-600">Application ID: {applicationId}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Request Disbursement</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Disbursement Amount (₹)"
              type="number"
              {...register('amount', { valueAsNumber: true })}
              error={errors.amount?.message}
            />
            <Input
              label="Beneficiary Account Number"
              type="text"
              {...register('beneficiaryAccount')}
              error={errors.beneficiaryAccount?.message}
            />
            <Input
              label="IFSC Code"
              type="text"
              {...register('ifsc')}
              error={errors.ifsc?.message}
            />
            <div className="p-3 bg-gray-50 rounded text-sm text-gray-600">
              <p className="font-medium">Idempotency Key: {idempotencyKey}</p>
              <p className="text-xs mt-1">This ensures duplicate requests are safely handled.</p>
            </div>
            {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}
            <Button disabled={loading || !applicationId} type="submit">
              <Send className="mr-2 h-4 w-4" />
              {loading ? 'Processing...' : 'Request Disbursement'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Disbursement Status</CardTitle>
              <div className="flex items-center gap-2">
                {getStatusIcon(result.status)}
                <span className="font-semibold">{result.status}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-500">Disbursement ID</p>
                <p className="font-medium">{result.disbursementId}</p>
              </div>
              {result.message && (
                <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-700">
                  {result.message}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

