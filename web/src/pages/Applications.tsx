import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonTable } from '../components/ui/Skeleton';
import { Plus, Search, Filter, Download, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  const [loading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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
  ];

  const applications = mockApplications;

  const filteredApplications = applications.filter((app) => {
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
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            More Filters
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={5} />
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
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary-50 border-b border-secondary-200">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                    Application ID
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                    Customer Name
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                    Product Type
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                    Loan Amount
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                    Created Date
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-200 bg-white">
                {filteredApplications.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-secondary-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/applications/${app.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono font-medium text-secondary-900">
                        #{app.id}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-secondary-900">
                        {app.customerName}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-secondary-700">{app.productType}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-secondary-900">
                        ₹{app.loanAmount.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(app.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-secondary-600">
                        {new Date(app.createdAt).toLocaleDateString('en-IN')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/applications/${app.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-secondary-200 bg-secondary-50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-secondary-600">
                Showing {filteredApplications.length} of {applications.length} applications
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled>
                  Next
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
