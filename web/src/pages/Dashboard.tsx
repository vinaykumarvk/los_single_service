import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { FileText, Plus, TrendingUp, DollarSign, CheckCircle, Clock, ArrowUp, ArrowDown, Activity } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import api from '../lib/api';

interface DashboardStats {
  totalApplications: number;
  pendingReview: number;
  totalDisbursed: number;
  avgProcessingTime: number;
}

interface PipelineData {
  Draft?: number;
  Submitted?: number;
  Verification?: number;
  Underwriting?: number;
  Sanctioned?: number;
  OfferAccepted?: number;
  DisbursementRequested?: number;
  Disbursed?: number;
  Rejected?: number;
}

interface TATData {
  SubmitToVerificationMs?: number;
  VerificationToUnderwritingMs?: number;
  UnderwritingToSanctionMs?: number;
  SanctionToDisbursementMs?: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalApplications: 0,
    pendingReview: 0,
    totalDisbursed: 0,
    avgProcessingTime: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applicationTrend, setApplicationTrend] = useState([
    { month: 'Jan', count: 0 },
    { month: 'Feb', count: 0 },
    { month: 'Mar', count: 0 },
    { month: 'Apr', count: 0 },
    { month: 'May', count: 0 },
    { month: 'Jun', count: 0 },
  ]);
  const [statusDistribution, setStatusDistribution] = useState([
    { status: 'Draft', count: 0 },
    { status: 'Pending', count: 0 },
    { status: 'Approved', count: 0 },
    { status: 'Disbursed', count: 0 },
  ]);

  // Fetch dashboard data from reporting service
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch pipeline data
        const pipelineResponse = await api.reporting.get('/pipeline');
        const pipelineData: PipelineData = pipelineResponse.data.data || {};
        
        // Fetch TAT data
        const tatResponse = await api.reporting.get('/tat');
        const tatData: TATData = tatResponse.data.data || {};

        // Calculate totals from pipeline
        const totalApplications = Object.values(pipelineData).reduce((sum, count) => sum + (count || 0), 0);
        const pendingReview = (pipelineData.Verification || 0) + 
                             (pipelineData.Underwriting || 0) + 
                             (pipelineData.Sanctioned || 0) + 
                             (pipelineData.OfferAccepted || 0) +
                             (pipelineData.DisbursementRequested || 0);
        const totalDisbursed = pipelineData.Disbursed || 0;
        
        // Calculate average processing time in days from TAT (convert milliseconds to days)
        const totalTATMs = (tatData.SubmitToVerificationMs || 0) +
                          (tatData.VerificationToUnderwritingMs || 0) +
                          (tatData.UnderwritingToSanctionMs || 0) +
                          (tatData.SanctionToDisbursementMs || 0);
        const avgProcessingTime = totalTATMs > 0 
          ? Number((totalTATMs / (4 * 24 * 60 * 60 * 1000)).toFixed(1)) // Average of 4 stages, convert to days
          : 0;

        setStats({
          totalApplications,
          pendingReview,
          totalDisbursed,
          avgProcessingTime,
        });

        // Update status distribution from pipeline data
        setStatusDistribution([
          { status: 'Draft', count: pipelineData.Draft || 0 },
          { status: 'Pending', count: (pipelineData.Submitted || 0) + (pipelineData.Verification || 0) + (pipelineData.Underwriting || 0) },
          { status: 'Approved', count: (pipelineData.Sanctioned || 0) + (pipelineData.OfferAccepted || 0) },
          { status: 'Disbursed', count: pipelineData.Disbursed || 0 },
        ]);

        // Note: Application trend over time would need historical data from reporting service
        // For now, keeping placeholder data structure
      } catch (err: any) {
        console.error('Failed to fetch dashboard data', err);
        setError(err.response?.data?.error || err.message || 'Failed to load dashboard data');
        // On error, keep stats at 0
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (error && !loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="text-center py-12">
          <div className="text-error-600 dark:text-error-400 mb-4">{error}</div>
          <Button onClick={() => window.location.reload()}>Reload Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-secondary-900 dark:text-secondary-100 tracking-tight">Dashboard</h1>
          <p className="text-sm sm:text-base text-secondary-600 dark:text-secondary-400 mt-1">Welcome back! Here's your loan pipeline overview</p>
        </div>
        <Link to="/applications/new">
          <Button size="lg" className="shadow-lg">
            <Plus className="mr-2 h-5 w-5" />
            New Application
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
        <Card className="overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-400/10 dark:from-primary-600/10 to-primary-600/10 dark:to-primary-800/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-secondary-600 dark:text-secondary-400">Total Applications</CardTitle>
            <div className="p-2 bg-primary-100 dark:bg-primary-900/40 rounded-lg">
              <FileText className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-secondary-900 dark:text-secondary-100 font-mono">
              {loading ? '-' : stats.totalApplications}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="primary" size="sm">All time</Badge>
              <div className="flex items-center text-xs text-success-600 font-medium">
                <ArrowUp className="h-3 w-3 mr-0.5" />
                12% vs last month
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-warning-400/10 dark:from-warning-600/10 to-warning-600/10 dark:to-warning-800/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-secondary-600 dark:text-secondary-400">Pending Review</CardTitle>
            <div className="p-2 bg-warning-100 dark:bg-warning-900/40 rounded-lg">
              <Clock className="h-5 w-5 text-warning-600 dark:text-warning-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-secondary-900 dark:text-secondary-100 font-mono">
              {loading ? '-' : stats.pendingReview}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="warning" size="sm">Needs attention</Badge>
              <div className="flex items-center text-xs text-warning-600 font-medium">
                <Activity className="h-3 w-3 mr-0.5" />
                High priority
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-success-400/10 dark:from-success-600/10 to-success-600/10 dark:to-success-800/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-secondary-600 dark:text-secondary-400">Total Disbursed</CardTitle>
            <div className="p-2 bg-success-100 dark:bg-success-900/40 rounded-lg">
              <CheckCircle className="h-5 w-5 text-success-600 dark:text-success-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-secondary-900 dark:text-secondary-100 font-mono">
              {loading ? '-' : stats.totalDisbursed}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="success" size="sm">Completed</Badge>
              <div className="flex items-center text-xs text-success-600 font-medium">
                <ArrowUp className="h-3 w-3 mr-0.5" />
                8% growth
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-accent-400/10 dark:from-accent-600/10 to-accent-600/10 dark:to-accent-800/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-secondary-600 dark:text-secondary-400">Avg Processing</CardTitle>
            <div className="p-2 bg-accent-100 dark:bg-accent-900/40 rounded-lg">
              <TrendingUp className="h-5 w-5 text-accent-600 dark:text-accent-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-secondary-900 dark:text-secondary-100 font-mono">
              {loading ? '-' : stats.avgProcessingTime}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" size="sm">Days</Badge>
              <div className="flex items-center text-xs text-success-600 font-medium">
                <ArrowDown className="h-3 w-3 mr-0.5" />
                15% faster
              </div>
            </div>
          </CardContent>
        </Card>
          </>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Application Trend</CardTitle>
                <p className="text-sm text-secondary-500 mt-1">Monthly application volume</p>
              </div>
              <Badge variant="primary">6 months</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={applicationTrend}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="month" 
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
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#0ea5e9" 
                  strokeWidth={3}
                  fill="url(#colorCount)"
                  name="Applications"
                  dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Status Distribution</CardTitle>
                <p className="text-sm text-secondary-500 mt-1">Current pipeline breakdown</p>
              </div>
              <Badge variant="secondary">Live</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={statusDistribution}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.7}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="status" 
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
                  dataKey="count" 
                  fill="url(#barGradient)" 
                  name="Count"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <p className="text-sm text-secondary-500 mt-1">Common tasks and shortcuts</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link to="/applications/new">
              <div className="group p-6 border-2 border-secondary-200 rounded-xl hover:border-primary-500 hover:bg-primary-50/50 cursor-pointer transition-all duration-200">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary-100 group-hover:bg-primary-200 rounded-lg transition-colors">
                    <Plus className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-secondary-900 group-hover:text-primary-700 transition-colors">New Application</h3>
                    <p className="text-sm text-secondary-500 mt-1">Start a new loan application</p>
                  </div>
                </div>
              </div>
            </Link>
            <Link to="/applications">
              <div className="group p-6 border-2 border-secondary-200 rounded-xl hover:border-accent-500 hover:bg-accent-50/50 cursor-pointer transition-all duration-200">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-accent-100 group-hover:bg-accent-200 rounded-lg transition-colors">
                    <FileText className="h-6 w-6 text-accent-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-secondary-900 group-hover:text-accent-700 transition-colors">View Applications</h3>
                    <p className="text-sm text-secondary-500 mt-1">Browse and manage all applications</p>
                  </div>
                </div>
              </div>
            </Link>
            <Link to="/kyc">
              <div className="group p-6 border-2 border-secondary-200 rounded-xl hover:border-warning-500 hover:bg-warning-50/50 cursor-pointer transition-all duration-200">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-warning-100 group-hover:bg-warning-200 rounded-lg transition-colors">
                    <CheckCircle className="h-6 w-6 text-warning-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-secondary-900 group-hover:text-warning-700 transition-colors">KYC Verification</h3>
                    <p className="text-sm text-secondary-500 mt-1">Manage customer verification</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
