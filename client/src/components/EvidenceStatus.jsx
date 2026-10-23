import React from 'react';
import { ShieldCheck, AlertTriangle, HelpCircle, Info, XCircle } from 'lucide-react';

export default function EvidenceStatus({ status, message }) {
  if (!status) return null;

  const normalized = String(status).toLowerCase().trim();

  let config = {
    icon: Info,
    label: 'Status Unknown',
    containerClasses: 'bg-gray-50 border-gray-200 text-gray-800',
    iconClasses: 'text-gray-500',
    badgeClasses: 'bg-gray-200 text-gray-800',
  };

  switch (normalized) {
    case 'supported':
    case 'verified':
      config = {
        icon: ShieldCheck,
        label: 'Verified & Supported by Documents',
        containerClasses: 'bg-emerald-50/70 border-emerald-200 text-emerald-900',
        iconClasses: 'text-emerald-600',
        badgeClasses: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      };
      break;

    case 'conflict_detected':
      config = {
        icon: AlertTriangle,
        label: 'Cross-Document Conflict Detected',
        containerClasses: 'bg-rose-50/70 border-rose-200 text-rose-900',
        iconClasses: 'text-rose-600',
        badgeClasses: 'bg-rose-100 text-rose-800 border-rose-300',
      };
      break;

    case 'unresolved':
      config = {
        icon: HelpCircle,
        label: 'Unresolved Evidence Conflict',
        containerClasses: 'bg-amber-50/70 border-amber-200 text-amber-900',
        iconClasses: 'text-amber-600',
        badgeClasses: 'bg-amber-100 text-amber-800 border-amber-300',
      };
      break;

    case 'insufficient_evidence':
      config = {
        icon: Info,
        label: 'Insufficient Evidence in Corpus',
        containerClasses: 'bg-slate-50/80 border-slate-200 text-slate-800',
        iconClasses: 'text-slate-500',
        badgeClasses: 'bg-slate-200 text-slate-800 border-slate-300',
      };
      break;

    case 'verification_error':
      config = {
        icon: XCircle,
        label: 'Verification Error',
        containerClasses: 'bg-red-50/70 border-red-200 text-red-900',
        iconClasses: 'text-red-600',
        badgeClasses: 'bg-red-100 text-red-800 border-red-300',
      };
      break;

    default:
      config = {
        icon: Info,
        label: normalized.replace(/_/g, ' '),
        containerClasses: 'bg-gray-50 border-gray-200 text-gray-800',
        iconClasses: 'text-gray-500',
        badgeClasses: 'bg-gray-200 text-gray-800 border-gray-300',
      };
  }

  const IconComponent = config.icon;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${config.containerClasses} mb-3`}>
      <IconComponent className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconClasses}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${config.badgeClasses}`}>
            {config.label}
          </span>
        </div>
        {message && (
          <p className="text-xs font-normal mt-1 text-gray-700 leading-relaxed">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
