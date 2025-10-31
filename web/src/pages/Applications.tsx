import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import DataTable, { Column } from '../components/ui/DataTable';
import { useToast } from '../components/ui/Toast';
import { ConfirmModal } from '../components/ui/Modal';
import { Plus, Search, Filter, Download, Trash2, CheckCircle, XCircle, MoreVertical } from 'lucide-react';
import api from '../lib/api';

interface Application {
  id: string;
  customerName: string;
  loanAmount: number;
  productType: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'disbursed';
  createdAt: string;
}

interface ApplicationAPIResponse {
  application_id: string;
  applicant_id: string;
  channel: string;
  product_code: string;
  requested_amount: number;
  requested_tenure_months: number;
  status: string;
  created_at: string;
  updated_at?: string;
}

export default function Applications() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  // Map API response to UI format
  const mapApplication = (apiApp: ApplicationAPIResponse): Application => {
    // Normalize status to match UI expectations
    const normalizedStatus = apiApp.status.toLowerCase().replace(' ', '_') as Application['status'];
    
    return {
      id: apiApp.application_id,
      customerName: apiApp.applicant_id.slice(0, 12) + '...', // Use applicant ID as placeholder for customer name
      loanAmount: apiApp.requested_amount,
      productType: apiApp.product_code || 'Unknown',
      status: normalizedStatus,
      createdAt: apiApp.created_at ? new Date(apiApp.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    };
  };

  // Fetch applications from API
  const fetchApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      };
      
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await api.application.get('/', { params });
      const apiApps: ApplicationAPIResponse[] = response.data.applications || [];
      const mappedApps = apiApps.map(mapApplication);
      
      // Apply client-side search filter if needed
      let filtered = mappedApps;
      if (searchQuery) {
        filtered = mappedApps.filter((app) => 
          app.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.id.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      setApplications(filtered);
      
      if (response.data.pagination) {
        setPagination({
          page: response.data.pagination.page || 1,
          limit: response.data.pagination.limit || 20,
          total: response.data.pagination.total || 0,
          totalPages: response.data.pagination.totalPages || 1,
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch applications', err);
      setError(err.response?.data?.error || err.message || 'Failed to load applications');
      addToast({
        type: 'error',
        message: 'Failed to load applications',
        description: err.response?.data?.error || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, pagination.page, pagination.limit]);

  // Re-fetch when search query changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchApplications();
    }, 300);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const filteredApplications = applications;

  const getStatusBadge = (status: Application['status']) => {
    const variants: Record<Application['status'], 'default' | 'primary' | 'success' | 'warning' | 'error' | 'secondary'> = {
      draft: 'secondary',
      submitted: 'primary',
      under_review: 'warning',
      approved: 'success',
      rejected: 'error',
      disbursed: 'success',
    };

    const labels: Record<Application['status'], string> = {
      draft: 'Draft',
      submitted: 'Submitted',
      under_review: 'Under Review',
      approved: 'Approved',
      rejected: 'Rejected',
      disbursed: 'Disbursed',
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const columns: Column<Application>[] = [
    {
      key: 'id',
      label: 'Application ID',
      sortable: true,
      width: '10%',
      render: (app) => (
        <span className="text-sm font-mono font-medium text-secondary-900 dark:text-secondary-100">
          #{app.id}
        </span>
      ),
    },
    {
      key: 'customerName',
      label: 'Customer Name',
      sortable: true,
      width: '20%',
      render: (app) => (
        <span className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
          {app.customerName}
        </span>
      ),
    },
    {
      key: 'productType',
      label: 'Product Type',
      sortable: true,
      width: '15%',
      render: (app) => (
        <span className="text-sm text-secondary-700 dark:text-secondary-300">{app.productType}</span>
      ),
    },
    {
      key: 'loanAmount',
      label: 'Loan Amount',
      sortable: true,
      width: '15%',
      align: 'right',
      render: (app) => (
        <span className="text-sm font-semibold text-secondary-900 dark:text-secondary-100">
          ₹{app.loanAmount.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: '15%',
      render: (app) => getStatusBadge(app.status),
    },
    {
      key: 'createdAt',
      label: 'Created Date',
      sortable: true,
      width: '15%',
      render: (app) => (
        <span className="text-sm text-secondary-600 dark:text-secondary-400">
          {new Date(app.createdAt).toLocaleDateString('en-IN')}
        </span>
      ),
    },
  ];

  const handleBulkDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmBulkDelete = () => {
    addToast({
      type: 'success',
      message: 'Applications deleted',
      description: `${selectedRows.size} application(s) have been deleted successfully.`,
    });
    setSelectedRows(new Set());
    setShowDeleteConfirm(false);
  };

  const handleBulkApprove = () => {
    addToast({
      type: 'success',
      message: 'Applications approved',
      description: `${selectedRows.size} application(s) have been approved.`,
    });
    setSelectedRows(new Set());
  };

  const handleBulkReject = () => {
    addToast({
      type: 'error',
      message: 'Applications rejected',
      description: `${selectedRows.size} application(s) have been rejected.`,
    });
    setSelectedRows(new Set());
  };

  const handleExport = () => {
    const csvContent = [
      ['ID', 'Customer Name', 'Product Type', 'Loan Amount', 'Status', 'Created Date'],
      ...filteredApplications.map(app => [
        app.id,
        app.customerName,
        app.productType,
        app.loanAmount.toString(),
        app.status,
        app.createdAt,
      ]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applications-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    addToast({
      type: 'success',
      message: 'Export successful',
      description: 'Applications data has been exported to CSV.',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-secondary-900 dark:text-secondary-100 tracking-tight">Applications</h1>
          <p className="text-sm sm:text-base text-secondary-600 dark:text-secondary-400 mt-1">Manage and track all loan applications</p>
        </div>
        <Link to="/applications/new">
          <Button size="lg" className="shadow-lg">
            <Plus className="mr-2 h-5 w-5" />
            New Application
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary-400 dark:text-secondary-500" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-secondary-300 dark:border-secondary-700 rounded-lg bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 placeholder-secondary-400 dark:placeholder-secondary-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-secondary-300 dark:border-secondary-700 rounded-lg bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="disbursed">Disbursed</option>
          </select>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {selectedRows.size > 0 && (
        <Card className="p-4 bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-primary-900 dark:text-primary-100">
                {selectedRows.size} selected
              </span>
              <Button variant="ghost" size="sm" onClick={() => setSelectedRows(new Set())}>
                Clear selection
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="success" size="sm" onClick={handleBulkApprove}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button variant="error" size="sm" onClick={handleBulkReject}>
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button variant="outline" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <Card>
          <div className="text-center py-12 text-secondary-600 dark:text-secondary-400">Loading applications...</div>
        </Card>
      ) : error ? (
        <Card>
          <div className="text-center py-12">
            <div className="text-error-600 dark:text-error-400 mb-4">{error}</div>
            <Button onClick={fetchApplications}>Retry</Button>
          </div>
        </Card>
      ) : filteredApplications.length === 0 ? (
        <Card>
          <EmptyState
            icon="search"
            title={searchQuery || statusFilter !== 'all' ? 'No applications found' : 'No applications yet'}
            description={
              searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first loan application'
            }
            action={
              !searchQuery && statusFilter === 'all'
                ? {
                    label: 'Create Application',
                    onClick: () => navigate('/applications/new'),
                  }
                : undefined
            }
            secondaryAction={
              searchQuery || statusFilter !== 'all'
                ? {
                    label: 'Clear Filters',
                    onClick: () => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    },
                  }
                : undefined
            }
          />
        </Card>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={filteredApplications}
            keyExtractor={(app) => app.id}
            onRowClick={(app) => navigate(`/applications/${app.id}`)}
            selectable
            selectedRows={selectedRows}
            onSelectionChange={setSelectedRows}
          />
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-secondary-600 dark:text-secondary-400">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} applications
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        title="Delete Applications"
        message={`Are you sure you want to delete ${selectedRows.size} application(s)? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="error"
      />
    </div>
  );
}
