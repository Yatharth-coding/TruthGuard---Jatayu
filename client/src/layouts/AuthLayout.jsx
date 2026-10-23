import React from 'react';
import { Shield } from 'lucide-react';
import DemoModeBanner from '../components/DemoModeBanner';

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-100 to-indigo-50/30 flex flex-col justify-center items-center p-4">
      <div className="fixed top-0 left-0 right-0 z-50">
        <DemoModeBanner />
      </div>

      <div className="w-full max-w-md">
        {/* TruthGuard Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/30 mb-3">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">TruthGuard</h1>
          <p className="text-sm text-gray-500 mt-1 text-center">
            Adversarial Verification for Multi-Agent Document Q&A
          </p>
        </div>

        {/* Card Content */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xl shadow-gray-200/50 p-8">
          {children}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} TruthGuard System. All rights reserved.
        </div>
      </div>
    </div>
  );
}
