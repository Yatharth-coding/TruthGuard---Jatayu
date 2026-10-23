import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Upload,
  MessageSquare,
  ArrowRight,
  Clock,
  GitCommit,
} from 'lucide-react';
import { getDocuments } from '../api/documents';
import { getConversations } from '../api/conversations';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { formatDate } from '../utils/format';

export default function DashboardPage() {
  const [documents, setDocuments] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [docsRes, convsRes] = await Promise.all([
        getDocuments({ limit: 100 }),
        getConversations({ limit: 50 }),
      ]);

      const docList = docsRes.documents || docsRes.data || (Array.isArray(docsRes) ? docsRes : []);
      const convList = convsRes.conversations || convsRes.data || (Array.isArray(convsRes) ? convsRes : []);

      setDocuments(docList);
      setConversations(convList);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Calculating repository metrics..." size="lg" />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchData} />;
  }

  // Calculate Stat Cards
  const totalDocuments = documents.length;
  const processedDocuments = documents.filter(
    (d) => (d.processingStatus || d.status) === 'processed'
  ).length;

  // Calculate total questions asked across conversations
  let totalQuestions = 0;
  let conflictsDetected = 0;

  conversations.forEach((conv) => {
    if (conv.messages && Array.isArray(conv.messages)) {
      totalQuestions += conv.messages.filter((m) => m.role === 'user').length;
      conflictsDetected += conv.messages.filter(
        (m) =>
          m.evidenceStatus === 'conflict_detected' ||
          (m.conflicts && m.conflicts.length > 0)
      ).length;
    } else {
      // Fallbacks if messages not expanded
      totalQuestions += conv.messageCount || 1;
      if (conv.hasConflict || conv.status === 'conflict_detected') {
        conflictsDetected += 1;
      }
    }
  });

  const recentDocuments = [...documents]
    .sort((a, b) => new Date(b.createdAt || b.uploadDate || 0) - new Date(a.createdAt || a.uploadDate || 0))
    .slice(0, 5);

  const recentConversations = [...conversations]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">TruthGuard Intelligence Center</h2>
          <p className="text-sm text-gray-500 mt-1">
            Real-time multi-agent document analysis, version verification, and conflict detection.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/documents"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </Link>
          <Link
            to="/chat"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg text-sm font-semibold transition-colors shadow-xs"
          >
            <MessageSquare className="w-4 h-4 text-brand-600" />
            <span>New Research</span>
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Documents */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Documents
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900 mt-3">{totalDocuments}</p>
          <p className="text-xs text-gray-500 mt-1">Ingested in verified knowledge base</p>
        </div>

        {/* Card 2: Processed */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Processed & Vectorized
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 mt-3">{processedDocuments}</p>
          <p className="text-xs text-gray-500 mt-1">
            {totalDocuments > 0
              ? `${Math.round((processedDocuments / totalDocuments) * 100)}% parsed successfully`
              : '0% parsed'}
          </p>
        </div>

        {/* Card 3: Questions Asked */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Questions Analyzed
            </span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-brand-600 mt-3">{totalQuestions}</p>
          <p className="text-xs text-gray-500 mt-1">Across multi-agent inquiry sessions</p>
        </div>

        {/* Card 4: Conflicts Detected */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Conflicts Flagged
            </span>
            <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-rose-600 mt-3">{conflictsDetected}</p>
          <p className="text-xs text-gray-500 mt-1">Temporal & supersession contradictions</p>
        </div>
      </div>

      {/* Two Columns: Recent Documents & Recent Q&A */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Documents */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs flex flex-col">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">Recent Documents</h3>
              <p className="text-xs text-gray-500 mt-0.5">Latest documents added to the repository</p>
            </div>
            <Link
              to="/documents"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-5 flex-1 flex flex-col justify-center">
            {recentDocuments.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No documents yet"
                description="Upload policies, contracts, or specifications to begin adversarial verification."
                actionLabel="Upload First Document"
                onAction={() => navigate('/documents')}
              />
            ) : (
              <div className="divide-y divide-gray-100">
                {recentDocuments.map((doc) => (
                  <div
                    key={doc._id || doc.id}
                    onClick={() => navigate(`/documents/${doc._id || doc.id}`)}
                    className="py-3.5 flex items-center justify-between hover:bg-gray-50 rounded-lg px-2 -mx-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-brand-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{doc.title}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          {doc.versionLabel && (
                            <span className="inline-flex items-center gap-0.5 font-medium text-gray-600">
                              <GitCommit className="w-3 h-3" />
                              {doc.versionLabel}
                            </span>
                          )}
                          <span>•</span>
                          <span>{formatDate(doc.createdAt || doc.uploadDate)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-3">
                      <StatusBadge status={doc.processingStatus || doc.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Q&A Conversations */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs flex flex-col">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">Recent Q&A Investigations</h3>
              <p className="text-xs text-gray-500 mt-0.5">Recent multi-agent verification inquiries</p>
            </div>
            <Link
              to="/chat"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
            >
              Open Research <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-5 flex-1 flex flex-col justify-center">
            {recentConversations.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No investigations yet"
                description="Query the TruthGuard multi-agent pipeline to verify claims against your documents."
                actionLabel="Ask a Question"
                onAction={() => navigate('/chat')}
              />
            ) : (
              <div className="divide-y divide-gray-100">
                {recentConversations.map((conv) => (
                  <div
                    key={conv._id || conv.id}
                    onClick={() => navigate(`/chat/${conv._id || conv.id}`)}
                    className="py-3.5 flex items-center justify-between hover:bg-gray-50 rounded-lg px-2 -mx-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {conv.title || 'Untitled Session'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(conv.updatedAt || conv.createdAt, true)}
                          </span>
                          {conv.messages && (
                            <>
                              <span>•</span>
                              <span>{conv.messages.length} messages</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-3">
                      {conv.status ? (
                        <StatusBadge status={conv.status} />
                      ) : (
                        <span className="text-xs text-gray-400 group-hover:text-brand-600 flex items-center gap-1">
                          Resume <ArrowRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
