import React from 'react';
import { AlertCircle, CheckCircle2, FileText, Calendar, GitCommit } from 'lucide-react';
import { formatDate } from '../utils/format';

export default function ConflictPanel({ conflicts = [] }) {
  if (!conflicts || conflicts.length === 0) return null;

  return (
    <div className="space-y-4 my-4">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-amber-600" />
        <h4 className="font-semibold text-gray-900 text-sm">
          Detected Cross-Document Conflicts ({conflicts.length})
        </h4>
      </div>

      <div className="space-y-4">
        {conflicts.map((conflict, index) => {
          const isResolved = conflict.status === 'resolved' || conflict.resolved === true;
          // Support passages array or passageA/passageB structure
          let passages = [];
          if (Array.isArray(conflict.passages)) {
            passages = conflict.passages;
          } else if (conflict.passageA || conflict.passageB) {
            if (conflict.passageA) passages.push(conflict.passageA);
            if (conflict.passageB) passages.push(conflict.passageB);
          } else if (conflict.documents && Array.isArray(conflict.documents)) {
            passages = conflict.documents;
          }

          const borderColor = isResolved
            ? 'border-emerald-300 bg-emerald-50/40'
            : 'border-amber-400 bg-amber-50/30';

          return (
            <div
              key={conflict.id || conflict._id || index}
              className={`rounded-lg border-2 p-4 transition-all shadow-sm ${borderColor}`}
            >
              {/* Conflict Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200/80 gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-200 text-gray-800">
                    Conflict #{index + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {conflict.type || conflict.issue || conflict.description || 'Contradictory Information'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  {isResolved ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Resolved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Unresolved
                    </span>
                  )}
                </div>
              </div>

              {/* Side-by-Side Passages */}
              {passages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                  {passages.map((p, pIdx) => (
                    <div
                      key={pIdx}
                      className="bg-white rounded-lg border border-gray-200 p-3.5 shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <FileText className="w-4 h-4 text-brand-600 flex-shrink-0" />
                            <span className="text-xs font-bold text-gray-800 truncate" title={p.documentTitle || p.title || `Document ${pIdx + 1}`}>
                              {p.documentTitle || p.title || `Document ${pIdx + 1}`}
                            </span>
                          </div>
                          {p.versionLabel && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
                              <GitCommit className="w-3 h-3" />
                              {p.versionLabel}
                            </span>
                          )}
                        </div>

                        {p.effectiveDate && (
                          <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-2">
                            <Calendar className="w-3 h-3" />
                            <span>Effective: {formatDate(p.effectiveDate)}</span>
                          </div>
                        )}

                        <blockquote className="text-xs text-gray-700 italic border-l-2 border-brand-400 pl-2.5 py-1 my-2 bg-slate-50 rounded-r">
                          "{p.excerpt || p.text || p.content || 'No excerpt available.'}"
                        </blockquote>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                conflict.description && (
                  <p className="text-xs text-gray-700 my-3">{conflict.description}</p>
                )
              )}

              {/* Resolution Info */}
              <div className="pt-2 text-xs">
                <span className="font-semibold text-gray-700">Resolution Status: </span>
                <span className={isResolved ? 'text-emerald-800 font-medium' : 'text-amber-800 font-medium'}>
                  {conflict.resolution ||
                    (isResolved
                      ? 'Precedence resolved by newest superseding document.'
                      : 'Unresolved — insufficient evidence to determine precedence.')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
