/**
 * RM Dashboard Page - Enhanced Mobile-First Design
 * Shows statistics and recent applications for the RM
 * Implements global best practices for mobile-first UX
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { SkeletonCard, SkeletonTable } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import PullToRefresh from '../../components/ui/PullToRefresh';
import { rmAPI } from '../lib/api';
import { useAuth } from '../../shared/hooks/useAuth';
import { 
  FileText, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp,
  RefreshCw,
  ArrowRight,
  Eye,
  FileEdit,
  Search
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardStats {
  total: number;
  draft: number;
  submitted: number;
  inProgress: number;
}

interface RecentApplication {
  application_id: string;
  applicant_name?: string;
  status: string;
  requested_amount: number;
  created_at: string;
}

export default function RMDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);
  const [error, setError] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDashboardData();
    
    // Setup real-time updates via SSE
    if (user?.id) {
      const eventSource = new EventSource(
        `${import.meta.env.VITE_API_APPLICATION || 'http://localhost:3001/api'}/dashboard/${user.id}/events?type=rm`
      );
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.metrics) {
            setStats({
              total: data.metrics.totalApplications || 0,
              draft: data.metrics.pipeline?.draft || 0,
              submitted: data.metrics.pipeline?.submitted || 0,
              inProgress: data.metrics.pipeline?.inProgress || 0,
            });
            if (data.metrics.recentApplications) {
              setRecentApplications(data.metrics.recentApplications);
            }
          }
        } catch (err) {
          console.error('Failed to parse SSE data:', err);
        }
      };
      
      eventSource.onerror = (err) => {
        console.error('SSE connection error:', err);
      };
      
      return () => {
        eventSource.close();
      };
    }
  }, [user?.id]);

  const loadDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      try {
        const dashboardResponse = await rmAPI.applications.getDashboard();
        if (dashboardResponse.data) {
          setStats(dashboardResponse.data.stats || {
            total: dashboardResponse.data.total || 0,
            draft: dashboardResponse.data.draft || 0,
            submitted: dashboardResponse.data.submitted || 0,
            inProgress: dashboardResponse.data.inProgress || 0,
          });
          setRecentApplications(dashboardResponse.data.recentApplications || []);
        }
      } catch (err: any) {
        console.warn('Dashboard endpoint not available, using fallback');
        const appsResponse = await rmAPI.applications.list({ 
          limit: 5,
          assignedTo: user?.id 
        });
        if (appsResponse.data?.data) {
          const apps = appsResponse.data.data;
          setStats({
            total: appsResponse.data.pagination?.total || apps.length,
            draft: apps.filter((a: any) => a.status === 'Draft').length,
            submitted: apps.filter((a: any) => a.status === 'Submitted').length,
            inProgress: apps.filter((a: any) => a.status !== 'Draft' && a.status !== 'Submitted').length,
          });
          setRecentApplications(apps.slice(0, 5).map((app: any) => ({
            application_id: app.application_id,
            status: app.status,
            requested_amount: app.requested_amount,
            created_at: app.created_at,
          })));
        }
      }
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      setError(err.message || 'Failed to load dashboard data');
      setStats({ total: 0, draft: 0, submitted: 0, inProgress: 0 });
      setRecentApplications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData(true);
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
        return <FileText className="h-4 w-4" />;
      case 'Submitted':
      case 'PendingVerification':
      case 'UnderReview':
        return <Clock className="h-4 w-4" />;
      case 'Approved':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'Rejected':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonTable rows={5} />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} disabled={loading || refreshing}>
      <div className="space-y-4 sm:space-y-6 animate-fade-in safe-area-inset">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Welcome back, {user?.username || 'RM'}
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
            Refresh
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

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Error loading dashboard</p>
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Applications */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Total Applications
              </CardTitle>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              {stats?.total || 0}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-300 mt-2">
              All time
            </p>
          </CardContent>
        </Card>

        {/* Draft */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Draft
              </CardTitle>
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <FileEdit className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400">
              {stats?.draft || 0}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-300 mt-2">
              In progress
            </p>
          </CardContent>
        </Card>

        {/* Submitted */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Submitted
              </CardTitle>
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl sm:text-4xl font-bold text-green-600 dark:text-green-400">
              {stats?.submitted || 0}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-300 mt-2">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                In Progress
              </CardTitle>
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl sm:text-4xl font-bold text-yellow-600 dark:text-yellow-400">
              {stats?.inProgress || 0}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-300 mt-2">
              Under review
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/rm/applications/new')}
              className="flex flex-col items-center gap-2 h-auto py-4 touch-manipulation min-h-[80px]"
            >
              <Plus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium">New Application</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/rm/applications')}
              className="flex flex-col items-center gap-2 h-auto py-4 touch-manipulation min-h-[80px]"
            >
              <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium">View All</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowSearch(!showSearch)}
              className="flex flex-col items-center gap-2 h-auto py-4 touch-manipulation min-h-[80px]"
            >
              <Search className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium">Search</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/rm/applications?status=Draft')}
              className="flex flex-col items-center gap-2 h-auto py-4 touch-manipulation min-h-[80px]"
            >
              <FileEdit className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-medium">Drafts</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Bar */}
      {showSearch && (
        <Card className="animate-slide-up">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search applications by ID, name, or mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      navigate(`/rm/applications?search=${encodeURIComponent(searchQuery.trim())}`);
                    }
                  }}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-base touch-manipulation min-h-[44px]"
                />
              </div>
              <Button
                onClick={() => {
                  if (searchQuery.trim()) {
                    navigate(`/rm/applications?search=${encodeURIComponent(searchQuery.trim())}`);
                  }
                }}
                disabled={!searchQuery.trim()}
                className="touch-manipulation min-h-[44px]"
              >
                Search
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Application Pipeline Chart */}
      {stats && stats.total > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Application Pipeline</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                  Status distribution
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={[
                  { name: 'Draft', value: stats.draft },
                  { name: 'Submitted', value: stats.submitted },
                  { name: 'In Progress', value: stats.inProgress },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar 
                  dataKey="value" 
                  radius={[8, 8, 0, 0]}
                  fill="#3b82f6"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Applications */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Recent Applications</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                Your latest applications
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/rm/applications')}
              className="w-full sm:w-auto touch-manipulation min-h-[44px]"
            >
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentApplications.length === 0 ? (
            <EmptyState
              icon="file"
              title="No applications yet"
              description="Create your first application to get started with the loan origination process."
              action={{
                label: 'Create New Application',
                onClick: () => navigate('/rm/applications/new'),
              }}
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
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Amount
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
                    {recentApplications.map((app) => (
                      <tr key={app.application_id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono text-gray-900 dark:text-white">
                            {app.application_id.substring(0, 8)}...
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(app.status)}`}>
                            {getStatusIcon(app.status)}
                            {app.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(app.requested_amount)}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(app.created_at)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => navigate(`/rm/applications/${app.application_id}`)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {recentApplications.map((app) => (
                  <Card key={app.application_id} className="hover:shadow-md transition-shadow">
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
                          <div className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                            {formatCurrency(app.requested_amount)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Created {formatDate(app.created_at)}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/rm/applications/${app.application_id}`)}
                          className="flex-1 touch-manipulation min-h-[44px]"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      </div>
    </PullToRefresh>
  );
}
