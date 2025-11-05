/**
 * Application Detail/View Page
 * Shows complete application information and status
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { rmAPI } from '../lib/api';
import { useToast as useToastHook } from '../../components/ui/Toast';
import { ArrowLeft, FileEdit, CheckCircle2, Clock, AlertCircle, Eye } from 'lucide-react';
import ApplicationStepWrapper from '../components/ApplicationStepWrapper';

interface ApplicationDetail {
  application_id: string;
  applicant_id: string;
  status: string;
  channel: string;
  product_code: string;
  requested_amount: number;
  requested_tenure_months: number;
  created_at: string;
  updated_at: string;
}

interface ApplicantDetail {
  first_name?: string;
  last_name?: string;
  mobile?: string;
  email?: string;
  pan?: string;
  address_line1?: string;
  city?: string;
  state?: string;
  employment_type?: string;
  monthly_income?: number;
}

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToastHook();
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [applicant, setApplicant] = useState<ApplicantDetail | null>(null);

  useEffect(() => {
    if (id) {
      loadApplication();
    }
  }, [id]);

  const loadApplication = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Load application data
      const appResponse = await rmAPI.applications.get(id);
      const appData = appResponse.data || appResponse;
      setApplication(appData as ApplicationDetail);

      // Load applicant data - use application_id to get applicant_id first, then fetch from KYC service
      try {
        // Get applicant_id from application
        const applicantId = appData.applicant_id || (appData as any).applicant_id;
        if (applicantId) {
          // Fetch from KYC service which has proper decryption
          const applicantResponse = await rmAPI.applicants.get(applicantId);
          const applicantData = applicantResponse.data || applicantResponse;
          setApplicant(applicantData as ApplicantDetail);
        }
      } catch (err) {
        console.warn('Failed to load applicant data:', err);
        // Fallback: try the application service endpoint
        try {
          const applicantResponse = await fetch(`/api/applications/${id}/applicant`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('los_token') || ''}`,
            },
          });
          if (applicantResponse.ok) {
            const applicantData = await applicantResponse.json();
            if (applicantData.data) {
              setApplicant(applicantData.data as ApplicantDetail);
            }
          }
        } catch (fallbackErr) {
          console.warn('Fallback applicant data fetch also failed:', fallbackErr);
        }
      }
    } catch (err: any) {
      console.error('Failed to load application:', err);
      addToast({
        type: 'error',
        message: err.message || 'Failed to load application details',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'Submitted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'PendingVerification':
      case 'UnderReview':
      case 'InProgress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'Disbursed':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
      case 'Disbursed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'PendingVerification':
      case 'UnderReview':
      case 'InProgress':
        return <Clock className="h-4 w-4" />;
      case 'Rejected':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <ApplicationStepWrapper>
        <div className="flex items-center justify-center min-h-64">
          <Spinner />
        </div>
      </ApplicationStepWrapper>
    );
  }

  if (!application) {
    return (
      <ApplicationStepWrapper>
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-gray-600">Application not found</p>
                <Button
                  variant="outline"
                  onClick={() => navigate('/rm/applications')}
                  className="mt-4"
                >
                  Back to Applications
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ApplicationStepWrapper>
    );
  }

  return (
    <ApplicationStepWrapper>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/rm/applications')}
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Application Details
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Application ID: {application.application_id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(application.status)}`}>
              {getStatusIcon(application.status)}
              {application.status}
            </span>
            {application.status === 'Draft' && (
              <Button
                variant="outline"
                onClick={() => navigate(`/rm/applications/${id}/personal`)}
                size="sm"
              >
                <FileEdit className="h-4 w-4 mr-2" />
                Continue Editing
              </Button>
            )}
          </div>
        </div>

        {/* Application Information */}
        <Card>
          <CardHeader>
            <CardTitle>Loan Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Loan Type</div>
                <div className="text-lg font-medium text-gray-900 dark:text-white">
                  {application.product_code}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Loan Amount</div>
                <div className="text-lg font-medium text-gray-900 dark:text-white">
                  {formatCurrency(application.requested_amount)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Loan Tenure</div>
                <div className="text-lg font-medium text-gray-900 dark:text-white">
                  {Math.round(application.requested_tenure_months / 12)} years ({application.requested_tenure_months} months)
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Channel</div>
                <div className="text-lg font-medium text-gray-900 dark:text-white">
                  {application.channel}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Created At</div>
                <div className="text-lg font-medium text-gray-900 dark:text-white">
                  {formatDate(application.created_at)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Last Updated</div>
                <div className="text-lg font-medium text-gray-900 dark:text-white">
                  {formatDate(application.updated_at)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Applicant Information */}
        {applicant && (
          <Card>
            <CardHeader>
              <CardTitle>Applicant Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Name</div>
                  <div className="text-lg font-medium text-gray-900 dark:text-white">
                    {applicant.first_name || ''} {applicant.last_name || ''}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Mobile</div>
                  <div className="text-lg font-medium text-gray-900 dark:text-white">
                    {applicant.mobile || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Email</div>
                  <div className="text-lg font-medium text-gray-900 dark:text-white">
                    {applicant.email || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">PAN</div>
                  <div className="text-lg font-medium text-gray-900 dark:text-white">
                    {applicant.pan || 'N/A'}
                  </div>
                </div>
                {applicant.address_line1 && (
                  <div className="md:col-span-2">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Address</div>
                    <div className="text-lg font-medium text-gray-900 dark:text-white">
                      {applicant.address_line1}
                      {applicant.city && `, ${applicant.city}`}
                      {applicant.state && `, ${applicant.state}`}
                    </div>
                  </div>
                )}
                {applicant.employment_type && (
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Employment Type</div>
                    <div className="text-lg font-medium text-gray-900 dark:text-white">
                      {applicant.employment_type}
                    </div>
                  </div>
                )}
                {applicant.monthly_income && (
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Monthly Income</div>
                    <div className="text-lg font-medium text-gray-900 dark:text-white">
                      {formatCurrency(applicant.monthly_income)}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => navigate('/rm/applications')}
          >
            Back to List
          </Button>
          {application.status === 'Draft' && (
            <Button
              onClick={() => navigate(`/rm/applications/${id}/personal`)}
            >
              <FileEdit className="h-4 w-4 mr-2" />
              Continue Application
            </Button>
          )}
          {application.status !== 'Draft' && (
            <Button
              variant="outline"
              onClick={() => navigate(`/rm/applications/${id}/review`)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Review
            </Button>
          )}
        </div>
      </div>
    </ApplicationStepWrapper>
  );
}

