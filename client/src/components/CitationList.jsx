import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ExternalLink, Calendar, GitCommit } from 'lucide-react';
import { formatDate, truncateText } from '../utils/format';

export default function CitationList({ citations = [] }) {
  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-gray-100">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
        <BookOpen className="w-3.5 h-3.5" />
        <span>Citations & Evidence Sources ({citations.length})</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {citations.map((citation, index) => {
          const docId = citation.documentId || citation.document?._id || citation.document || citation.id;
          const docTitle = citation.documentTitle || citation.title || citation.document?.title || `Document [${index + 1}]`;
          const excerpt = citation.excerpt || citation.text || citation.snippet || '';
          const version = citation.versionLabel || citation.document?.versionLabel || citation.version;
          const effectiveDate = citation.effectiveDate || citation.document?.effectiveDate;

          const CardContent = (
            <div className="h-full flex flex-col justify-between p-3 rounded-lg border border-gray-200 bg-gray-50/70 hover:bg-brand-50/50 hover:border-brand-300 transition-colors group">
              <div>
                <div className="flex items-start justify-between gap-1 mb-1">
                  <span className="text-xs font-semibold text-gray-900 group-hover:text-brand-700 line-clamp-1">
                    [{index + 1}] {docTitle}
                  </span>
                  {docId && (
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-brand-600 flex-shrink-0 mt-0.5" />
                  )}
                </div>

                {excerpt && (
                  <p className="text-xs text-gray-600 italic line-clamp-2 mt-1">
                    "{truncateText(excerpt, 150)}"
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-2 pt-1 border-t border-gray-200/50">
                {version && (
                  <span className="inline-flex items-center gap-0.5">
                    <GitCommit className="w-3 h-3" />
                    {version}
                  </span>
                )}
                {effectiveDate && (
                  <span className="inline-flex items-center gap-0.5">
                    <Calendar className="w-3 h-3" />
                    {formatDate(effectiveDate)}
                  </span>
                )}
              </div>
            </div>
          );

          return docId ? (
            <Link key={citation._id || index} to={`/documents/${docId}`} className="block">
              {CardContent}
            </Link>
          ) : (
            <div key={citation._id || index}>{CardContent}</div>
          );
        })}
      </div>
    </div>
  );
}
