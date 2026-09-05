import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { TableSkeleton } from './SkeletonLoader';
import EmptyState from './EmptyState';

export default function DataTable({
  columns,
  data = [],
  loading = false,
  pagination,
  onPageChange,
  sortBy,
  sortDir,
  onSort,
  emptyTitle = 'No records found',
  emptyDescription = 'Try adjusting your filters or search query.',
  onEmptyAction,
  emptyActionText,
}) {
  if (loading) {
    return <TableSkeleton rows={8} cols={columns.length} />;
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionText={emptyActionText}
        onAction={onEmptyAction}
      />
    );
  }

  const handleSort = (colKey) => {
    if (!onSort) return;
    if (sortBy === colKey) {
      onSort(colKey, sortDir === 'ASC' ? 'DESC' : 'ASC');
    } else {
      onSort(colKey, 'ASC');
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {columns.map((col) => (
                <th
                  key={col.key || col.header}
                  className={`px-4 py-3.5 ${col.className || ''} ${
                    col.sortable ? 'cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200' : ''
                  }`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="text-slate-400">
                        {sortBy === col.key ? (
                          sortDir === 'ASC' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-normal">
            {data.map((row, rowIdx) => (
              <tr
                key={row.id || rowIdx}
                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
              >
                {columns.map((col) => (
                  <td key={col.key || col.header} className={`px-4 py-3 text-slate-700 dark:text-slate-300 ${col.className || ''}`}>
                    {col.render ? col.render(row, rowIdx) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && (
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {(pagination.page - 1) * pagination.limit + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">{pagination.total}</span>{' '}
            results
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-medium text-slate-700 dark:text-slate-300">
              Page {pagination.page} of {pagination.pages || 1}
            </span>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
