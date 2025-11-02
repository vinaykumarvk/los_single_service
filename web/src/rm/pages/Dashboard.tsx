/**
 * RM Dashboard Page
 * Shows statistics and recent applications for the RM
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { rmAPI } from '../lib/api';
import { useAuth } from '../../shared/hooks/useAuth';

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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Try to get RM dashboard stats
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
        // If dashboard endpoint doesn't exist, fall back to listing applications
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
      // Set default values on error
      setStats({ total: 0, draft: 0, submitted: 0, inProgress: 0 });
      setRecentApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-gray-100 text-gray-800';
      case 'Submitted':
        return 'bg-blue-100 text-blue-800';
      case 'PendingVerification':
      case 'UnderReview':
        return 'bg-yellow-100 text-yellow-800';
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Button onClick={() => navigate('/rm/applications/new')}>
          ➕ New Application
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Total Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Draft</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats?.draft || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats?.submitted || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats?.inProgress || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Applications */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Recent Applications</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/rm/applications')}
            >
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentApplications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No applications yet. Create your first application to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Application ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentApplications.map((app) => (
                    <tr key={app.application_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {app.application_id.substring(0, 8)}...
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(app.status)}`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        ₹{app.requested_amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(app.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => navigate(`/rm/applications/${app.application_id}`)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

