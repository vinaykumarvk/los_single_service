import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { FileText, Plus, TrendingUp, DollarSign, CheckCircle, Clock, ArrowUp, ArrowDown, Activity } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardStats {
  totalApplications: number;
  pendingReview: number;
  totalDisbursed: number;
  avgProcessingTime: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalApplications: 0,
    pendingReview: 0,
    totalDisbursed: 0,
    avgProcessingTime: 0,
  });
  const [loading, setLoading] = useState(true);

  // Mock data for now - replace with real API call
  useEffect(() => {
    // TODO: Fetch from reporting service
    setTimeout(() => {
      setStats({
        totalApplications: 45,
        pendingReview: 12,
        totalDisbursed: 28,
        avgProcessingTime: 5.2,
      });
      setLoading(false);
    }, 500);
  }, []);

  // Mock chart data
  const applicationTrend = [
    { month: 'Jan', count: 12 },
    { month: 'Feb', count: 15 },
    { month: 'Mar', count: 18 },
    { month: 'Apr', count: 22 },
    { month: 'May', count: 20 },
    { month: 'Jun', count: 25 },
  ];

  const statusDistribution = [
    { status: 'Draft', count: 8 },
    { status: 'Pending', count: 12 },
    { status: 'Approved', count: 20 },
    { status: 'Disbursed', count: 5 },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-secondary-900 tracking-tight">Dashboard</h1>
          <p className="text-secondary-600 mt-1">Welcome back! Here's your loan pipeline overview</p>
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
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-400/10 to-primary-600/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-secondary-600">Total Applications</CardTitle>
            <div className="p-2 bg-primary-100 rounded-lg">
              <FileText className="h-5 w-5 text-primary-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-secondary-900 font-mono">
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
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-warning-400/10 to-warning-600/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-secondary-600">Pending Review</CardTitle>
            <div className="p-2 bg-warning-100 rounded-lg">
              <Clock className="h-5 w-5 text-warning-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-secondary-900 font-mono">
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
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-success-400/10 to-success-600/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-secondary-600">Total Disbursed</CardTitle>
            <div className="p-2 bg-success-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-success-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-secondary-900 font-mono">
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
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-accent-400/10 to-accent-600/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-secondary-600">Avg Processing</CardTitle>
            <div className="p-2 bg-accent-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-accent-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-secondary-900 font-mono">
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
