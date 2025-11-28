import { CheckCircle2, ClipboardList, FileCheck, ShieldCheck } from 'lucide-react';
import PersonaMenu from '../../components/PersonaMenu';
import { personaConfigs } from '../../persona/config';
import { Link } from 'react-router-dom';

const opsPersona = personaConfigs.find((persona) => persona.id === 'ops');

export default function OpsWorkspace() {
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

