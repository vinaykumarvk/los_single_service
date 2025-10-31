import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import api from '../lib/api';
import { Calculator, CheckCircle, XCircle } from 'lucide-react';

const schema = z.object({
  monthlyIncome: z.number().positive('Monthly income must be positive'),
  existingEmi: z.number().min(0, 'EMI cannot be negative'),
  proposedAmount: z.number().positive('Amount must be positive'),
  tenureMonths: z.number().int().positive('Tenure must be a positive integer'),
  annualRate: z.number().positive('Rate must be positive'),
  propertyValue: z.number().positive('Property value must be positive'),
  applicantAgeYears: z.number().int().positive('Age must be a positive integer'),
  product: z.object({
    maxFOIR: z.number().min(0).max(1),
    maxLTV: z.number().min(0).max(1),
    maxAgeAtMaturity: z.number().int().positive(),
  }),
});

type FormData = z.infer<typeof schema>;

interface UnderwritingResult {
  decision: string;
  reasons: string[];
  metrics?: {
    foir?: number;
    ltv?: number;
    ageAtMaturity?: number;
  };
}

export default function Underwriting() {
  const { id: applicationId } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UnderwritingResult | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      monthlyIncome: 120000,
      existingEmi: 5000,
      proposedAmount: 800000,
      tenureMonths: 120,
      annualRate: 12,
      propertyValue: 1100000,
      applicantAgeYears: 32,
      product: {
        maxFOIR: 0.5,
        maxLTV: 0.8,
        maxAgeAtMaturity: 70,
      },
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!applicationId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await api.underwriting.post(`/applications/${applicationId}/underwrite`, data);
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Underwriting failed');
    } finally {
      setLoading(false);
    }
  };

  const getDecisionIcon = (decision: string) => {
    if (decision.toUpperCase().includes('APPROVED') || decision.toUpperCase().includes('ACCEPT'))
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (decision.toUpperCase().includes('REJECT') || decision.toUpperCase().includes('DECLINE'))
      return <XCircle className="h-5 w-5 text-red-500" />;
    return null;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Underwriting Review</h1>
      {applicationId && <p className="text-gray-600">Application ID: {applicationId}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Financial Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Monthly Income (₹)"
                type="number"
                {...register('monthlyIncome', { valueAsNumber: true })}
                error={errors.monthlyIncome?.message}
              />
              <Input
                label="Existing EMI (₹)"
                type="number"
                {...register('existingEmi', { valueAsNumber: true })}
                error={errors.existingEmi?.message}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Proposed Loan Amount (₹)"
                type="number"
                {...register('proposedAmount', { valueAsNumber: true })}
                error={errors.proposedAmount?.message}
              />
              <Input
                label="Property Value (₹)"
                type="number"
                {...register('propertyValue', { valueAsNumber: true })}
                error={errors.propertyValue?.message}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label="Tenure (months)"
                type="number"
                {...register('tenureMonths', { valueAsNumber: true })}
                error={errors.tenureMonths?.message}
              />
              <Input
                label="Annual Rate (%)"
                type="number"
                step="0.01"
                {...register('annualRate', { valueAsNumber: true })}
                error={errors.annualRate?.message}
              />
              <Input
                label="Applicant Age (years)"
                type="number"
                {...register('applicantAgeYears', { valueAsNumber: true })}
                error={errors.applicantAgeYears?.message}
              />
            </div>
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-base">Product Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <Input
                    label="Max FOIR"
                    type="number"
                    step="0.01"
                    {...register('product.maxFOIR', { valueAsNumber: true })}
                    error={errors.product?.maxFOIR?.message}
                  />
                  <Input
                    label="Max LTV"
                    type="number"
                    step="0.01"
                    {...register('product.maxLTV', { valueAsNumber: true })}
                    error={errors.product?.maxLTV?.message}
                  />
                  <Input
                    label="Max Age at Maturity"
                    type="number"
                    {...register('product.maxAgeAtMaturity', { valueAsNumber: true })}
                    error={errors.product?.maxAgeAtMaturity?.message}
                  />
                </div>
              </CardContent>
            </Card>
            {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}
            <Button disabled={loading || !applicationId} type="submit">
              <Calculator className="mr-2 h-4 w-4" />
              {loading ? 'Processing...' : 'Run Underwriting'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Underwriting Result</CardTitle>
              <div className="flex items-center gap-2">
                {getDecisionIcon(result.decision)}
                <span className="font-semibold">{result.decision}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.metrics && (
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-gray-500">FOIR</p>
                  <p className="text-lg font-semibold">
                    {result.metrics.foir ? (result.metrics.foir * 100).toFixed(2) : '-'}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">LTV</p>
                  <p className="text-lg font-semibold">
                    {result.metrics.ltv ? (result.metrics.ltv * 100).toFixed(2) : '-'}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Age at Maturity</p>
                  <p className="text-lg font-semibold">{result.metrics.ageAtMaturity || '-'} years</p>
                </div>
              </div>
            )}
            {result.reasons && result.reasons.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Reasons:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {result.reasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

