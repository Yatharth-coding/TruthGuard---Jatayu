import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Upload,
  FileText,
  Trash2,
  Calendar,
  Tag,
  GitCommit,
  X,
  Filter,
  ArrowUpDown,
  FileCode,
  File,
} from 'lucide-react';
import { getDocuments, uploadDocument, deleteDocument } from '../api/documents';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import { formatDate, formatFileSize, getFileTypeIcon } from '../utils/format';

export default function DocumentLibraryPage() {
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOption, setSortOption] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 9;

  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadForm, setUploadForm] = useState({
    file: null,
    title: '',
    category: '',
    versionLabel: 'v1.0',
    effectiveDate: '',
    publicationDate: '',
    expirationDate: '',
    description: '',
    supersedesDocument: '',
  });

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch documents
  const fetchDocs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getDocuments();
      const docs = res.documents || res.data || (Array.isArray(res) ? res : []);
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError(err.response?.data?.message || 'Failed to retrieve documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  // Filter and Sort Logic
  const filteredDocuments = useMemo(() => {
    return documents
      .filter((doc) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = doc.title?.toLowerCase().includes(q);
          const matchFilename = doc.originalFilename?.toLowerCase().includes(q);
          const matchCategory = doc.category?.toLowerCase().includes(q);
          if (!matchTitle && !matchFilename && !matchCategory) return false;
        }

        // Status filter
        if (statusFilter !== 'all') {
          const status = (doc.processingStatus || doc.status || '').toLowerCase();
          if (status !== statusFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'newest') {
          return new Date(b.createdAt || b.uploadDate || 0) - new Date(a.createdAt || a.uploadDate || 0);
        }
        if (sortOption === 'oldest') {
          return new Date(a.createdAt || a.uploadDate || 0) - new Date(b.createdAt || b.uploadDate || 0);
        }
        if (sortOption === 'title') {
          return (a.title || '').localeCompare(b.title || '');
        }
        return 0;
      });
  }, [documents, searchQuery, statusFilter, sortOption]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredDocuments.length / pageSize) || 1;
  const paginatedDocuments = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredDocuments.slice(startIndex, startIndex + pageSize);
  }, [filteredDocuments, currentPage]);

  // Adjust page if out of bounds after filtering
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Upload Form Handlers
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadForm((prev) => ({
        ...prev,
        file,
        title: prev.title.trim() ? prev.title : file.name.replace(/\.[^/.]+$/, ''),
      }));
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadForm.file) {
      setUploadError('Please choose a file to upload (.pdf, .txt, .md).');
      return;
    }
    if (!uploadForm.title.trim()) {
      setUploadError('Please provide a document title.');
      return;
    }

    setUploadError('');
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', uploadForm.file);
    formData.append('title', uploadForm.title);
    if (uploadForm.category) formData.append('category', uploadForm.category);
    if (uploadForm.versionLabel) formData.append('versionLabel', uploadForm.versionLabel);
    if (uploadForm.effectiveDate) formData.append('effectiveDate', uploadForm.effectiveDate);
    if (uploadForm.publicationDate) formData.append('publicationDate', uploadForm.publicationDate);
    if (uploadForm.expirationDate) formData.append('expirationDate', uploadForm.expirationDate);
    if (uploadForm.description) formData.append('description', uploadForm.description);
    if (uploadForm.supersedesDocument) formData.append('supersedesDocument', uploadForm.supersedesDocument);

    try {
      await uploadDocument(formData, (percent) => {
        setUploadProgress(percent);
      });
      setIsUploadOpen(false);
      setUploadForm({
        file: null,
        title: '',
        category: '',
        versionLabel: 'v1.0',
        effectiveDate: '',
        publicationDate: '',
        expirationDate: '',
        description: '',
        supersedesDocument: '',
      });
      await fetchDocs();
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError(err.response?.data?.message || 'Document upload and ingestion failed.');
    } finally {
      setIsUploading(false);
    }
  };

  // Delete Action Handlers
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteDocument(deleteTarget._id || deleteTarget.id);
      setDeleteTarget(null);
      await fetchDocs();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete document.');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderIcon = (mimeOrName) => {
    const iconType = getFileTypeIcon(mimeOrName);
    if (iconType === 'pdf') return <FileText className="w-5 h-5 text-rose-600" />;
    if (iconType === 'markdown') return <FileCode className="w-5 h-5 text-indigo-600" />;
    return <File className="w-5 h-5 text-blue-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Document Repository</h2>
          <p className="text-sm text-gray-500 mt-1">
            Ingest and govern versioned policy documents for adversarial cross-checking.
          </p>
        </div>
        <button
          onClick={() => {
            setUploadError('');
            setIsUploadOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm self-start sm:self-auto"
        >
          <Upload className="w-4 h-4" />
          <span>Ingest New Document</span>
        </button>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, original filename, or category..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter by Status */}
        <div className="flex items-center gap-2 min-w-[180px]">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none capitalize"
          >
            <option value="all">All Statuses</option>
            <option value="processed">Processed</option>
            <option value="processing">Processing</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 min-w-[160px]">
          <ArrowUpDown className="w-4 h-4 text-gray-400" />
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title">Title (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <LoadingSpinner message="Scanning document repository..." size="lg" />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchDocs} />
      ) : paginatedDocuments.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={searchQuery || statusFilter !== 'all' ? 'No matching documents' : 'Repository is empty'}
          description={
            searchQuery || statusFilter !== 'all'
              ? 'Try modifying your search or clearing the status filter.'
              : 'Upload policy, regulatory, or technical documentation to enable TruthGuard verification.'
          }
          actionLabel={searchQuery || statusFilter !== 'all' ? 'Reset Filters' : 'Upload Document'}
          onAction={
            searchQuery || statusFilter !== 'all'
              ? () => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }
              : () => setIsUploadOpen(true)
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Document Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedDocuments.map((doc) => {
              const docId = doc._id || doc.id;
              return (
                <div
                  key={docId}
                  onClick={() => navigate(`/documents/${docId}`)}
                  className="bg-white rounded-xl border border-gray-200 shadow-xs hover:shadow-md hover:border-brand-400 cursor-pointer transition-all flex flex-col justify-between overflow-hidden group"
                >
                  <div className="p-5">
                    {/* Top Row: Icon + Status */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-50 transition-colors">
                        {renderIcon(doc.mimeType || doc.originalFilename)}
                      </div>
                      <StatusBadge status={doc.processingStatus || doc.status} />
                    </div>

                    {/* Document Title */}
                    <h3 className="font-bold text-gray-900 group-hover:text-brand-600 text-base line-clamp-2 leading-snug">
                      {doc.title}
                    </h3>

                    {/* Original Filename & Size */}
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {doc.originalFilename || 'document'} {doc.fileSize ? `(${formatFileSize(doc.fileSize)})` : ''}
                    </p>

                    {/* Metadata tags */}
                    <div className="mt-4 space-y-2 text-xs text-gray-600">
                      {doc.category && (
                        <div className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-gray-400" />
                          <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-medium">
                            {doc.category}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        {doc.versionLabel && (
                          <div className="flex items-center gap-1 font-semibold text-gray-700">
                            <GitCommit className="w-3.5 h-3.5 text-brand-600" />
                            <span>{doc.versionLabel}</span>
                          </div>
                        )}
                        {doc.effectiveDate && (
                          <div className="flex items-center gap-1 text-gray-500">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>Eff: {formatDate(doc.effectiveDate)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Uploaded date + Delete button */}
                  <div className="bg-gray-50/70 px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">
                      Uploaded {formatDate(doc.createdAt || doc.uploadDate)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(doc);
                      }}
                      title="Delete document"
                      className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={(p) => setCurrentPage(p)} />
        </div>
      )}

      {/* Ingest / Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-gray-200 overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-gray-900 text-lg">Ingest New Document</h3>
              </div>
              <button
                onClick={() => !isUploading && setIsUploadOpen(false)}
                disabled={isUploading}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              {uploadError && <ErrorMessage message={uploadError} />}

              {/* File Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  File (.pdf, .txt, .md) <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer border border-gray-300 rounded-lg p-1.5"
                />
              </div>

              {/* Document Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Document Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  placeholder="e.g. SOC 2 Type II Security Standard"
                  disabled={isUploading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                />
              </div>

              {/* Category & Version Label */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                    placeholder="e.g. Compliance, Legal, Tech"
                    disabled={isUploading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Version Label</label>
                  <input
                    type="text"
                    value={uploadForm.versionLabel}
                    onChange={(e) => setUploadForm({ ...uploadForm, versionLabel: e.target.value })}
                    placeholder="v1.0"
                    disabled={isUploading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Effective Date</label>
                  <input
                    type="date"
                    value={uploadForm.effectiveDate}
                    onChange={(e) => setUploadForm({ ...uploadForm, effectiveDate: e.target.value })}
                    disabled={isUploading}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Publication Date</label>
                  <input
                    type="date"
                    value={uploadForm.publicationDate}
                    onChange={(e) => setUploadForm({ ...uploadForm, publicationDate: e.target.value })}
                    disabled={isUploading}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Expiration Date</label>
                  <input
                    type="date"
                    value={uploadForm.expirationDate}
                    onChange={(e) => setUploadForm({ ...uploadForm, expirationDate: e.target.value })}
                    disabled={isUploading}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>

              {/* Supersedes Document Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supersedes Prior Document (Optional)
                </label>
                <select
                  value={uploadForm.supersedesDocument}
                  onChange={(e) => setUploadForm({ ...uploadForm, supersedesDocument: e.target.value })}
                  disabled={isUploading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  <option value="">None (Standalone or Initial Version)</option>
                  {documents.map((d) => (
                    <option key={d._id || d.id} value={d._id || d.id}>
                      {d.title} ({d.versionLabel || 'v1.0'})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  If selected, TruthGuard will flag older clauses as superseded in adversarial verification.
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  placeholder="Summary of scope, policy context, or revisions..."
                  disabled={isUploading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              {/* Upload Progress Bar */}
              {isUploading && (
                <div className="space-y-1 pt-2">
                  <div className="flex justify-between text-xs text-gray-600 font-medium">
                    <span>Processing & Extracting Content...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-brand-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  disabled={isUploading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-60 shadow-sm"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isUploading ? 'Ingesting...' : 'Ingest Document'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Document"
        message={`Are you sure you want to permanently remove "${deleteTarget?.title}"? All extracted chunks and verified cross-references for this document will be deleted.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Document'}
        danger={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
