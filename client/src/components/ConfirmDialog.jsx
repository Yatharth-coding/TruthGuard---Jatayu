import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div
        className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden transform transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              {danger ? (
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 text-brand-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              )}
              <h3 id="dialog-title" className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-500 rounded-lg p-1 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-3 ml-13 pl-1">
            <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                danger
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  : 'bg-brand-600 hover:bg-brand-700 focus:ring-brand-500'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
