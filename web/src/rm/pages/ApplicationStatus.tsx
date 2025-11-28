import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, AlertCircle, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { rmAPI } from '../lib/api';
import ApplicationStepWrapper from '../components/ApplicationStepWrapper';
import { useToast as useToastHook } from '../../components/ui/Toast';

interface TimelineEvent {
  history_id?: string;
  event_id?: string;
  event_type: string;
  event_source: string;
  event_data: Record<string, any>;
  actor_id?: string;
  occurred_at?: string;
  created_at?: string;
}

interface ApplicationSummary {
  application_id: string;
  applicant_id?: string;
  status: string;
  channel?: string;
  product_code?: string;
  requested_amount?: number;
  requested_tenure_months?: number;
  created_at?: string;
  updated_at?: string;
}

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  Draft: { label: 'Draft', color: 'text-gray-700', bg: 'bg-gray-100' },
  Submitted: { label: 'Submitted', color: 'text-blue-700', bg: 'bg-blue-100' },
  PendingVerification: { label: 'Pending Verification', color: 'text-amber-700', bg: 'bg-amber-100' },
  UnderReview: { label: 'Under Review', color: 'text-purple-700', bg: 'bg-purple-100' },
  Approved: { label: 'Approved', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  Rejected: { label: 'Rejected', color: 'text-rose-700', bg: 'bg-rose-100' },
};

export default function ApplicationStatus() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToastHook();

  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [application, setApplication] = useState<ApplicationSummary | null>(null);
  const [sseConnected, setSseConnected] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadData(id);
    const source = new EventSource(`/api/applications/${id}/events`);

    source.addEventListener('connected', () => setSseConnected(true));
    source.addEventListener('status', () => {
      loadTimeline(id);
      loadApplication(id);
    });
    source.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      source.close();
    };
  }, [id]);

  const loadData = async (applicationId: string) => {
    setLoading(true);
    try {
      await Promise.all([loadApplication(applicationId), loadTimeline(applicationId)]);
    } catch (error: any) {
      addToast({ type: 'error', message: error?.message || 'Failed to load status' });
    } finally {
      setLoading(false);
    }
  };

  const loadApplication = async (applicationId: string) => {
    const response = await rmAPI.applications.get(applicationId);
    setApplication((response.data || response) as ApplicationSummary);
  };

  const loadTimeline = async (applicationId: string) => {
    const response = await rmAPI.applications.getTimeline(applicationId);
    const data = response.data || response;
    setTimeline((data.timeline || data || []) as TimelineEvent[]);
  };

  const enhancedTimeline = useMemo(() => {
    return [...timeline]
      .sort((a, b) => {
        const dateA = new Date(a.occurred_at || a.created_at || '').getTime();
        const dateB = new Date(b.occurred_at || b.created_at || '').getTime();
        return dateB - dateA;
      })
      .map((event) => {
        const status = event.event_data?.status || event.event_data?.newStatus;
        return {
          ...event,
          statusStyle: status && STATUS_STYLES[status] ? STATUS_STYLES[status] : undefined,
        };
      });
  }, [timeline]);

  if (!id) {
    return (
      <ApplicationStepWrapper>
        <div className="text-center text-gray-500">Application ID missing.</div>
      </ApplicationStepWrapper>
    );
  }

  if (loading) {
    return (
      <ApplicationStepWrapper>
        <div className="flex items-center justify-center min-h-64">
          <Spinner />
        </div>
      </ApplicationStepWrapper>
    );
  }

  return (
    <ApplicationStepWrapper>
      <div className="flex flex-col gap-4">

        <div className="flex items-center justify-between flex-wrap gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="text-sm text-gray-500">
            SSE: {sseConnected ? <span className="text-emerald-600">Live</span> : 'Offline'}
          </div>
        </div>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border-none shadow-lg">
          <CardContent className="py-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Application
                </p>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  #{application?.application_id}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {application?.product_code} • {application?.channel}
                </p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Current Status
                </p>
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                  application?.status && STATUS_STYLES[application.status]
                    ? `${STATUS_STYLES[application.status].bg} ${STATUS_STYLES[application.status].color}`
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {application?.status || 'Unknown'}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <StatusMetric
                label="Requested Amount"
                value={
                  application?.requested_amount
                    ? `₹${(application.requested_amount / 100000).toFixed(2)} L`
                    : '—'
                }
              />
              <StatusMetric
                label="Tenure"
                value={
                  application?.requested_tenure_months
                    ? `${application.requested_tenure_months / 12} yrs`
                    : '—'
                }
              />
              <StatusMetric
                label="Created"
                value={application?.created_at ? new Date(application.created_at).toLocaleString() : '—'}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {enhancedTimeline.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No history available yet. Actions will show up here automatically.
              </div>
            ) : (
              <div className="space-y-6">
                {enhancedTimeline.map((event, index) => (
                  <div key={event.history_id || `${event.event_type}-${index}`} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`rounded-full p-2 ${
                        event.statusStyle ? event.statusStyle.bg : 'bg-gray-100'
                      }`}>
                        <StatusIcon type={event.event_type} />
                      </div>
                      {index < enhancedTimeline.length - 1 && (
                        <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 mt-2" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap justify-between items-start gap-2">
                        <div>
                          <p className="text-base font-semibold text-gray-900 dark:text-white">
                            {formatEventType(event.event_type)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(event.occurred_at || event.created_at || '').toLocaleString()}
                          </p>
                        </div>
                        {event.statusStyle && (
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${event.statusStyle.bg} ${event.statusStyle.color}`}>
                            {event.event_data.status || event.event_data.newStatus}
                          </span>
                        )}
                      </div>
                      <dl className="mt-2 text-sm text-gray-600 dark:text-gray-300 grid gap-1">
                        {Object.entries(event.event_data || {})
                          .filter(([key]) => key !== 'status' && key !== 'newStatus')
                          .map(([key, value]) => (
                            <div key={key} className="flex gap-2">
                              <dt className="font-medium capitalize">{formatKey(key)}:</dt>
                              <dd className="text-gray-700 dark:text-gray-200">{formatValue(value)}</dd>
                            </div>
                          ))}
                        {event.actor_id && (
                          <div className="flex gap-2">
                            <dt className="font-medium">Actor:</dt>
                            <dd>{event.actor_id}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ApplicationStepWrapper>
  );
}

function StatusMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/40 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function StatusIcon({ type }: { type: string }) {
  if (type.toLowerCase().includes('submit')) {
    return <Send className="h-4 w-4 text-blue-700" />;
  }
  if (type.toLowerCase().includes('approve')) {
    return <CheckCircle2 className="h-4 w-4 text-emerald-700" />;
  }
  if (type.toLowerCase().includes('reject')) {
    return <AlertCircle className="h-4 w-4 text-rose-700" />;
  }
  return <Clock className="h-4 w-4 text-gray-600" />;
}

function formatEventType(type: string) {
  return type.replace(/([A-Z])/g, ' $1').trim();
}

function formatKey(key: string) {
  return key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
}

function formatValue(value: any) {
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number' && value > 100000) {
    return `₹${(value / 100000).toFixed(2)} L`;
  }
  return value?.toString() ?? '—';
}

