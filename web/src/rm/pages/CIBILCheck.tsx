/**
 * RM CIBIL Check Page
 * Pull and view CIBIL credit report for the applicant
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { rmAPI } from '../lib/api';
import { useToast as useToastHook } from '../../components/ui/Toast';
import ApplicationStepWrapper from '../components/ApplicationStepWrapper';

interface CIBILReport {
  requestId: string;
  status: 'pending' | 'completed' | 'failed';
  cibilScore?: number;
  reportData?: {
    personalInformation?: any;
    accounts?: any[];
    inquiries?: any[];
    summary?: {
      totalAccounts?: number;
      activeAccounts?: number;
      overdueAmount?: number;
      creditUtilization?: number;
    };
  };
  generatedAt?: string;
  error?: string;
}

export default function RMCIBILCheck() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToastHook();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [pulling, setPulling] = useState(false);
  const [applicantData, setApplicantData] = useState<any>(null);
  const [cibilReport, setCibilReport] = useState<CIBILReport | null>(null);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (id) {
      loadApplicantData();
      checkExistingReport();
    }
  }, [id]);

  const loadApplicantData = async () => {
    if (!id) return;

    try {
      setFetching(true);
      const response = await rmAPI.applicants.get(id);
      if (response.data) {
        setApplicantData(response.data);
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

  const checkExistingReport = async () => {
    if (!id || !applicantData) return;

    try {
      // Check if there's an existing CIBIL report
      const response = await rmAPI.applications.get(id);
      if (response.data?.cibilRequestId) {
        await fetchCIBILReport(response.data.cibilRequestId);
      }
    } catch (err) {
      // No existing report
    }
  };

  const pullCIBILReport = async () => {
    if (!id || !applicantData) return;

    const { pan, date_of_birth, mobile } = applicantData;

    if (!pan || !date_of_birth || !mobile) {
      addToast({
        type: 'warning',
        message: 'PAN, Date of Birth, and Mobile are required for CIBIL check',
      });
      return;
    }

    try {
      setPulling(true);
      const response = await rmAPI.integrations.cibil.pull(pan, date_of_birth, mobile);

      if (response.data?.requestId) {
        addToast({
          type: 'info',
          message: 'CIBIL report request initiated. Fetching report...',
        });

        // Start polling for report
        await pollCIBILReport(response.data.requestId);
      } else {
        addToast({
          type: 'error',
          message: 'Failed to initiate CIBIL check',
        });
      }
    } catch (err: any) {
      console.error('CIBIL pull failed:', err);
      addToast({
        type: 'error',
        message: err.message || 'Failed to pull CIBIL report',
      });
    } finally {
      setPulling(false);
    }
  };

  const pollCIBILReport = async (requestId: string) => {
    setPolling(true);
    const maxAttempts = 15;
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        const report = await fetchCIBILReport(requestId);

        if (report?.status === 'completed') {
          setPolling(false);
          addToast({
            type: 'success',
            message: 'CIBIL report fetched successfully',
          });
        } else if (report?.status === 'failed') {
          setPolling(false);
          addToast({
            type: 'error',
            message: report.error || 'CIBIL report generation failed',
          });
        } else if (attempts < maxAttempts) {
          // Continue polling
          setTimeout(poll, 3000);
        } else {
          setPolling(false);
          addToast({
            type: 'warning',
            message: 'CIBIL report is taking longer than expected. Please check later.',
          });
        }
      } catch (err: any) {
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000);
        } else {
          setPolling(false);
          addToast({
            type: 'error',
            message: 'Failed to fetch CIBIL report',
          });
        }
      }
    };

    poll();
  };

  const fetchCIBILReport = async (requestId: string): Promise<CIBILReport | null> => {
    try {
      const response = await rmAPI.integrations.cibil.getReport(requestId);

      if (response.data) {
        const report: CIBILReport = {
          requestId,
          status: response.data.status || 'pending',
          cibilScore: response.data.cibilScore,
          reportData: response.data.reportData,
          generatedAt: response.data.generatedAt,
          error: response.data.error,
        };

        setCibilReport(report);
        return report;
      }
      return null;
    } catch (err: any) {
      console.error('Failed to fetch CIBIL report:', err);
      return null;
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-600';
    if (score >= 750) return 'text-green-600';
    if (score >= 650) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score?: number) => {
    if (!score) return 'N/A';
    if (score >= 750) return 'Excellent';
    if (score >= 650) return 'Good';
    if (score >= 550) return 'Fair';
    return 'Poor';
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
      <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CIBIL Credit Check</h1>
          <p className="text-sm text-gray-500 mt-1">Pull and review customer's CIBIL credit report</p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/rm/applications/${id}/bank`)}>
          ← Back
        </Button>
      </div>

      {/* Applicant Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Applicant Information</CardTitle>
        </CardHeader>
        <CardContent>
          {applicantData ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>
                <span className="ml-2 font-medium">
                  {applicantData.first_name} {applicantData.last_name}
                </span>
              </div>
              <div>
                <span className="text-gray-500">PAN:</span>
                <span className="ml-2 font-medium">{applicantData.pan || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-gray-500">Mobile:</span>
                <span className="ml-2 font-medium">{applicantData.mobile || 'Not provided'}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No applicant data available</p>
          )}
        </CardContent>
      </Card>

      {/* CIBIL Score Card */}
      {cibilReport && cibilReport.status === 'completed' && cibilReport.cibilScore !== undefined && (
        <Card>
          <CardHeader>
            <CardTitle>CIBIL Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center space-x-6">
              <div className="text-center">
                <div className={`text-6xl font-bold ${getScoreColor(cibilReport.cibilScore)}`}>
                  {cibilReport.cibilScore}
                </div>
                <div className={`text-sm font-medium mt-2 ${getScoreColor(cibilReport.cibilScore)}`}>
                  {getScoreLabel(cibilReport.cibilScore)}
                </div>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Score Range: 300 - 900</p>
                <p>Generated: {cibilReport.generatedAt ? new Date(cibilReport.generatedAt).toLocaleString() : 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Summary */}
      {cibilReport && cibilReport.status === 'completed' && cibilReport.reportData?.summary && (
        <Card>
          <CardHeader>
            <CardTitle>Credit Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-500">Total Accounts</div>
                <div className="text-2xl font-bold text-gray-900">
                  {cibilReport.reportData.summary.totalAccounts || 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Active Accounts</div>
                <div className="text-2xl font-bold text-green-600">
                  {cibilReport.reportData.summary.activeAccounts || 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Overdue Amount</div>
                <div className="text-2xl font-bold text-red-600">
                  ₹{cibilReport.reportData.summary.overdueAmount?.toLocaleString('en-IN') || '0'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Credit Utilization</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {cibilReport.reportData.summary.creditUtilization || 0}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Details */}
      {cibilReport &&
        cibilReport.status === 'completed' &&
        cibilReport.reportData?.accounts &&
        cibilReport.reportData.accounts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Credit Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Account Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Lender
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cibilReport.reportData.accounts.slice(0, 5).map((account: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-sm text-gray-900">{account.accountType || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{account.lender || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              account.status === 'Active'
                                ? 'bg-green-100 text-green-800'
                                : account.status === 'Closed'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {account.status || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          ₹{account.amount?.toLocaleString('en-IN') || '0'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {cibilReport.reportData.accounts.length > 5 && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Showing 5 of {cibilReport.reportData.accounts.length} accounts
                </p>
              )}
            </CardContent>
          </Card>
        )}

      {/* Pull Report Button */}
      {!cibilReport && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-gray-600 mb-4">No CIBIL report available</p>
              <Button
                onClick={pullCIBILReport}
                disabled={pulling || !applicantData}
                size="lg"
              >
                {pulling ? 'Pulling CIBIL Report...' : 'Pull CIBIL Report'}
              </Button>
              {!applicantData && (
                <p className="text-xs text-red-500 mt-2">
                  Applicant data is required to pull CIBIL report
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Polling Status */}
      {polling && (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center space-x-3">
              <Spinner />
              <span className="text-gray-600">Fetching CIBIL report...</span>
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">
              This may take up to 2-3 minutes
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {cibilReport && cibilReport.status === 'failed' && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-red-600 mb-4">
                {cibilReport.error || 'Failed to generate CIBIL report'}
              </p>
              <Button variant="outline" onClick={pullCIBILReport} disabled={pulling}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => navigate(`/rm/applications/${id}/bank`)}
        >
          ← Previous
        </Button>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate(`/rm/applications/${id}/review`)}
          >
            Skip for Now
          </Button>
          <Button
            onClick={() => navigate(`/rm/applications/${id}/review`)}
            disabled={!cibilReport || cibilReport.status !== 'completed'}
          >
            Continue to Review
          </Button>
        </div>
      </div>
      </div>
    </ApplicationStepWrapper>
  );
}

