/**
 * RM Applications List Page - Enhanced Mobile-First Design
 * Shows all applications assigned to the RM with filters and search
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { SkeletonTable } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import PullToRefresh from '../../components/ui/PullToRefresh';
import SwipeableItem from '../../components/ui/SwipeableItem';
import { rmAPI } from '../lib/api';
import { useAuth } from '../../shared/hooks/useAuth';
import { Application } from '../../shared/types';
import { 
  Search, 
  Filter, 
  X, 
  Eye, 
  FileEdit, 
  Plus,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  FileText
} from 'lucide-react';

export default function RMApplicationsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState('');
  
  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  // Handle multiple status parameters (for In Progress which includes multiple statuses)
  const statusParam = searchParams.get('status');
  const allStatusParams = searchParams.getAll('status');
  const [statusFilter, setStatusFilter] = useState<string>(
    allStatusParams.length > 0 
      ? (allStatusParams.length === 1 ? allStatusParams[0] : 'inProgress') // If multiple, treat as inProgress
      : (statusParam || 'all')
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const limit = 20;

  // Sync status filter and search from URL params when they change
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    const statusParam = searchParams.get('status');
    const allStatusParams = searchParams.getAll('status');
    
    // Update search from URL
    setSearch(urlSearch);
    
    // Update status filter from URL
    let newStatusFilter: string;
    if (allStatusParams.length > 0) {
      newStatusFilter = allStatusParams.length === 1 ? allStatusParams[0] : 'inProgress';
    } else {
      newStatusFilter = statusParam || 'all';
    }
    
    setStatusFilter(newStatusFilter);
    setPage(1); // Reset to first page when URL params change
  }, [searchParams]);

  useEffect(() => {
    if (user?.id) {
      loadApplications();
    }
  }, [statusFilter, page, search, user?.id]);

  const loadApplications = async (isRefresh = false) => {
    // Guard: Don't load if user is not available
    if (!user?.id) {
      console.warn('Cannot load applications: user ID not available');
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const params: any = {
        page,
        limit,
        assignedTo: user.id,
      };

      if (search) {
        params.search = search;
      }

      if (statusFilter !== 'all') {
        // Handle special case for "inProgress" which includes multiple statuses
        if (statusFilter === 'inProgress') {
          params.status = ['PendingVerification', 'UnderReview', 'InProgress'];
        } else {
          params.status = [statusFilter];
        }
      }

      const response = await rmAPI.applications.list(params);
      
      console.log('Applications API Response:', response);
      
      if (response.data) {
        // Handle different response structures
        const responseData = response.data;
        let apps: any[] = [];
        let totalCount = 0;
        let totalPagesCount = 1;
        
        // Standard API format: { applications: [...], pagination: {...} }
        if (responseData.applications && Array.isArray(responseData.applications)) {
          apps = responseData.applications;
          totalCount = responseData.pagination?.total || 0;
          totalPagesCount = responseData.pagination?.totalPages || 1;
        }
        // Alternative format: { data: [...], pagination: {...} }
        else if (responseData.data && Array.isArray(responseData.data)) {
          apps = responseData.data;
          totalCount = responseData.pagination?.total || responseData.total || apps.length;
          totalPagesCount = responseData.pagination?.totalPages || responseData.totalPages || 1;
        }
        // Direct array
        else if (Array.isArray(responseData)) {
          apps = responseData;
          totalCount = responseData.length;
        }
        
        console.log('Parsed applications:', apps);
        console.log('Total count:', totalCount);
        console.log('Applications array length:', apps.length);
        
        setApplications(apps);
        setTotal(totalCount);
        setTotalPages(totalPagesCount);
      } else {
        console.warn('No data in response:', response);
        setApplications([]);
        setTotal(0);
        setTotalPages(1);
      }
    } catch (err: any) {
      console.error('Failed to load applications:', err);
      setError(err.message || 'Failed to load applications');
      setApplications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadApplications(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'Submitted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'PendingVerification':
      case 'UnderReview':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Draft':
        return <FileText className="h-3 w-3" />;
      case 'Submitted':
      case 'PendingVerification':
      case 'UnderReview':
        return <Clock className="h-3 w-3" />;
      case 'Approved':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'Rejected':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadApplications();
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPage(1);
    setShowFilters(false);
    loadApplications();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh} disabled={loading || refreshing}>
      <div className="space-y-4 sm:space-y-6 animate-fade-in safe-area-inset">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Applications
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
            Manage your loan applications
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex-1 sm:flex-initial touch-manipulation min-h-[44px]"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button
            onClick={() => navigate('/rm/applications/new')}
            className="flex-1 sm:flex-initial touch-manipulation min-h-[44px]"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">New Application</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name, mobile, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-full touch-manipulation min-h-[44px]"
              />
            </div>
            <Button type="submit" className="touch-manipulation min-h-[44px]">
              <Search className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Search</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="touch-manipulation min-h-[44px]"
            >
              <Filter className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Filters</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="animate-slide-up">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Filters</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(false)}
                className="touch-manipulation min-h-[44px] min-w-[44px]"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white touch-manipulation min-h-[44px]"
                >
                  <option value="all">All Status</option>
                  <option value="Draft">Draft</option>
                  <option value="Submitted">Submitted</option>
                  <option value="PendingVerification">Pending Verification</option>
                  <option value="UnderReview">Under Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <Button
                variant="outline"
                onClick={clearFilters}
                className="w-full touch-manipulation min-h-[44px]"
              >
                <X className="h-4 w-4 mr-2" />
                Clear All Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Error loading applications</p>
            <p className="text-sm mt-1">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="mt-3 touch-manipulation min-h-[44px]"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Applications List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Applications ({total})
            </CardTitle>
            {statusFilter !== 'all' && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Filtered: {statusFilter}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <SkeletonTable rows={5} />
          ) : applications.length === 0 ? (
            <EmptyState
              icon="search"
              title={search || statusFilter !== 'all' ? 'No applications found' : 'No applications yet'}
              description={
                search || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters to find applications.'
                  : 'Create your first application to get started with the loan origination process.'
              }
              action={
                search || statusFilter !== 'all'
                  ? {
                      label: 'Clear Filters',
                      onClick: clearFilters,
                    }
                  : {
                      label: 'Create New Application',
                      onClick: () => navigate('/rm/applications/new'),
                    }
              }
            />
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Application ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {applications.map((app) => (
                      <tr key={app.application_id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono text-gray-900 dark:text-white">
                            {app.application_id.substring(0, 8)}...
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {app.product_code || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(app.requested_amount)}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(app.status)}`}>
                            {getStatusIcon(app.status)}
                            {app.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {app.created_at ? formatDate(app.created_at) : '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => app.application_id && navigate(`/rm/applications/${app.application_id}`)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              <span className="hidden lg:inline">View</span>
                            </button>
                            {app.status === 'Draft' && (
                              <button
                                onClick={() => app.application_id && navigate(`/rm/applications/${app.application_id}/personal`)}
                                className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center gap-2"
                              >
                                <FileEdit className="h-4 w-4" />
                                <span className="hidden lg:inline">Edit</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {applications.map((app) => (
                  <SwipeableItem
                    key={app.application_id}
                    rightActions={[
                      {
                        label: 'View',
                        color: 'primary',
                        action: () => {
                          if (app.application_id) {
                            navigate(`/rm/applications/${app.application_id}`);
                          }
                        },
                      },
                      {
                        label: 'Delete',
                        color: 'danger',
                        action: async () => {
                          if (confirm('Are you sure you want to delete this application?')) {
                            // Handle delete
                            console.log('Delete application:', app.application_id);
                          }
                        },
                      },
                    ]}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-mono text-gray-900 dark:text-white font-medium">
                              {app.application_id.substring(0, 8)}...
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(app.status)}`}>
                              {getStatusIcon(app.status)}
                              {app.status}
                            </span>
                          </div>
                          {app.product_code && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              Product: {app.product_code}
                            </div>
                          )}
                          <div className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                            {formatCurrency(app.requested_amount)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {app.created_at ? `Created ${formatDate(app.created_at)}` : 'Created date not available'}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => app.application_id && navigate(`/rm/applications/${app.application_id}`)}
                          className="flex-1 touch-manipulation min-h-[44px]"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        {app.status === 'Draft' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/rm/applications/${app.application_id}/personal`)}
                            className="flex-1 touch-manipulation min-h-[44px]"
                          >
                            <FileEdit className="h-4 w-4 mr-2" />
                            Continue
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  </SwipeableItem>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} results
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                      className="touch-manipulation min-h-[44px]"
                    >
                      Previous
                    </Button>
                    <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 flex items-center">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === totalPages}
                      onClick={() => setPage(page + 1)}
                      className="touch-manipulation min-h-[44px]"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      </div>
    </PullToRefresh>
  );
}
