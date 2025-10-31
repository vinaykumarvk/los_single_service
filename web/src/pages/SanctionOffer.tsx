import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import api from '../lib/api';
import { FileCheck, Handshake, CheckCircle, DollarSign } from 'lucide-react';

const sanctionSchema = z.object({
  sanctionedAmount: z.number().positive('Amount must be positive'),
  tenureMonths: z.number().int().positive('Tenure must be a positive integer'),
  rateAnnual: z.number().positive('Rate must be positive'),
});

const acceptSchema = z.object({
  sanctionId: z.string().uuid('Invalid sanction ID'),
});

type SanctionFormData = z.infer<typeof sanctionSchema>;
type AcceptFormData = z.infer<typeof acceptSchema>;

interface Sanction {
  sanctionId: string;
  sanctionedAmount: number;
  tenureMonths: number;
  rateAnnual: number;
  emi: number;
  status: string;
  offerUrl?: string;
}

export default function SanctionOffer() {
  const { id: applicationId } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sanction, setSanction] = useState<Sanction | null>(null);
  const [showAccept, setShowAccept] = useState(false);

  const {
    register: registerSanction,
    handleSubmit: handleSanctionSubmit,
    formState: { errors: sanctionErrors },
  } = useForm<SanctionFormData>({
    resolver: zodResolver(sanctionSchema),
    defaultValues: {
      sanctionedAmount: 750000,
      tenureMonths: 120,
      rateAnnual: 11.25,
    },
  });

  const {
    register: registerAccept,
    handleSubmit: handleAcceptSubmit,
    formState: { errors: acceptErrors },
  } = useForm<AcceptFormData>({
    resolver: zodResolver(acceptSchema),
  });

  const onSanctionSubmit = async (data: SanctionFormData) => {
    if (!applicationId) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await api.sanction.post(`/applications/${applicationId}/sanction`, data);
      setSanction(response.data);
      setShowAccept(true);
      setMessage('Sanction issued successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to issue sanction');
    } finally {
      setLoading(false);
    }
  };

  const onAcceptSubmit = async (data: AcceptFormData) => {
    if (!applicationId) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await api.sanction.post(`/applications/${applicationId}/offer/accept`, {
        sanctionId: data.sanctionId,
      });
      setMessage('Offer accepted successfully');
      setShowAccept(false);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to accept offer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Sanction & Offer Management</h1>
      {applicationId && <p className="text-gray-600">Application ID: {applicationId}</p>}

      {!sanction && (
        <Card>
          <CardHeader>
            <CardTitle>Issue Sanction</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSanctionSubmit(onSanctionSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Input
                  label="Sanctioned Amount (₹)"
                  type="number"
                  {...registerSanction('sanctionedAmount', { valueAsNumber: true })}
                  error={sanctionErrors.sanctionedAmount?.message}
                />
                <Input
                  label="Tenure (months)"
                  type="number"
                  {...registerSanction('tenureMonths', { valueAsNumber: true })}
                  error={sanctionErrors.tenureMonths?.message}
                />
                <Input
                  label="Annual Rate (%)"
                  type="number"
                  step="0.01"
                  {...registerSanction('rateAnnual', { valueAsNumber: true })}
                  error={sanctionErrors.rateAnnual?.message}
                />
              </div>
              {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}
              {message && <div className="text-sm text-green-700 bg-green-50 p-3 rounded">{message}</div>}
              <Button disabled={loading || !applicationId} type="submit">
                <FileCheck className="mr-2 h-4 w-4" />
                {loading ? 'Issuing...' : 'Issue Sanction'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {sanction && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Sanction Details</CardTitle>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-semibold">{sanction.status}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-500">Sanction ID</p>
                  <p className="text-lg font-semibold">{sanction.sanctionId.slice(0, 8)}...</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Sanctioned Amount</p>
                  <p className="text-lg font-semibold">
                    ₹{sanction.sanctionedAmount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tenure</p>
                  <p className="text-lg font-semibold">{sanction.tenureMonths} months</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Annual Rate</p>
                  <p className="text-lg font-semibold">{sanction.rateAnnual}%</p>
                </div>
                {sanction.emi && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500">EMI</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ₹{sanction.emi.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {showAccept && (
            <Card>
              <CardHeader>
                <CardTitle>Accept Offer</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAcceptSubmit(onAcceptSubmit)} className="space-y-4">
                  <Input
                    label="Sanction ID"
                    value={sanction.sanctionId}
                    {...registerAccept('sanctionId')}
                    readOnly
                    error={acceptErrors.sanctionId?.message}
                  />
                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>
                  )}
                  {message && (
                    <div className="text-sm text-green-700 bg-green-50 p-3 rounded">
                      {message}
                    </div>
                  )}
                  <Button disabled={loading || !applicationId} type="submit">
                    <Handshake className="mr-2 h-4 w-4" />
                    {loading ? 'Accepting...' : 'Accept Offer'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

