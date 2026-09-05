import React from 'react';

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs animate-pulse">
      {/* Table Header */}
      <div className="h-12 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center px-6 gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-200 dark:bg-slate-700 rounded flex-1" />
        ))}
      </div>
      {/* Table Rows */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="h-14 px-6 flex items-center gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className={`h-4 bg-slate-200 dark:bg-slate-800 rounded ${
                  c === 0 ? 'w-1/3' : 'flex-1'
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs animate-pulse space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="h-7 w-28 bg-slate-300 dark:bg-slate-700 rounded" />
          <div className="h-3 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs animate-pulse space-y-4">
      <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
      <div className="h-64 bg-slate-100 dark:bg-slate-800/40 rounded-lg" />
    </div>
  );
}
