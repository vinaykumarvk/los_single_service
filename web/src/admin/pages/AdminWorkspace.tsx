import { ClipboardCheck, Database, Settings, Shield } from 'lucide-react';
import PersonaMenu from '../../components/PersonaMenu';
import { personaConfigs } from '../../persona/config';

const adminPersona = personaConfigs.find((persona) => persona.id === 'admin');

export default function AdminWorkspace() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <PersonaMenu className="lg:w-72" />

          <div className="flex-1 space-y-8">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 p-6">
              <div className="flex flex-col gap-3">
                <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  LOS Portal
                </p>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Admin Console
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Configure products, masters, rules, access control, and automation monitor for all
                  LOS services.
                </p>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <AdminStat label="Products" value="12" />
                <AdminStat label="Active Personas" value="3" />
                <AdminStat label="Automation Jobs" value="24" />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {adminPersona?.features.map((feature) => (
                <div
                  key={feature.title}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-200">
                      <Settings className="h-5 w-5" />
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

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Demo Playbook
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Use the existing LOS modules to showcase configuration-to-execution journeys:
              </p>
              <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-200">
                <li>
                  <span className="font-semibold">Masters:</span> Show product catalog & rule store
                  using the masters service (API + DB tables).
                </li>
                <li>
                  <span className="font-semibold">Access Control:</span> Highlight persona-based
                  routing (RM/Ops/Admin) and Supabase-auth roles.
                </li>
                <li>
                  <span className="font-semibold">Automation:</span> Reference the outbox,
                  notification publisher, and CRON workers for alerts.
                </li>
                <li>
                  <span className="font-semibold">Monitoring:</span> Use Supabase logs + Grafana
                  dashboards (if connected) for SLA tracking.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4 bg-white dark:bg-gray-900/40">
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

