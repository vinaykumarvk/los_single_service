import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import api from '../lib/api';
import { Calculator, CreditCard, CheckCircle } from 'lucide-react';

const calculateSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  config: z.object({
    type: z.enum(['percent', 'fixed']),
    percent: z.number().min(0).max(100).optional(),
    fixed: z.number().min(0).optional(),
    min: z.number().min(0).optional(),
  }),
});

const captureSchema = z.object({
  fee: z.number().positive('Fee must be positive'),
  currency: z.string().default('INR'),
});

type CalculateFormData = z.infer<typeof calculateSchema>;
type CaptureFormData = z.infer<typeof captureSchema>;

export default function Payments() {
  const { id: applicationId } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculatedFee, setCalculatedFee] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const {
    register: registerCalculate,
    handleSubmit: handleCalculateSubmit,
    formState: { errors: calculateErrors },
  } = useForm<CalculateFormData>({
    resolver: zodResolver(calculateSchema),
    defaultValues: {
      amount: 750000,
      config: {
        type: 'percent',
        percent: 1.0,
        min: 2500,
      },
    },
  });

  const {
    register: registerCapture,
    handleSubmit: handleCaptureSubmit,
    formState: { errors: captureErrors },
    setValue: setCaptureValue,
  } = useForm<CaptureFormData>({
    resolver: zodResolver(captureSchema),
    defaultValues: {
      fee: 0,
      currency: 'INR',
    },
  });

  const onCalculate = async (data: CalculateFormData) => {
    if (!applicationId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.payments.post(
        `/applications/${applicationId}/fees/calculate`,
        data
      );
      const fee = response.data.fee || response.data.calculatedFee || 0;
      setCalculatedFee(fee);
      setCaptureValue('fee', fee);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Fee calculation failed');
    } finally {
      setLoading(false);
    }
  };

  const onCapture = async (data: CaptureFormData) => {
    if (!applicationId) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await api.payments.post(`/applications/${applicationId}/fees/capture`, data);
      setMessage('Payment captured successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Payment capture failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Payment Management</h1>
      {applicationId && <p className="text-gray-600">Application ID: {applicationId}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Calculate Processing Fee</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCalculateSubmit(onCalculate)} className="space-y-4">
            <Input
              label="Loan Amount (₹)"
              type="number"
              {...registerCalculate('amount', { valueAsNumber: true })}
              error={calculateErrors.amount?.message}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fee Type
                </label>
                <select
                  {...registerCalculate('config.type')}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="percent">Percentage</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>
              <Input
                label="Percentage (%)"
                type="number"
                step="0.01"
                {...registerCalculate('config.percent', { valueAsNumber: true })}
                error={calculateErrors.config?.percent?.message}
              />
            </div>
            <Input
              label="Minimum Fee (₹)"
              type="number"
              {...registerCalculate('config.min', { valueAsNumber: true })}
              error={calculateErrors.config?.min?.message}
            />
            {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}
            <Button disabled={loading || !applicationId} type="submit">
              <Calculator className="mr-2 h-4 w-4" />
              {loading ? 'Calculating...' : 'Calculate Fee'}
            </Button>
          </form>
          {calculatedFee !== null && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Calculated Fee</p>
              <p className="text-2xl font-bold text-blue-600">₹{calculatedFee.toLocaleString()}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Capture Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCaptureSubmit(onCapture)} className="space-y-4">
            <Input
              label="Fee Amount (₹)"
              type="number"
              {...registerCapture('fee', { valueAsNumber: true })}
              error={captureErrors.fee?.message}
            />
            <Input
              label="Currency"
              type="text"
              {...registerCapture('currency')}
              error={captureErrors.currency?.message}
              readOnly
            />
            {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}
            {message && (
              <div className="text-sm text-green-700 bg-green-50 p-3 rounded">{message}</div>
            )}
            <Button disabled={loading || !applicationId} type="submit">
              <CreditCard className="mr-2 h-4 w-4" />
              {loading ? 'Capturing...' : 'Capture Payment'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

