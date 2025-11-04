/**
 * RM Document Upload Page
 * Upload and validate KYC documents (PAN, Aadhaar, etc.)
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import { rmAPI } from '../lib/api';
import { useToast as useToastHook } from '../../components/ui/Toast';
import { Download, Trash2 } from 'lucide-react';
import ApplicationStepWrapper from '../components/ApplicationStepWrapper';

interface DocumentChecklistItem {
  document_code: string;
  document_name: string;
  is_mandatory: boolean;
  uploaded: boolean;
  verified: boolean;
}

interface Document {
  document_id: string;
  document_code: string;
  document_name: string;
  file_url?: string;
  verification_status?: string;
  uploaded_at?: string;
  file_type?: string;
  size_bytes?: number;
}

export default function RMDocumentUpload() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToastHook();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [checklist, setChecklist] = useState<DocumentChecklistItem[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [validatingPAN, setValidatingPAN] = useState(false);
  const [validatingAadhaar, setValidatingAadhaar] = useState(false);
  const [aadhaarKYC, setAadhaarKYC] = useState<{
    sessionId?: string;
    showOTP?: boolean;
    otp?: string;
  }>({});

  useEffect(() => {
    if (id) {
      loadChecklist();
      loadDocuments();
    }
  }, [id]);

  const loadChecklist = async () => {
    if (!id) return;

    try {
      setFetching(true);
      const response = await rmAPI.documents.getChecklist(id);
      if (response.data?.checklist) {
        setChecklist(response.data.checklist);
      const completion = response.data.completion || 0;
        // Store completion percentage if needed
      }
    } catch (err: any) {
      console.error('Failed to load document checklist:', err);
    } finally {
      setFetching(false);
    }
  };

  const loadDocuments = async () => {
    if (!id) return;

    try {
      const response = await rmAPI.documents.list(id);
      if (response.data?.documents) {
        setDocuments(response.data.documents);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  const handleFileUpload = async (documentCode: string, file: File) => {
    if (!id) return;

    try {
      setUploading((prev) => ({ ...prev, [documentCode]: true }));
      setUploadProgress((prev) => ({ ...prev, [documentCode]: 0 }));

      await rmAPI.documents.upload(
        id,
        file,
        documentCode,
        (progress) => {
          setUploadProgress((prev) => ({ ...prev, [documentCode]: progress }));
        }
      );

      addToast({
        type: 'success',
        message: `${documentCode} uploaded successfully`,
      });

      // Reload documents and checklist
      await loadDocuments();
      await loadChecklist();

      // Auto-validate PAN if uploaded
      if (documentCode === 'PAN_CARD') {
        await validatePAN();
      }

      // Auto-start Aadhaar eKYC if uploaded
      if (documentCode === 'AADHAAR') {
        await startAadhaarKYC();
      }
    } catch (err: any) {
      console.error('File upload failed:', err);
      addToast({
        type: 'error',
        message: err.message || 'Failed to upload document',
      });
    } finally {
      setUploading((prev) => ({ ...prev, [documentCode]: false }));
    }
  };

  const validatePAN = async () => {
    if (!id) return;

    try {
      setValidatingPAN(true);
      // Get PAN from applicant data
      const applicantResponse = await rmAPI.applicants.get(id);
      const pan = applicantResponse.data?.pan;

      if (!pan) {
        addToast({
          type: 'warning',
          message: 'PAN not found in applicant data',
        });
        return;
      }

      const response = await rmAPI.integrations.pan.validate(pan);
      
      if (response.data?.valid) {
        addToast({
          type: 'success',
          message: `PAN validated successfully. Holder: ${response.data.holderName}`,
        });
        // Auto-fill name if not already filled
      } else {
        addToast({
          type: 'error',
          message: response.data?.message || 'PAN validation failed',
        });
      }
    } catch (err: any) {
      console.error('PAN validation failed:', err);
      addToast({
        type: 'error',
        message: err.message || 'PAN validation failed',
      });
    } finally {
      setValidatingPAN(false);
    }
  };

  const startAadhaarKYC = async () => {
    if (!id) return;

    try {
      setValidatingAadhaar(true);
      const applicantResponse = await rmAPI.applicants.get(id);
      const aadhaar = applicantResponse.data?.aadhaar;
      const mobile = applicantResponse.data?.mobile;

      if (!aadhaar || !mobile) {
        addToast({
          type: 'warning',
          message: 'Aadhaar and mobile number required for eKYC',
        });
        return;
      }

      const response = await rmAPI.integrations.aadhaar.start(
        id,
        applicantResponse.data.applicant_id,
        aadhaar,
        mobile,
        true // consent
      );

      if (response.data?.sessionId) {
        setAadhaarKYC({
          sessionId: response.data.sessionId,
          showOTP: true,
        });
        addToast({
          type: 'info',
          message: 'OTP sent to registered mobile number',
        });
      }
    } catch (err: any) {
      console.error('Aadhaar KYC start failed:', err);
      addToast({
        type: 'error',
        message: err.message || 'Failed to start Aadhaar eKYC',
      });
    } finally {
      setValidatingAadhaar(false);
    }
  };

  const submitAadhaarOTP = async () => {
    if (!aadhaarKYC.sessionId || !aadhaarKYC.otp) return;

    try {
      setValidatingAadhaar(true);
      const response = await rmAPI.integrations.aadhaar.submitOTP(
        aadhaarKYC.sessionId!,
        aadhaarKYC.otp!
      );

      if (response.data?.verified) {
        addToast({
          type: 'success',
          message: 'Aadhaar eKYC verified successfully',
        });
        setAadhaarKYC({});
        await loadDocuments();
        await loadChecklist();
      } else {
        addToast({
          type: 'error',
          message: 'Aadhaar verification failed. Please check OTP.',
        });
      }
    } catch (err: any) {
      console.error('Aadhaar OTP submission failed:', err);
      addToast({
        type: 'error',
        message: err.message || 'OTP verification failed',
      });
    } finally {
      setValidatingAadhaar(false);
    }
  };

  const getDocumentStatus = (docCode: string) => {
    const doc = documents.find((d) => d.document_code === docCode);
    if (!doc) return 'not_uploaded';
    if (doc.verification_status === 'Verified') return 'verified';
    if (doc.verification_status === 'Rejected') return 'rejected';
    return 'uploaded';
  };

  const completionPercentage = checklist.length > 0
    ? (checklist.filter((item) => item.uploaded).length / checklist.length) * 100
    : 0;

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
          <h1 className="text-2xl font-bold text-gray-900">Document Upload</h1>
          <p className="text-sm text-gray-500 mt-1">Upload and verify KYC documents</p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/rm/applications/${id}/loan-property`)}>
          ← Back
        </Button>
      </div>

      {/* Completion Indicator */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Document Completion</CardTitle>
            <span className="text-sm font-medium text-gray-700">
              {Math.round(completionPercentage)}% Complete
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {checklist.filter((item) => item.uploaded).length} of {checklist.length} documents uploaded
          </p>
        </CardContent>
      </Card>

      {/* Document Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {checklist.map((item) => {
          const status = getDocumentStatus(item.document_code);
          const isUploading = uploading[item.document_code];
          const progress = uploadProgress[item.document_code] || 0;
          const uploadedDoc = documents.find((d) => d.document_code === item.document_code);

          return (
            <Card key={item.document_code}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base">
                    {item.document_name}
                    {item.is_mandatory && <span className="text-red-500 ml-1">*</span>}
                  </CardTitle>
                  {status === 'verified' && (
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      Verified
                    </span>
                  )}
                  {status === 'uploaded' && (
                    <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                      Uploaded
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {status === 'not_uploaded' && (
                  <div>
                    <input
                      type="file"
                      id={`file-${item.document_code}`}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            addToast({
                              type: 'error',
                              message: 'File size must be less than 5MB',
                            });
                            return;
                          }
                          handleFileUpload(item.document_code, file);
                        }
                      }}
                    />
                    <label
                      htmlFor={`file-${item.document_code}`}
                      className="block w-full text-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-blue-500"
                    >
                      <span className="text-sm text-gray-600">Click to upload</span>
                      <br />
                      <span className="text-xs text-gray-400">PDF, JPG, PNG (Max 5MB)</span>
                    </label>
                  </div>
                )}

                {isUploading && (
                  <div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Uploading... {progress}%</p>
                  </div>
                )}

                {status === 'uploaded' && !isUploading && (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">
                      <p>File uploaded</p>
                      {uploadedDoc && (
                        <p className="text-xs text-gray-500 mt-1">
                          {uploadedDoc.document_name}
                          {uploadedDoc.size_bytes && ` (${(uploadedDoc.size_bytes / 1024).toFixed(1)} KB)`}
                        </p>
                      )}
                    </div>
                    {item.document_code === 'PAN_CARD' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={validatePAN}
                        disabled={validatingPAN}
                      >
                        {validatingPAN ? 'Validating...' : 'Validate PAN'}
                      </Button>
                    )}
                    {item.document_code === 'AADHAAR' && !aadhaarKYC.showOTP && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={startAadhaarKYC}
                        disabled={validatingAadhaar}
                      >
                        {validatingAadhaar ? 'Starting...' : 'Verify Aadhaar'}
                      </Button>
                    )}
                    {uploadedDoc && (
                      <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                await rmAPI.documents.download(uploadedDoc.document_id);
                                addToast({
                                  type: 'success',
                                  message: 'Download started',
                                });
                              } catch (err: any) {
                                addToast({
                                  type: 'error',
                                  message: err.message || 'Failed to download document',
                                });
                              }
                            }}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Delete document
                              if (confirm('Delete this document?')) {
                                rmAPI.documents.delete(uploadedDoc.document_id).then(() => {
                                  loadDocuments();
                                  loadChecklist();
                                  addToast({
                                    type: 'success',
                                    message: 'Document deleted',
                                  });
                                }).catch((err: any) => {
                                  addToast({
                                    type: 'error',
                                    message: err.message || 'Failed to delete document',
                                  });
                                });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                      </div>
                    )}
                  </div>
                )}

                {status === 'verified' && (
                  <div className="flex items-center text-sm text-green-600">
                    <span className="mr-2">✓</span>
                    Verified
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Aadhaar OTP Modal */}
      {aadhaarKYC.showOTP && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Enter Aadhaar OTP</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Enter the OTP sent to your registered mobile number
              </p>
              <Input
                label="OTP"
                type="text"
                maxLength={6}
                value={aadhaarKYC.otp || ''}
                onChange={(e) => setAadhaarKYC((prev) => ({ ...prev, otp: e.target.value }))}
                placeholder="123456"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setAadhaarKYC({})}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitAadhaarOTP}
                  disabled={!aadhaarKYC.otp || validatingAadhaar}
                  className="flex-1"
                >
                  {validatingAadhaar ? 'Verifying...' : 'Verify OTP'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => navigate(`/rm/applications/${id}/loan-property`)}
        >
          ← Previous
        </Button>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate(`/rm/applications/${id}/bank`)}
          >
            Skip for Now
          </Button>
          <Button
            onClick={() => navigate(`/rm/applications/${id}/bank`)}
            disabled={completionPercentage < 50}
          >
            Continue
          </Button>
        </div>
      </div>
      </div>
    </ApplicationStepWrapper>
  );
}

