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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            User Profile
          </h1>
          <p className="text-xs text-slate-500">Your personal details, department, and role access.</p>
        </div>

        <Link
          to="/settings"
          className="px-3.5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm"
        >
          Edit Profile in Settings
        </Link>
      </div>

      <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <Avatar src={user.avatar_url} name={user.full_name} size="2xl" />
          <div className="text-center sm:text-left space-y-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{user.full_name}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="px-2.5 py-1 text-xs font-bold bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 rounded-md border border-brand-200 dark:border-brand-800">
                {user.role_name || user.role}
              </span>
              <StatusBadge status={user.status || 'Active'} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 flex items-center gap-3">
            <Mail className="w-5 h-5 text-brand-600" />
            <div>
              <span className="text-slate-400 block">Email Address</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{user.email}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 flex items-center gap-3">
            <Phone className="w-5 h-5 text-brand-600" />
            <div>
              <span className="text-slate-400 block">Phone Number</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{user.phone || '—'}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 flex items-center gap-3">
            <Building2 className="w-5 h-5 text-brand-600" />
            <div>
              <span className="text-slate-400 block">Department</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{user.department || 'Sales'}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-brand-600" />
            <div>
              <span className="text-slate-400 block">Joined Date</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {user.joined_date ? new Date(user.joined_date).toLocaleDateString() : 'Active Member'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
