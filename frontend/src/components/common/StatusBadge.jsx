import React from 'react';

const STATUS_CONFIGS = {
  // Lead Statuses
  'New': {
    style: 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/80',
    dot: 'bg-blue-500',
  },
  'Contacted': {
    style: 'bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/80',
    dot: 'bg-purple-500',
  },
  'Qualified': {
    style: 'bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/80',
    dot: 'bg-indigo-500',
  },
  'Proposal': {
    style: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80',
    dot: 'bg-amber-500',
  },
  'Negotiation': {
    style: 'bg-orange-50 text-orange-700 border-orange-200/80 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/80',
    dot: 'bg-orange-500',
  },
  'Won': {
    style: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80',
    dot: 'bg-emerald-500',
  },
  'Lost': {
    style: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/80',
    dot: 'bg-rose-500',
  },

  // Deal Stages
  'Qualification': {
    style: 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/80',
    dot: 'bg-blue-500',
  },
  'Closed Won': {
    style: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80',
    dot: 'bg-emerald-500',
  },
  'Closed Lost': {
    style: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/80',
    dot: 'bg-rose-500',
  },

  // General & Customer Statuses
  'Active': {
    style: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80',
    dot: 'bg-emerald-500',
  },
  'active': {
    style: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80',
    dot: 'bg-emerald-500',
  },
  'Inactive': {
    style: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700',
    dot: 'bg-slate-400',
  },
  'inactive': {
    style: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700',
    dot: 'bg-slate-400',
  },
  'Potential': {
    style: 'bg-cyan-50 text-cyan-700 border-cyan-200/80 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/80',
    dot: 'bg-cyan-500',
  },

  // Task & Follow-up & Activity
  'Pending': {
    style: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80',
    dot: 'bg-amber-500',
  },
  'In Progress': {
    style: 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/80',
    dot: 'bg-blue-500',
  },
  'Completed': {
    style: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80',
    dot: 'bg-emerald-500',
  },
  'Planned': {
    style: 'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/80',
    dot: 'bg-sky-500',
  },
  'Cancelled': {
    style: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700',
    dot: 'bg-slate-400',
  },
  'Missed': {
    style: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/80',
    dot: 'bg-rose-500',
  },
};

export default function StatusBadge({ status, className = '' }) {
  if (!status) return null;
  const config = STATUS_CONFIGS[status] || {
    style: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dot: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-soft-xs ${config.style} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {status}
    </span>
  );
}

