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
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Document Management</h1>
      {applicationId && (
        <p className="text-gray-600">Application ID: {applicationId}</p>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {file && <p className="mt-1 text-sm text-gray-600">Selected: {file.name}</p>}
            </div>
            {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}
            {message && <div className="text-sm text-green-700 bg-green-50 p-3 rounded">{message}</div>}
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
            <div className="text-center py-8">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No documents uploaded yet</div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.docId}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(doc.status)}
                    <div>
                      <p className="font-medium">{doc.docType}</p>
                      <p className="text-sm text-gray-500">{doc.fileName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{doc.status}</span>
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

