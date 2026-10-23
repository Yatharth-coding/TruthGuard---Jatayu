import React from 'react';

export default function StatusBadge({ status }) {
  if (!status) return null;

  const normalized = String(status).toLowerCase().trim();

  let colorClasses = 'bg-gray-100 text-gray-700 border-gray-200';
  let dotColor = 'bg-gray-400';

  switch (normalized) {
    case 'supported':
    case 'processed':
    case 'active':
    case 'success':
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      dotColor = 'bg-emerald-500';
      break;

    case 'conflict_detected':
    case 'failed':
    case 'verification_error':
    case 'error':
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
      dotColor = 'bg-rose-500';
      break;

    case 'unresolved':
    case 'warning':
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
      dotColor = 'bg-amber-500';
      break;

    case 'pending':
    case 'processing':
      colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
      dotColor = 'bg-blue-500 animate-pulse';
      break;

    case 'insufficient_evidence':
    default:
      colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
      dotColor = 'bg-slate-400';
      break;
  }

  const label = normalized.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${colorClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
}
