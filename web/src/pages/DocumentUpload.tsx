import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import api from '../lib/api';
import { Upload, Download, CheckCircle, Clock } from 'lucide-react';

interface Document {
  docId: string;
  docType: string;
  fileName: string;
  status: string;
  createdAt?: string;
}

export default function DocumentUpload() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [docType, setDocType] = useState('PAN');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  const loadDocuments = async () => {
    if (!applicationId) return;
    try {
      const response = await api.document.get(`/applications/${applicationId}/documents`);
      setDocuments(response.data || []);
    } catch (err: any) {
      console.error('Failed to load documents', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (applicationId) loadDocuments();
  }, [applicationId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !applicationId) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.append('docType', docType);
    formData.append('file', file);

    try {
      await api.document.post(`/applications/${applicationId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage('Document uploaded successfully');
      setFile(null);
      loadDocuments();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (docId: string) => {
    try {
      const response = await api.document.get(`/documents/${docId}/download`);
      if (response.data.url) {
        window.open(response.data.url, '_blank');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to generate download link');
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'Verified') return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl sm:text-3xl font-bold text-secondary-900 dark:text-secondary-100">Document Management</h1>
      {applicationId && (
        <p className="text-sm sm:text-base text-secondary-600 dark:text-secondary-400">Application ID: {applicationId}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <Input
              label="Document Type"
              type="text"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              list="docTypes"
            />
            <datalist id="docTypes">
              <option value="PAN" />
              <option value="Aadhaar" />
              <option value="Bank Statement" />
              <option value="Salary Slip" />
              <option value="Address Proof" />
            </datalist>
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                File
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-secondary-500 dark:text-secondary-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 dark:file:bg-primary-900/30 file:text-primary-700 dark:file:text-primary-400 hover:file:bg-primary-100 dark:hover:file:bg-primary-900/50 transition-colors"
              />
              {file && <p className="mt-1 text-sm text-secondary-600 dark:text-secondary-400">Selected: {file.name}</p>}
            </div>
            {error && <div className="text-sm text-error-700 dark:text-error-400 bg-error-50 dark:bg-error-900/20 p-3 rounded">{error}</div>}
            {message && <div className="text-sm text-success-700 dark:text-success-400 bg-success-50 dark:bg-success-900/20 p-3 rounded">{message}</div>}
            <Button disabled={loading || !file || !applicationId} type="submit">
              <Upload className="mr-2 h-4 w-4" />
              {loading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingDocs ? (
            <div className="text-center py-8 text-secondary-600 dark:text-secondary-400">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-secondary-500 dark:text-secondary-400">No documents uploaded yet</div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.docId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-secondary-200 dark:border-secondary-800 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(doc.status)}
                    <div>
                      <p className="font-medium text-secondary-900 dark:text-secondary-100">{doc.docType}</p>
                      <p className="text-sm text-secondary-500 dark:text-secondary-400">{doc.fileName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-secondary-600 dark:text-secondary-400">{doc.status}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc.docId)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

