import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Trash2,
  Calendar,
  Tag,
  GitCommit,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { getDocument, getDocumentVersions, deleteDocument } from '../api/documents';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatDate, formatFileSize } from '../utils/format';

export default function DocumentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [document, setDocument] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showFullText, setShowFullText] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const fetchDocumentData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [docRes, versRes] = await Promise.all([
        getDocument(id),
        getDocumentVersions(id).catch(() => ({ versions: [] })),
      ]);

      const doc = docRes.document || docRes.data || docRes;
      setDocument(doc);

      const vers = versRes.versions || versRes.data || (Array.isArray(versRes) ? versRes : []);
      setVersions(vers);
    } catch (err) {
      console.error('Failed to load document details:', err);
      setError(err.response?.data?.message || 'Document not found or unable to load details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocumentData();
  }, [id]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteDocument(id);
      navigate('/documents', { replace: true });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete document.');
      setIsDeleting(false);
      setConfirmDeleteOpen(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Retrieving document specifications..." size="lg" />;
  }

  if (error || !document) {
    return (
      <div className="space-y-4">
        <Link
          to="/documents"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Documents
        </Link>
        <ErrorMessage message={error || 'Document not found'} onRetry={fetchDocumentData} />
      </div>
    );
  }

  const rawText = document.extractedText || document.content || document.text || '';
  const textLimit = 5000;
  const isTextLong = rawText.length > textLimit;
  const displayText = showFullText || !isTextLong ? rawText : rawText.slice(0, textLimit);

  const status = (document.processingStatus || document.status || '').toLowerCase();
  const supersedingDoc = document.supersededBy || document.supersededByDocument;
  const priorDoc = document.supersedes || document.supersedesDocument;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <button
          onClick={() => navigate('/documents')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Document Library</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setConfirmDeleteOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-lg text-sm font-semibold transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Document</span>
          </button>
        </div>
      </div>

      {/* Superseded Warning Banner if document is superseded */}
      {supersedingDoc && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-xs flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <h4 className="font-bold text-amber-900">Document Superseded by Newer Version</h4>
            <p className="text-amber-800 mt-0.5">
              This document has been superseded. Precedence rules favor clauses from the newer version in adversarial verifications.
            </p>
            {typeof supersedingDoc === 'object' && supersedingDoc._id && (
              <Link
                to={`/documents/${supersedingDoc._id}`}
                className="mt-2 inline-flex items-center gap-1 font-semibold text-amber-950 underline hover:text-black"
              >
                View Newer Version: {supersedingDoc.title || 'Updated Document'}{' '}
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Prior Document Notice if this document supersedes another */}
      {priorDoc && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg shadow-xs flex items-start gap-3">
          <Layers className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <h4 className="font-bold text-blue-900">Supersedes Prior Document</h4>
            <p className="text-blue-800 mt-0.5">
              This document officially supersedes an earlier version or standard.
            </p>
            {typeof priorDoc === 'object' && priorDoc._id && (
              <Link
                to={`/documents/${priorDoc._id}`}
                className="mt-2 inline-flex items-center gap-1 font-semibold text-blue-950 underline hover:text-black"
              >
                View Prior Document: {priorDoc.title || 'Superseded Document'}{' '}
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Document Header Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <StatusBadge status={status} />
              {document.category && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  <Tag className="w-3 h-3 text-gray-500" />
                  {document.category}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              File: <span className="font-medium text-gray-700">{document.originalFilename || 'Unknown file'}</span>
              {document.fileSize ? ` • ${formatFileSize(document.fileSize)}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
            <GitCommit className="w-4 h-4 text-brand-600" />
            <span className="text-xs font-bold text-gray-700">Version: {document.versionLabel || 'v1.0'}</span>
          </div>
        </div>

        {/* Description if present */}
        {document.description && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</h4>
            <p className="text-sm text-gray-700 leading-relaxed">{document.description}</p>
          </div>
        )}

        {/* Detailed Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div>
            <span className="text-xs text-gray-500">Effective Date</span>
            <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              {formatDate(document.effectiveDate)}
            </p>
          </div>

          <div>
            <span className="text-xs text-gray-500">Publication Date</span>
            <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              {formatDate(document.publicationDate)}
            </p>
          </div>

          <div>
            <span className="text-xs text-gray-500">Expiration Date</span>
            <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              {formatDate(document.expirationDate)}
            </p>
          </div>

          <div>
            <span className="text-xs text-gray-500">Ingested Date</span>
            <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {formatDate(document.createdAt || document.uploadDate, true)}
            </p>
          </div>
        </div>
      </div>

      {/* Processing or Failed State Alerts */}
      {status === 'processing' || status === 'pending' ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <LoadingSpinner message="Extracting text and generating multi-agent vectors..." />
          <p className="text-xs text-blue-600 mt-2">
            This document is being processed. Text extraction and embedding chunks will appear shortly.
          </p>
        </div>
      ) : status === 'failed' ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-2 text-red-800 font-semibold mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span>Document Ingestion Failed</span>
          </div>
          <p className="text-sm text-red-700">
            {document.errorMessage ||
              document.error ||
              'TruthGuard failed to parse the document. Verify that the file is not corrupted or password-protected.'}
          </p>
        </div>
      ) : null}

      {/* Extracted Text Viewer */}
      {rawText && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-600" />
              <h3 className="font-bold text-gray-900">Extracted Document Text</h3>
            </div>
            <span className="text-xs text-gray-500 font-mono">
              {rawText.length.toLocaleString()} characters total
            </span>
          </div>

          <div className="p-5">
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-gray-200 max-h-[500px] overflow-y-auto whitespace-pre-wrap leading-relaxed select-text">
              {displayText}
              {isTextLong && !showFullText && '... [truncated for performance preview]'}
            </div>

            {isTextLong && (
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={() => setShowFullText(!showFullText)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  {showFullText ? (
                    <>
                      <ChevronUp className="w-4 h-4" /> Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" /> Show Complete Text ({rawText.length.toLocaleString()} chars)
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Version History Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-gray-900">Version History & Lineage</h3>
          </div>
          <span className="text-xs text-gray-500">{versions.length} versions tracked</span>
        </div>

        {versions.length === 0 ? (
          <p className="text-sm text-gray-500 mt-4">
            No alternate lineage versions found. This document is currently the sole version in its branch.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 mt-2">
            {versions.map((ver) => {
              const verId = ver._id || ver.id;
              const isCurrent = verId === id;

              return (
                <div
                  key={verId}
                  className={`py-3.5 flex items-center justify-between ${
                    isCurrent ? 'bg-brand-50/50 -mx-3 px-3 rounded-lg' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-700">
                      <GitCommit className="w-4 h-4 text-brand-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 truncate">{ver.title}</span>
                        {isCurrent && (
                          <span className="text-[10px] bg-brand-600 text-white font-bold px-2 py-0.5 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        <span className="font-medium text-gray-700">{ver.versionLabel || 'v1.0'}</span>
                        <span>•</span>
                        <span>Effective: {formatDate(ver.effectiveDate)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={ver.processingStatus || ver.status} />
                    {!isCurrent && (
                      <Link
                        to={`/documents/${verId}`}
                        className="text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
                      >
                        Inspect <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Delete Document"
        message={`Are you sure you want to delete "${document.title}"? This cannot be undone.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
        danger={true}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
