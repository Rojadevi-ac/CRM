import React from 'react';

const GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-purple-500 to-pink-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-red-600',
  'from-cyan-500 to-blue-600',
];

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getGradient(name) {
  if (!name) return GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

export default function Avatar({ src, name, size = 'md', className = '' }) {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
    '2xl': 'w-24 h-24 text-2xl',
  };

  const selectedSize = sizeClasses[size] || sizeClasses.md;
  const initials = getInitials(name);
  const gradient = getGradient(name);

  // If avatar image exists from backend
  const backendBase = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://127.0.0.1:5000';
  const fullSrc = src && !src.startsWith('http') ? `${backendBase}${src}` : src;

  if (src) {
    return (
      <img
        src={fullSrc}
        alt={name || 'Avatar'}
        className={`${selectedSize} rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0 ${className}`}
        onError={(e) => {
          e.target.onerror = null;
          e.target.style.display = 'none';
        }}
      />
    );
  }

  return (
    <div
      className={`${selectedSize} rounded-full bg-gradient-to-tr ${gradient} text-white font-semibold flex items-center justify-center shadow-sm shrink-0 uppercase tracking-tight select-none border border-white/20 ${className}`}
    >
      {initials}
    </div>
  );
}
