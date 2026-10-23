import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No items found',
  description = 'Get started by creating your first entry.',
  actionLabel,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-lg border border-dashed border-gray-300">
      <div className="p-3 bg-brand-50 text-brand-600 rounded-full mb-4">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-brand-600 hover:bg-brand-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
