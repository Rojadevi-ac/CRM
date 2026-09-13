import React from 'react';

const PRIORITY_CONFIGS = {
  'Urgent': {
    style: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/80',
    dot: 'bg-rose-500',
  },
  'High': {
    style: 'bg-orange-50 text-orange-700 border-orange-200/80 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/80',
    dot: 'bg-orange-500',
  },
  'Medium': {
    style: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80',
    dot: 'bg-amber-500',
  },
  'Low': {
    style: 'bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700',
    dot: 'bg-slate-400',
  },
};

export default function PriorityBadge({ priority, className = '' }) {
  if (!priority) return null;
  const config = PRIORITY_CONFIGS[priority] || PRIORITY_CONFIGS['Medium'];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-soft-xs ${config.style} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {priority}
    </span>
  );
}

