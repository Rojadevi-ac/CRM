import React from 'react';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/common/Avatar';
import StatusBadge from '../components/common/StatusBadge';
import { Mail, Phone, Building2, Calendar, ShieldCheck, User } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Profile() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <User className="w-6 h-6 text-brand-500" /> User Profile
          </h1>
          <p className="text-xs text-slate-500">Your personal details, department, and role access.</p>
        </div>

        <Link
          to="/settings"
          className="clay-btn-primary px-4 py-2 text-xs flex items-center gap-2"
        >
          Edit Profile in Settings
        </Link>
      </div>

      <div className="clay-card p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <Avatar src={user.avatar_url} name={user.full_name} size="2xl" />
          <div className="text-center sm:text-left space-y-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{user.full_name}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="px-3 py-1 text-xs font-bold clay-pill text-brand-600 dark:text-brand-400">
                {user.role_name || user.role}
              </span>
              <StatusBadge status={user.status || 'Active'} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="p-4 rounded-xl clay-inset flex items-center gap-3">
            <Mail className="w-5 h-5 text-brand-500" />
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold">Email Address</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{user.email}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl clay-inset flex items-center gap-3">
            <Phone className="w-5 h-5 text-brand-500" />
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold">Phone Number</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{user.phone || '—'}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl clay-inset flex items-center gap-3">
            <Building2 className="w-5 h-5 text-brand-500" />
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold">Department</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{user.department || 'Sales'}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl clay-inset flex items-center gap-3">
            <Calendar className="w-5 h-5 text-brand-500" />
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold">Joined Date</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {user.joined_date ? new Date(user.joined_date).toLocaleDateString() : 'Active Member'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
