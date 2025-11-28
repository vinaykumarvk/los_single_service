import { ReactNode } from 'react';

export interface PersonaFeature {
  title: string;
  description: string;
  actionLabel?: string;
  actionPath?: string;
}

export interface PersonaConfig {
  id: 'rm' | 'ops' | 'admin';
  label: string;
  shortLabel: string;
  description: string;
  path: string;
  accent: string;
  features: PersonaFeature[];
}

export const personaConfigs: PersonaConfig[] = [
  {
    id: 'rm',
    label: 'RM Workspace',
    shortLabel: 'RM',
    description: 'Relationship Manager pipeline, loan applications, and customer journeys.',
    path: '/rm',
    accent: 'from-blue-500 to-indigo-500',
    features: [
      { title: 'Pipeline Dashboard', description: 'Track assigned applications, SLAs, and targets.', actionLabel: 'View Dashboard', actionPath: '/rm' },
      { title: 'Create / Resume Applications', description: 'Capture applicant info, upload docs, and run CIBIL.', actionLabel: 'New Application', actionPath: '/rm/applications/new' },
      { title: 'Real-time Updates', description: 'SSE-powered status cards, alerts, and review flows.' },
    ],
  },
  {
    id: 'ops',
    label: 'Ops Control Center',
    shortLabel: 'Ops',
    description: 'Operations teams handle KYC, document QC, underwriting, and sanction flows.',
    path: '/ops',
    accent: 'from-emerald-500 to-teal-500',
    features: [
      { title: 'KYC & Verification Queue', description: 'Review KYC submissions, manage eKYC flows, and trigger rework.' },
      { title: 'Document & Compliance Audits', description: 'Centralized document checklist with audit comments.' },
      { title: 'Underwriting + Sanction Handoffs', description: 'Ops-to-credit flows with SLA monitoring and escalations.' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin Console',
    shortLabel: 'Admin',
    description: 'Configure masters, access control, product rules, and observability.',
    path: '/admin',
    accent: 'from-orange-500 to-pink-500',
    features: [
      { title: 'Masters & Product Setup', description: 'Manage product catalog, rule store, and reference data.' },
      { title: 'User & Role Governance', description: 'Assign personas, RBAC policies, and approval matrices.' },
      { title: 'Observability & Automation', description: 'Outbox monitors, alerts, CRON workflows, and SLA dashboards.' },
    ],
  },
];

