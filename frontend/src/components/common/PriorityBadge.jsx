import React from 'react';

const PRIORITY_CONFIGS = {
  'Urgent': 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
  'High': 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800',
  'Medium': 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  'Low': 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

export default function PriorityBadge({ priority, className = '' }) {
  if (!priority) return null;
  const style = PRIORITY_CONFIGS[priority] || PRIORITY_CONFIGS['Medium'];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${style} ${className}`}>
      {priority}
    </span>
  );
}
