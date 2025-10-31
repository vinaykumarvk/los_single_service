import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import DataTable, { Column } from '../components/ui/DataTable';
import { useToast } from '../components/ui/Toast';
import { ConfirmModal } from '../components/ui/Modal';
import { Plus, Search, Filter, Download, Trash2, CheckCircle, XCircle, MoreVertical } from 'lucide-react';

interface Application {
  id: string;
  customerName: string;
  loanAmount: number;
  productType: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'disbursed';
  createdAt: string;
}

export default function Applications() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const mockApplications: Application[] = [
    {
      id: '1',
      customerName: 'Rajesh Kumar',
      loanAmount: 500000,
      productType: 'Personal Loan',
      status: 'approved',
      createdAt: '2024-10-25',
    },
    {
      id: '2',
      customerName: 'Priya Sharma',
      loanAmount: 1000000,
      productType: 'Home Loan',
      status: 'under_review',
      createdAt: '2024-10-28',
    },
    {
      id: '3',
      customerName: 'Amit Patel',
      loanAmount: 200000,
      productType: 'Business Loan',
      status: 'submitted',
      createdAt: '2024-10-29',
    },
    {
      id: '4',
      customerName: 'Sneha Reddy',
      loanAmount: 750000,
      productType: 'Car Loan',
      status: 'disbursed',
      createdAt: '2024-10-20',
    },
    {
      id: '5',
      customerName: 'Vikram Singh',
      loanAmount: 300000,
      productType: 'Personal Loan',
      status: 'draft',
      createdAt: '2024-10-30',
    },
    {
      id: '6',
      customerName: 'Anjali Gupta',
      loanAmount: 850000,
      productType: 'Home Loan',
      status: 'approved',
      createdAt: '2024-10-27',
    },
    {
      id: '7',
      customerName: 'Rohit Verma',
      loanAmount: 150000,
      productType: 'Personal Loan',
      status: 'rejected',
      createdAt: '2024-10-26',
    },
  ];

  const filteredApplications = mockApplications.filter((app) => {
    const matchesSearch = app.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.id.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
        <span className="text-sm font-mono font-medium text-secondary-900">
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
        <span className="text-sm font-medium text-secondary-900">
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
        <span className="text-sm text-secondary-700">{app.productType}</span>
      ),
    },
    {
      key: 'loanAmount',
      label: 'Loan Amount',
      sortable: true,
      width: '15%',
      align: 'right',
      render: (app) => (
        <span className="text-sm font-semibold text-secondary-900">
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
        <span className="text-sm text-secondary-600">
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
          <h1 className="text-4xl font-bold text-secondary-900 tracking-tight">Applications</h1>
          <p className="text-secondary-600 mt-1">Manage and track all loan applications</p>
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary-400" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
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
        <Card className="p-4 bg-primary-50 border-primary-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-primary-900">
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

      {filteredApplications.length === 0 ? (
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
        <DataTable
          columns={columns}
          data={filteredApplications}
          keyExtractor={(app) => app.id}
          onRowClick={(app) => navigate(`/applications/${app.id}`)}
          selectable
          selectedRows={selectedRows}
          onSelectionChange={setSelectedRows}
        />
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
