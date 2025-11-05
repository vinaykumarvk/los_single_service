/**
 * RM Application Review & Submission Page
 * Final review before submitting application for verification
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { rmAPI } from '../lib/api';
import { useToast as useToastHook } from '../../components/ui/Toast';
import ApplicationStepWrapper from '../components/ApplicationStepWrapper';

interface ApplicationSummary {
  applicationId: string;
  applicantName: string;
  productCode: string;
  requestedAmount: number;
  tenureMonths: number;
  personalInfoComplete: boolean;
  employmentInfoComplete: boolean;
  loanPropertyInfoComplete: boolean;
  documentsComplete: boolean;
  bankVerified: boolean;
  cibilChecked: boolean;
  completeness: number;
}

interface ChecklistItem {
  label: string;
  completed: boolean;
  section: string;
  showWarning?: boolean; // Only show warning if this section should be completed based on workflow
}

export default function RMApplicationReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToastHook();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<ApplicationSummary | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    if (id) {
      loadApplicationSummary();
    }
  }, [id]);

  const loadApplicationSummary = async () => {
    if (!id) return;

    try {
      setFetching(true);

      // Load application data
      const appResponse = await rmAPI.applications.get(id);
      const application = appResponse.data || appResponse; // Handle both {data: {...}} and direct response
      
      // Load applicant data via applicant endpoint
      let applicant: any = null;
      try {
        const applicantResponse = await rmAPI.applicants.get(id);
        applicant = applicantResponse.data || applicantResponse;
      } catch (err) {
        console.warn('Failed to get applicant data:', err);
        // Continue with null applicant - will show default values
      }
      
      // Load completeness
      const completenessResponse = await rmAPI.applications.getCompleteness(id);
      const completeness = completenessResponse.data?.completeness || 0;

      // Load documents checklist
      const documentsResponse = await rmAPI.documents.getChecklist(id);
      const documentsChecklist = documentsResponse.data?.checklist || [];
      const documentsComplete =
        documentsChecklist.filter((item: any) => item.is_mandatory && !item.uploaded).length === 0;

      const appSummary: ApplicationSummary = {
        applicationId: id,
        applicantName: `${applicant?.first_name || ''} ${applicant?.last_name || ''}`.trim(),
        productCode: application?.product_code || '',
        requestedAmount: application?.requested_amount || 0,
        tenureMonths: application?.requested_tenure_months || 0,
        personalInfoComplete: !!(applicant?.first_name && applicant?.mobile && applicant?.address_line1),
        employmentInfoComplete: !!(applicant?.employment_type && applicant?.monthly_income),
        loanPropertyInfoComplete: !!(application?.requested_amount && application?.product_code),
        documentsComplete,
        bankVerified: applicant?.bank_verified || false,
        cibilChecked: application?.cibil_request_id ? true : false,
        completeness,
      };

      setSummary(appSummary);

      // Build checklist - only show warnings for sections that should be completed
      // Personal info should be completed before employment, so only check employment if personal is done
      // Employment should be completed before documents, so only check documents if employment is done
      const items: ChecklistItem[] = [
        {
          label: 'Personal Information',
          completed: appSummary.personalInfoComplete,
          section: 'personal',
        },
        {
          label: 'Employment & Income Details',
          completed: appSummary.employmentInfoComplete,
          section: 'employment',
          // Only show as incomplete if personal info is complete (workflow progression)
          showWarning: appSummary.personalInfoComplete && !appSummary.employmentInfoComplete,
        },
        {
          label: 'Loan & Property Details',
          completed: appSummary.loanPropertyInfoComplete,
          section: 'loan-property',
        },
        {
          label: 'KYC Documents Uploaded',
          completed: appSummary.documentsComplete,
          section: 'documents',
          // Only show as incomplete if employment is complete (workflow progression)
          showWarning: appSummary.employmentInfoComplete && !appSummary.documentsComplete,
        },
        {
          label: 'Bank Account Verified',
          completed: appSummary.bankVerified,
          section: 'bank',
        },
        {
          label: 'CIBIL Check Completed',
          completed: appSummary.cibilChecked,
          section: 'cibil',
        },
      ];

      setChecklist(items);
    } catch (err: any) {
      console.error('Failed to load application summary:', err);
      addToast({
        type: 'error',
        message: 'Failed to load application summary',
      });
    } finally {
      setFetching(false);
    }
  };

  const handleEdit = (section: string) => {
    navigate(`/rm/applications/${id}/${section}`);
  };

  const handleSubmit = async () => {
    if (!id) return;

    // Validate completeness
    if (summary && summary.completeness < 80) {
      addToast({
        type: 'warning',
        message: 'Application completeness is less than 80%. Please complete all mandatory sections.',
      });
      return;
    }

    if (!summary?.personalInfoComplete || !summary?.employmentInfoComplete) {
      addToast({
        type: 'error',
        message: 'Please complete Personal Information and Employment Details before submitting.',
      });
      return;
    }

    if (!summary?.documentsComplete) {
      addToast({
        type: 'error',
        message: 'Please upload all mandatory documents before submitting.',
      });
      return;
    }

    try {
      setSubmitting(true);

      // Submit application for verification
      await rmAPI.applications.submitForVerification(id);

      addToast({
        type: 'success',
        message: 'Application submitted successfully for verification',
      });

      // Refresh dashboard by navigating to it (this will trigger a refresh)
      // Then navigate to status page
      setTimeout(() => {
        // Navigate to dashboard to refresh it
        navigate('/rm?refresh=true');
        // Then navigate to status page after a brief delay
        setTimeout(() => {
          navigate(`/rm/applications/${id}/status`);
        }, 500);
      }, 1500);
    } catch (err: any) {
      console.error('Failed to submit application:', err);
      addToast({
        type: 'error',
        message: err.message || 'Failed to submit application',
      });
    } finally {
      setSubmitting(false);
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

  if (!summary) {
    return (
      <ApplicationStepWrapper>
        <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-gray-600">Unable to load application summary</p>
              <Button variant="outline" onClick={() => navigate(`/rm/applications/${id}`)} className="mt-4">
                Back to Application
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </ApplicationStepWrapper>
    );
  }

  const allMandatoryComplete =
    summary.personalInfoComplete &&
    summary.employmentInfoComplete &&
    summary.loanPropertyInfoComplete &&
    summary.documentsComplete;

  return (
    <ApplicationStepWrapper>
      <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Application Review</h1>
          <p className="text-sm text-gray-500 mt-1">Review all details before submission</p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/rm/applications/${id}/cibil`)}>
          ← Back
        </Button>
      </div>

      {/* Completeness Indicator */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Application Completeness</CardTitle>
            <span className="text-lg font-bold text-blue-600">
              {Math.round(summary.completeness)}%
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                summary.completeness >= 80 ? 'bg-green-600' : 'bg-yellow-600'
              }`}
              style={{ width: `${summary.completeness}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {summary.completeness >= 80
              ? 'Application is ready for submission'
              : 'Please complete all mandatory sections (minimum 80% required)'}
          </p>
        </CardContent>
      </Card>

      {/* Application Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Application Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">Applicant Name</div>
              <div className="text-lg font-medium text-gray-900">{summary.applicantName || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Application ID</div>
              <div className="text-lg font-mono text-gray-900">{summary.applicationId}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Loan Type</div>
              <div className="text-lg font-medium text-gray-900">{summary.productCode}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Loan Amount</div>
              <div className="text-lg font-medium text-gray-900">
                ₹{summary.requestedAmount.toLocaleString('en-IN')}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Tenure</div>
              <div className="text-lg font-medium text-gray-900">
                {Math.round(summary.tenureMonths / 12)} years ({summary.tenureMonths} months)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Completion Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {checklist.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-md"
              >
                <div className="flex items-center space-x-3">
                  {item.completed ? (
                    <span className="text-green-600 text-xl">✓</span>
                  ) : item.showWarning ? (
                    <span className="text-red-600 text-xl">✗</span>
                  ) : (
                    <span className="text-gray-400 text-xl">○</span>
                  )}
                  <span
                    className={`font-medium ${
                      item.completed 
                        ? 'text-gray-900' 
                        : item.showWarning 
                        ? 'text-red-600' 
                        : 'text-gray-500'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
                <div className="flex gap-2">
                  {!item.completed && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(item.section)}
                    >
                      Complete
                    </Button>
                  )}
                  {item.completed && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(item.section)}
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Submission Warning */}
      {!allMandatoryComplete && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex items-start space-x-3">
              <span className="text-yellow-600 text-xl">⚠</span>
              <div>
                <p className="font-medium text-yellow-800">
                  Please complete all mandatory sections before submitting
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Minimum 80% completeness is required for submission
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => navigate(`/rm/applications/${id}/cibil`)}
        >
          ← Previous
        </Button>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate(`/rm/applications/${id}`)}
          >
            Save & Exit
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !allMandatoryComplete || summary.completeness < 80}
            size="lg"
          >
            {submitting ? 'Submitting...' : 'Submit for Verification'}
          </Button>
        </div>
      </div>
      </div>
    </ApplicationStepWrapper>
  );
}

