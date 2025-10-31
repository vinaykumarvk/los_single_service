import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import api from '../lib/api';
import { ArrowLeft, CheckCircle, XCircle, Clock, FileText, Scale, FileCheck, CreditCard, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Application {
  applicationId: string;
  applicantId: string;
  channel: string;
  productCode: string;
  requestedAmount: number;
  requestedTenureMonths: number;
  status: string;
  createdAt?: string;
}

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [application, setApplication] = useState<Application | null>(
    location.state?.application || null
  );
  const [loading, setLoading] = useState(!application);

  useEffect(() => {
    if (!application && id) {
      api.application
        .get(`/applications/${id}`)
        .then((res) => setApplication(res.data))
        .catch((err) => console.error('Failed to load application', err))
        .finally(() => setLoading(false));
    }
  }, [id, application]);

  const getStatusIcon = (status: string) => {
    if (status === 'Draft') return <Clock className="h-5 w-5 text-yellow-500" />;
    if (status.includes('Approved') || status === 'DISBURSED')
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (status.includes('Rejected') || status === 'FAILED')
      return <XCircle className="h-5 w-5 text-red-500" />;
    return <Clock className="h-5 w-5 text-blue-500" />;
  };

  if (loading) {
    return <div className="text-center py-12 text-secondary-600 dark:text-secondary-400">Loading...</div>;
  }

  if (!application) {
    return <div className="text-center py-12 text-secondary-600 dark:text-secondary-400">Application not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <Button variant="ghost" onClick={() => navigate('/applications')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold text-secondary-900 dark:text-secondary-100">Application Details</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Application #{application.applicationId.slice(0, 8)}</CardTitle>
            <div className="flex items-center gap-2">
              {getStatusIcon(application.status)}
              <span className="font-medium">{application.status}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Applicant ID</dt>
              <dd className="mt-1 text-sm text-secondary-900 dark:text-secondary-100">{application.applicantId}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Channel</dt>
              <dd className="mt-1 text-sm text-secondary-900 dark:text-secondary-100">{application.channel}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Product Code</dt>
              <dd className="mt-1 text-sm text-secondary-900 dark:text-secondary-100">{application.productCode}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Requested Amount</dt>
              <dd className="mt-1 text-sm text-secondary-900 dark:text-secondary-100">
                ₹{application.requestedAmount.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Tenure</dt>
              <dd className="mt-1 text-sm text-secondary-900 dark:text-secondary-100">{application.requestedTenureMonths} months</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Workflow Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3 p-2 rounded-lg bg-success-50 dark:bg-success-900/20">
                <CheckCircle className="h-5 w-5 text-success-600 dark:text-success-400 flex-shrink-0" />
                <span className="text-secondary-900 dark:text-secondary-100 font-medium">Application Created</span>
              </li>
              <li className="flex items-center gap-3 p-2 rounded-lg bg-warning-50 dark:bg-warning-900/20">
                <Clock className="h-5 w-5 text-warning-600 dark:text-warning-400 flex-shrink-0" />
                <span className="text-secondary-900 dark:text-secondary-100">KYC Verification</span>
              </li>
              <li className="flex items-center gap-3 p-2">
                <Clock className="h-5 w-5 text-secondary-300 dark:text-secondary-700 flex-shrink-0" />
                <span className="text-secondary-500 dark:text-secondary-500">Underwriting Review</span>
              </li>
              <li className="flex items-center gap-3 p-2">
                <Clock className="h-5 w-5 text-secondary-300 dark:text-secondary-700 flex-shrink-0" />
                <span className="text-secondary-500 dark:text-secondary-500">Sanction & Offer</span>
              </li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to={`/applications/${application.applicationId}/documents`}>
              <Button variant="outline" className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                Manage Documents
              </Button>
            </Link>
            <Link to={`/applications/${application.applicationId}/underwriting`}>
              <Button variant="outline" className="w-full">
                <Scale className="mr-2 h-4 w-4" />
                Underwriting Review
              </Button>
            </Link>
            <Link to={`/applications/${application.applicationId}/sanction`}>
              <Button variant="outline" className="w-full">
                <FileCheck className="mr-2 h-4 w-4" />
                Sanction & Offer
              </Button>
            </Link>
            <Link to={`/applications/${application.applicationId}/payments`}>
              <Button variant="outline" className="w-full">
                <CreditCard className="mr-2 h-4 w-4" />
                Payments
              </Button>
            </Link>
            <Link to={`/applications/${application.applicationId}/disbursement`}>
              <Button variant="outline" className="w-full">
                <Send className="mr-2 h-4 w-4" />
                Disbursement
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

