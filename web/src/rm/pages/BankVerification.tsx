/**
 * RM Bank Account Verification Page
 * Verify bank account details using penny drop or name verification
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
import ApplicationStepWrapper from '../components/ApplicationStepWrapper';

const bankVerificationSchema = z.object({
  accountNumber: z.string()
    .min(1, 'Account number is required')
    .regex(/^[0-9]{9,18}$/, 'Account number must be between 9 and 18 digits (numbers only)')
    .refine((val) => val.length >= 9 && val.length <= 18, 'Account number length must be between 9 and 18 digits'),
  ifsc: z.string()
    .min(1, 'IFSC code is required')
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'IFSC code must be in format: ABCD0123456 (4 uppercase letters, 0, 6 alphanumeric)')
    .length(11, 'IFSC code must be exactly 11 characters'),
  accountHolderName: z.string()
    .min(1, 'Account holder name is required')
    .min(2, 'Account holder name must be at least 2 characters')
    .max(200, 'Account holder name must not exceed 200 characters')
    .regex(/^[A-Za-z\s.]+$/, 'Account holder name must contain only alphabets, spaces, and dots'),
  bankName: z.string()
    .max(200, 'Bank name must not exceed 200 characters')
    .optional(),
  verificationMethod: z.enum(['name', 'pennyDrop'], { 
    required_error: 'Verification method is required',
    invalid_type_error: 'Please select a verification method'
  }),
});

type BankVerificationForm = z.infer<typeof bankVerificationSchema>;

interface VerificationResult {
  verified: boolean;
  method: 'name' | 'pennyDrop';
  accountHolderName?: string;
  bankName?: string;
  ifsc?: string;
  verifiedAt?: string;
  requestId?: string;
  message?: string;
}

export default function RMBankVerification() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToastHook();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [checkingPennyDrop, setCheckingPennyDrop] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BankVerificationForm>({
    resolver: zodResolver(bankVerificationSchema),
    defaultValues: {
      verificationMethod: 'name',
    },
  });

  const verificationMethod = watch('verificationMethod');
  const accountNumber = watch('accountNumber');
  const ifsc = watch('ifsc');

  useEffect(() => {
    loadExistingData();
  }, [id]);

  const loadExistingData = async () => {
    if (!id) return;

    try {
      setFetching(true);
      // Try to load existing bank verification data
      const applicantResponse = await rmAPI.applicants.get(id);
      if (applicantResponse.data) {
        const applicant = applicantResponse.data;
        setValue('accountHolderName', applicant.bank_account_holder_name || applicant.account_holder_name || '');
        setValue('accountNumber', applicant.bank_account_number || '');
        setValue('ifsc', applicant.bank_ifsc || '');
        setValue('bankName', applicant.bank_name || '');
      }
    } catch (err: any) {
      console.error('Failed to load bank data:', err);
    } finally {
      setFetching(false);
    }
  };

  const verifyName = async (data: BankVerificationForm) => {
    if (!id) return;

    try {
      setLoading(true);
      setVerificationResult(null);

      const response = await rmAPI.integrations.bank.verifyName(
        data.accountNumber,
        data.ifsc,
        data.accountHolderName
      );

      if (response.data) {
        const result: VerificationResult = {
          verified: response.data.verified || false,
          method: 'name',
          accountHolderName: response.data.accountHolderName || data.accountHolderName,
          bankName: response.data.bankName || data.bankName,
          ifsc: response.data.ifsc || data.ifsc,
          verifiedAt: new Date().toISOString(),
          message: response.data.message,
        };

        setVerificationResult(result);

        if (result.verified) {
          addToast({
            type: 'success',
            message: 'Bank account verified successfully',
          });

          // Save verified bank details (get existing applicant data first)
          const existingApplicant = await rmAPI.applicants.get(id);
          await rmAPI.applicants.update(id, {
            firstName: existingApplicant.data?.first_name || '',
            lastName: existingApplicant.data?.last_name || '',
            dateOfBirth: existingApplicant.data?.date_of_birth || '',
            mobile: existingApplicant.data?.mobile || '',
            bankAccountNumber: data.accountNumber,
            bankIfsc: data.ifsc,
            accountHolderName: data.accountHolderName,
            bankName: data.bankName,
            bankVerified: true,
            bankVerifiedAt: result.verifiedAt,
          });
        } else {
          addToast({
            type: 'error',
            message: response.data.message || 'Name verification failed. Account holder name does not match.',
          });
        }
      }
    } catch (err: any) {
      console.error('Name verification failed:', err);
      addToast({
        type: 'error',
        message: err.message || 'Bank verification failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyPennyDrop = async (data: BankVerificationForm) => {
    if (!id) return;

    try {
      setLoading(true);
      setVerificationResult(null);

      const response = await rmAPI.integrations.bank.pennyDrop(
        data.accountNumber,
        data.ifsc,
        1 // ₹1 penny drop
      );

      if (response.data?.requestId) {
        addToast({
          type: 'info',
          message: 'Penny drop initiated. Checking status...',
        });

        // Poll for status
        setCheckingPennyDrop(true);
        await checkPennyDropStatus(response.data.requestId, data);
      } else {
        addToast({
          type: 'error',
          message: 'Failed to initiate penny drop verification',
        });
      }
    } catch (err: any) {
      console.error('Penny drop verification failed:', err);
      addToast({
        type: 'error',
        message: err.message || 'Penny drop verification failed',
      });
      setCheckingPennyDrop(false);
    } finally {
      setLoading(false);
    }
  };

  const checkPennyDropStatus = async (requestId: string, data: BankVerificationForm) => {
    if (!id) return;

    const maxAttempts = 10;
    let attempts = 0;

    const pollStatus = async () => {
      try {
        attempts++;
        const response = await rmAPI.integrations.bank.getPennyDropStatus(requestId);

        if (response.data?.status === 'success') {
          const result: VerificationResult = {
            verified: true,
            method: 'pennyDrop',
            accountHolderName: data.accountHolderName,
            bankName: response.data.bankName || data.bankName,
            ifsc: response.data.ifsc || data.ifsc,
            verifiedAt: new Date().toISOString(),
            requestId,
            message: 'Penny drop verification successful',
          };

          setVerificationResult(result);
          setCheckingPennyDrop(false);

          addToast({
            type: 'success',
            message: 'Bank account verified via penny drop',
          });

          // Save verified bank details (get existing applicant data first)
          const existingApplicant = await rmAPI.applicants.get(id);
          await rmAPI.applicants.update(id, {
            firstName: existingApplicant.data?.first_name || '',
            lastName: existingApplicant.data?.last_name || '',
            dateOfBirth: existingApplicant.data?.date_of_birth || '',
            mobile: existingApplicant.data?.mobile || '',
            bankAccountNumber: data.accountNumber,
            bankIfsc: data.ifsc,
            accountHolderName: data.accountHolderName,
            bankName: data.bankName,
            bankVerified: true,
            bankVerifiedAt: result.verifiedAt,
            bankVerificationMethod: 'pennyDrop',
          });
        } else if (response.data?.status === 'failed') {
          setCheckingPennyDrop(false);
          addToast({
            type: 'error',
            message: 'Penny drop verification failed. Account details may be incorrect.',
          });
        } else if (attempts < maxAttempts) {
          // Continue polling
          setTimeout(pollStatus, 2000);
        } else {
          setCheckingPennyDrop(false);
          addToast({
            type: 'warning',
            message: 'Penny drop verification is taking longer than expected. Please check later.',
          });
        }
      } catch (err: any) {
        if (attempts < maxAttempts) {
          setTimeout(pollStatus, 2000);
        } else {
          setCheckingPennyDrop(false);
          addToast({
            type: 'error',
            message: 'Failed to check penny drop status',
          });
        }
      }
    };

    pollStatus();
  };

  const onSubmit = async (data: BankVerificationForm) => {
    if (data.verificationMethod === 'name') {
      await verifyName(data);
    } else {
      await verifyPennyDrop(data);
    }
  };

  if (fetching) {
    return (
      <ApplicationStepWrapper>
        <div className="flex items-center justify-center min-h-64">
          <Spinner />
        </div>
      </ApplicationStepWrapper>
    );
  }

  return (
    <ApplicationStepWrapper>
      <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank Account Verification</h1>
          <p className="text-sm text-gray-500 mt-1">Verify customer's bank account details</p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/rm/applications/${id}/documents`)}>
          ← Back
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Verification Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Verification Method *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer ${
                    verificationMethod === 'name'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    {...register('verificationMethod')}
                    value="name"
                    className="mr-2"
                  />
                  <div>
                    <div className="font-medium">Name Verification</div>
                    <div className="text-xs text-gray-500">Fast - Verifies account holder name</div>
                  </div>
                </label>
                <label
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer ${
                    verificationMethod === 'pennyDrop'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    {...register('verificationMethod')}
                    value="pennyDrop"
                    className="mr-2"
                  />
                  <div>
                    <div className="font-medium">Penny Drop</div>
                    <div className="text-xs text-gray-500">More reliable - ₹1 transaction</div>
                  </div>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bank Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Account Number *"
                  {...register('accountNumber')}
                  error={errors.accountNumber?.message}
                  placeholder="1234567890123456"
                  maxLength={18}
                />
              </div>
              <div>
                <Input
                  label="IFSC Code *"
                  {...register('ifsc')}
                  error={errors.ifsc?.message}
                  placeholder="ABCD0123456"
                  className="uppercase"
                  maxLength={11}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Account Holder Name *"
                  {...register('accountHolderName')}
                  error={errors.accountHolderName?.message}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Input
                  label="Bank Name (Optional)"
                  {...register('bankName')}
                  error={errors.bankName?.message}
                  placeholder="State Bank of India"
                />
              </div>
            </div>

            {verificationMethod === 'pennyDrop' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Penny drop verification will initiate a ₹1 transaction to verify the account.
                  This may take a few minutes. The transaction will be automatically refunded.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {verificationResult && (
          <Card>
            <CardHeader>
              <CardTitle>Verification Result</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`p-4 rounded-md ${
                  verificationResult.verified
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="flex items-center mb-2">
                  {verificationResult.verified ? (
                    <span className="text-green-600 font-medium">✓ Verified</span>
                  ) : (
                    <span className="text-red-600 font-medium">✗ Verification Failed</span>
                  )}
                </div>
                {verificationResult.verified && (
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>
                      <strong>Method:</strong> {verificationResult.method === 'name' ? 'Name Verification' : 'Penny Drop'}
                    </p>
                    {verificationResult.accountHolderName && (
                      <p>
                        <strong>Account Holder:</strong> {verificationResult.accountHolderName}
                      </p>
                    )}
                    {verificationResult.bankName && (
                      <p>
                        <strong>Bank:</strong> {verificationResult.bankName}
                      </p>
                    )}
                    {verificationResult.ifsc && (
                      <p>
                        <strong>IFSC:</strong> {verificationResult.ifsc}
                      </p>
                    )}
                    {verificationResult.verifiedAt && (
                      <p>
                        <strong>Verified At:</strong>{' '}
                        {new Date(verificationResult.verifiedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
                {!verificationResult.verified && verificationResult.message && (
                  <p className="text-sm text-red-600 mt-2">{verificationResult.message}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {checkingPennyDrop && (
          <Card>
            <CardContent className="py-8">
              <div className="flex items-center justify-center space-x-3">
                <Spinner />
                <span className="text-gray-600">Checking penny drop status...</span>
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">
                This may take up to 2 minutes
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/rm/applications/${id}/documents`)}
          >
            ← Previous
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(`/rm/applications/${id}/cibil`)}
            >
              Skip for Now
            </Button>
            <Button
              type="submit"
              disabled={loading || checkingPennyDrop}
            >
              {loading || checkingPennyDrop
                ? verificationMethod === 'pennyDrop'
                  ? 'Verifying...'
                  : 'Verifying...'
                : 'Verify Bank Account'}
            </Button>
          </div>
        </div>
      </form>
      </div>
    </ApplicationStepWrapper>
  );
}

