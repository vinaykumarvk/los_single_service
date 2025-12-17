import { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardList, FileCheck, ShieldCheck, AlertCircle, Clock, Loader2 } from 'lucide-react';
import PersonaMenu from '../../components/PersonaMenu';
import { personaConfigs } from '../../persona/config';
import { Link } from 'react-router-dom';
import { apiClient } from '../../shared/lib/api-client';
import Spinner from '../../components/ui/Spinner';

const opsPersona = personaConfigs.find((persona) => persona.id === 'ops');

interface OpsStats {
  pendingVerification: number;
  underReview: number;
  submitted: number;
  totalPending: number;
}

export default function OpsWorkspace() {
  const [stats, setStats] = useState<OpsStats>({
    pendingVerification: 0,
    underReview: 0,
    submitted: 0,
    totalPending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentApplications, setRecentApplications] = useState<any[]>([]);

  useEffect(() => {
    loadOpsData();
  }, []);

  const loadOpsData = async () => {
    try {
      setLoading(true);
      
      // Fetch applications in ops-relevant statuses
      const [submittedRes, pendingRes, reviewRes] = await Promise.all([
        apiClient.get('/api/applications', { 
          params: { status: 'Submitted', limit: 1 } 
        }),
        apiClient.get('/api/applications', { 
          params: { status: 'PendingVerification', limit: 1 } 
        }),
        apiClient.get('/api/applications', { 
          params: { status: 'UnderReview', limit: 1 } 
        }),
      ]);

      const submitted = submittedRes.data?.pagination?.total || submittedRes.data?.applications?.length || 0;
      const pendingVerification = pendingRes.data?.pagination?.total || pendingRes.data?.applications?.length || 0;
      const underReview = reviewRes.data?.pagination?.total || reviewRes.data?.applications?.length || 0;

      setStats({
        submitted,
        pendingVerification,
        underReview,
        totalPending: submitted + pendingVerification + underReview,
      });

      // Get recent pending applications for the queue
      const recentRes = await apiClient.get('/api/applications', {
        params: { 
          status: ['Submitted', 'PendingVerification', 'UnderReview'].join(','),
          limit: 5 
        }
      });
      
      const apps = recentRes.data?.applications || [];
      setRecentApplications(apps);
    } catch (err) {
      console.error('Failed to load ops data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <PersonaMenu className="lg:w-72" />

          <div className="flex-1 space-y-8">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 p-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    LOS Portal
                  </p>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Ops Control Center
                  </h1>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">
                    One workspace for KYC verification, document QC, underwriting handoffs, and
                    sanction workflows.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link
                    to="/applications"
                    className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white shadow-sm hover:bg-emerald-500"
                  >
                    Open Ops Queue
                  </Link>
                  <Link
                    to="/kyc"
                    className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold border border-emerald-100 text-emerald-700 hover:bg-emerald-50"
                  >
                    KYC Workbench
                  </Link>
                </div>
              </div>
            </div>

            {/* Live Stats Cards */}
            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-4">
                <StatCard
                  label="Total Pending"
                  value={stats.totalPending}
                  icon={Clock}
                  color="blue"
                />
                <StatCard
                  label="Submitted"
                  value={stats.submitted}
                  icon={FileCheck}
                  color="emerald"
                />
                <StatCard
                  label="Pending Verification"
                  value={stats.pendingVerification}
                  icon={AlertCircle}
                  color="yellow"
                />
                <StatCard
                  label="Under Review"
                  value={stats.underReview}
                  icon={ClipboardList}
                  color="purple"
                />
              </div>
            )}

            {/* Recent Pending Applications Queue */}
            {!loading && recentApplications.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Recent Pending Applications
                  </h2>
                  <Link
                    to="/applications"
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    View All →
                  </Link>
                </div>
                <div className="space-y-3">
                  {recentApplications.map((app) => (
                    <Link
                      key={app.application_id}
                      to={`/applications/${app.application_id}`}
                      className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {app.application_id}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {app.product_code} • ₹{app.requested_amount?.toLocaleString() || 'N/A'}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          app.status === 'Submitted' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                          app.status === 'PendingVerification' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                          'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                        }`}>
                          {app.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              {opsPersona?.features.map((feature) => (
                <div
                  key={feature.title}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {feature.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Live Ops Workflows
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <OpsWorkflowCard
                  title="Document Quality Check"
                  description="Leverage the existing document upload + status APIs to audit submissions."
                  link="/applications"
                />
                <OpsWorkflowCard
                  title="Underwriting Review"
                  description="Use the underwriting & sanction views to review eligibility and approval letters."
                  link="/applications/:id/underwriting"
                />
                <OpsWorkflowCard
                  title="Sanction & Disbursement"
                  description="Demonstrate sanction letters, payment schedules, and disbursement tracking."
                  link="/applications/:id/sanction"
                />
                <OpsWorkflowCard
                  title="Payments & Collections"
                  description="Showcase repayment schedules, payment receipts, and escalation flows."
                  link="/applications/:id/payments"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  color 
}: { 
  label: string; 
  value: number; 
  icon: any; 
  color: 'blue' | 'emerald' | 'yellow' | 'purple' 
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-300',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function OpsWorkflowCard({
  title,
  description,
  link,
}: {
  title: string;
  description: string;
  link: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm bg-white dark:bg-gray-900/40">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-5 w-5 text-emerald-600" />
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{description}</p>
      <div className="mt-3 text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
        Suggested route: {link}
      </div>
    </div>
  );
}

