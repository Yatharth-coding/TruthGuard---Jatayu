import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-6 shadow-xs">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h1 className="text-6xl font-extrabold text-gray-900 tracking-tight">404</h1>
        <h2 className="text-xl font-bold text-gray-800 mt-2">Resource Not Found</h2>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          The requested document, conversation, or verification route does not exist or has been relocated.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Home className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
}
