import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function ErrorMessage({ message = 'An unexpected error occurred.', onRetry }) {
  if (!message) return null;

  return (
    <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 flex items-start space-x-3">
      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-red-800">Error</h4>
        <p className="text-sm text-red-700 mt-1 whitespace-pre-wrap">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-md transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
