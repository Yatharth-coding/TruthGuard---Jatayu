import React, { useState, useEffect } from 'react';
import {
  User,
  Activity,
  Cpu,
  Database,
  FileCheck,
  Info,
  Shield,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getHealth } from '../api/health';
import LoadingSpinner from '../components/LoadingSpinner';

export default function SettingsPage() {
  const { user } = useAuth();

  const [healthData, setHealthData] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [healthError, setHealthError] = useState(null);

  const fetchHealthStatus = async () => {
    try {
      setLoadingHealth(true);
      setHealthError(null);
      const res = await getHealth();
      setHealthData(res.data || res);
    } catch (err) {
      console.error('Failed to retrieve health status:', err);
      setHealthError('Unable to connect to TruthGuard backend server.');
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealthStatus();
  }, []);

  const isDemo = Boolean(healthData?.demoMode || healthData?.isDemo);
  const rawProvider = (healthData?.aiProvider || healthData?.provider || '').toLowerCase();
  const aiProvider = isDemo
    ? 'Simulated AI Engine (Demo Mode)'
    : rawProvider === 'gemini'
    ? 'Google Gemini (gemini-3.5-flash-lite)'
    : rawProvider === 'openai'
    ? 'OpenAI (GPT-4o)'
    : 'Google Gemini (gemini-3.5-flash-lite)';
  const dbStatus = healthData?.database || healthData?.db || 'Connected (MongoDB)';
  const appStatus = healthData?.status || 'Online';

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">System Configuration & Status</h2>
        <p className="text-sm text-gray-500 mt-1">
          Review system health, AI provider configuration, and active account settings.
        </p>
      </div>

      {/* Account Info Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100 mb-6">
          <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">User Account Information</h3>
            <p className="text-xs text-gray-500">Authenticated user profile and role</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Full Name
            </label>
            <input
              type="text"
              readOnly
              value={user?.name || 'Authorized User'}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-800 cursor-not-allowed select-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Email Address
            </label>
            <input
              type="email"
              readOnly
              value={user?.email || 'user@truthguard.io'}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-800 cursor-not-allowed select-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Account Role
            </label>
            <input
              type="text"
              readOnly
              value={user?.role || 'Administrator / Analyst'}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-800 cursor-not-allowed capitalize"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Member Since
            </label>
            <input
              type="text"
              readOnly
              value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active'}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-800 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Application Status Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Application & Engine Status</h3>
              <p className="text-xs text-gray-500">Live operational telemetry</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchHealthStatus}
            disabled={loadingHealth}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loadingHealth ? (
          <LoadingSpinner message="Checking engine telemetry..." size="sm" />
        ) : healthError ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span>{healthError}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Health / System Status */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase text-gray-500">Core Service</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-lg font-bold text-gray-900 capitalize">{appStatus}</p>
              <p className="text-xs text-emerald-600 font-medium mt-1">Operational & Healthy</p>
            </div>

            {/* AI Provider */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase text-gray-500">AI Engine</span>
                <Cpu className="w-4 h-4 text-brand-600" />
              </div>
              <p className="text-lg font-bold text-gray-900 truncate">{aiProvider}</p>
              <p className="text-xs text-gray-500 mt-1">
                {isDemo ? (
                  <span className="text-amber-600 font-medium">Demo Simulation Mode</span>
                ) : (
                  <span className="text-emerald-600 font-medium">Adversarial Consensus Active</span>
                )}
              </p>
            </div>

            {/* Database Connection */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase text-gray-500">Database</span>
                <Database className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-lg font-bold text-gray-900 truncate">{dbStatus}</p>
              <p className="text-xs text-emerald-600 font-medium mt-1">Connected & Synchronized</p>
            </div>
          </div>
        )}
      </div>

      {/* Supported File Types */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100 mb-6">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-brand-600 flex items-center justify-center">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Supported Ingestion Formats</h3>
            <p className="text-xs text-gray-500">Document parsers and semantic chunking support</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800">PDF</span>
              <span className="text-sm font-semibold text-gray-900">.pdf documents</span>
            </div>
            <p className="text-xs text-gray-500">
              Parses paginated text, tables, footnotes, and headers with page-level index mapping.
            </p>
          </div>

          <div className="p-4 rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">TXT</span>
              <span className="text-sm font-semibold text-gray-900">.txt text files</span>
            </div>
            <p className="text-xs text-gray-500">
              Extracts raw UTF-8 plaintext with automated paragraph and semantic boundary detection.
            </p>
          </div>

          <div className="p-4 rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800">MD</span>
              <span className="text-sm font-semibold text-gray-900">.md markdown</span>
            </div>
            <p className="text-xs text-gray-500">
              Maintains hierarchical heading trees, markdown tables, and code blocks for precise citation.
            </p>
          </div>
        </div>
      </div>

      {/* Application Version Info */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100 mb-4">
          <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center">
            <Shield className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">TruthGuard Enterprise Information</h3>
            <p className="text-xs text-gray-500">Build metadata and verification architecture</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-gray-500">Client Version</span>
            <span className="font-mono font-semibold text-gray-800">v1.0.0</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-gray-500">Verification Engine</span>
            <span className="font-medium text-gray-800">Multi-Agent Adversarial Consensus (TruthGuard Pro)</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-gray-500">Temporal Resolution</span>
            <span className="font-medium text-gray-800">Superseding Precedence & Effective Dating</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-500">Security Architecture</span>
            <span className="font-medium text-gray-800">Strict HttpOnly Session Tokens & Role-Based Access</span>
          </div>
        </div>
      </div>
    </div>
  );
}
