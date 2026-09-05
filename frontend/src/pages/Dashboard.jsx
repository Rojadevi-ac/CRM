import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Users,
  Handshake,
  TrendingUp,
  DollarSign,
  Activity as ActivityIcon,
  CalendarClock,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { reportApi } from '../api/crmApi';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import Avatar from '../components/common/Avatar';
import StatusBadge from '../components/common/StatusBadge';
import PriorityBadge from '../components/common/PriorityBadge';
import { formatDate, formatTime12Hour } from '../utils/dateUtils';
import { CardSkeleton, ChartSkeleton } from '../components/common/SkeletonLoader';
import { Link } from 'react-router-dom';

const PIPELINE_COLORS = {
  'Qualification': '#3b82f6',
  'Proposal': '#f59e0b',
  'Negotiation': '#f97316',
  'Closed Won': '#10b981',
  'Closed Lost': '#ef4444',
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { subscribeToEvent, unsubscribeFromEvent } = useSocket();
  const { isDark } = useTheme();

  const fetchDashboardData = async () => {
    try {
      const res = await reportApi.getDashboard();
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Listen to real-time events across all modules to refresh dashboard metrics automatically
    const events = [
      'lead_created', 'lead_updated', 'lead_assigned', 'lead_status_changed', 'lead_deleted',
      'deal_created', 'deal_updated', 'deal_stage_changed', 'deal_deleted',
      'activity_created', 'activity_updated', 'activity_deleted',
      'followup_created', 'followup_updated', 'followup_deleted',
      'task_created', 'task_updated', 'task_deleted',
      'customer_created', 'customer_updated', 'customer_deleted',
      'company_created', 'company_updated', 'company_deleted',
    ];

    const handleRealtimeUpdate = () => {
      fetchDashboardData();
    };

    events.forEach((ev) => subscribeToEvent(ev, handleRealtimeUpdate));

    return () => {
      events.forEach((ev) => unsubscribeFromEvent(ev, handleRealtimeUpdate));
    };
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <CardSkeleton count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  const { summary, lead_conversion, deal_pipeline, sales_performance, recent_activities, upcoming_followups } = data;

  const leadChartData = lead_conversion.map((item) => ({
    name: item.status,
    count: item.count,
    value: parseFloat(item.value || 0),
  }));

  const dealChartData = deal_pipeline.map((item) => ({
    name: item.stage,
    amount: parseFloat(item.total_amount || 0),
    count: item.count,
    fill: PIPELINE_COLORS[item.stage] || '#64748b',
  }));

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Sales CRM Overview
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time pipeline metrics, lead conversions, and sales team velocity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/leads"
            className="px-3.5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Manage Leads
          </Link>
          <Link
            to="/deals"
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <Handshake className="w-3.5 h-3.5" />
            Deal Pipeline
          </Link>
        </div>
      </div>

      {/* Primary KPI Cards (8 Key Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Leads
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {summary.total_leads}
            </h3>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-1">
              {summary.qualified_leads} Qualified
            </p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
            <UserPlus className="w-6 h-6" />
          </div>
        </div>

        {/* Active Deals */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Deals
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {summary.active_deals}
            </h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              {summary.won_deals} Won Deals
            </p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
            <Handshake className="w-6 h-6" />
          </div>
        </div>

        {/* Pipeline Value */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Pipeline Value
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              ₹{Number(summary.pipeline_value).toLocaleString('en-IN')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              In negotiation & proposals
            </p>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Won Revenue */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Closed Revenue
            </p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              ₹{Number(summary.revenue).toLocaleString('en-IN')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              {summary.total_customers} Active Customers
            </p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Visual Charts: Lead Funnel & Deal Value Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Status Breakdown */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Lead Conversion Funnel
            </h3>
            <span className="text-xs text-slate-400">By status</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="name" tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#cbd5e1',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: isDark ? '#f8fafc' : '#0f172a',
                  }}
                />
                <Bar dataKey="count" name="Leads" fill="#0269c9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales Pipeline Value by Stage */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Sales Pipeline Value by Stage
            </h3>
            <span className="text-xs text-slate-400">Deal Value (₹)</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dealChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="name" tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }} />
                <YAxis
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Total Value']}
                  contentStyle={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#cbd5e1',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {dealChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sales Team Performance Leaderboard */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Sales Team Performance
            </h3>
            <p className="text-xs text-slate-400">
              Assigned leads, closed revenue, and win rates by representative.
            </p>
          </div>
          <Link
            to="/reports"
            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
          >
            Full Reports <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 font-semibold">Sales Representative</th>
                <th className="pb-3 font-semibold">Leads</th>
                <th className="pb-3 font-semibold">Deals</th>
                <th className="pb-3 font-semibold">Won Deals</th>
                <th className="pb-3 font-semibold">Won Revenue</th>
                <th className="pb-3 font-semibold">Win Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {sales_performance.map((sp) => (
                <tr key={sp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 flex items-center gap-3">
                    <Avatar src={sp.avatar_url} name={sp.full_name} size="sm" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                      {sp.full_name}
                    </span>
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-400 text-xs font-medium">
                    {sp.total_leads}
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-400 text-xs font-medium">
                    {sp.total_deals}
                  </td>
                  <td className="py-3 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                    {sp.won_deals}
                  </td>
                  <td className="py-3 font-semibold text-slate-900 dark:text-slate-100 text-xs">
                    ₹{Number(sp.won_revenue).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-brand-600 h-full rounded-full"
                          style={{ width: `${Math.min(sp.conversion_rate, 100)}%` }}
                        />
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {sp.conversion_rate}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Grid: Recent Activities & Upcoming Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities Feed */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ActivityIcon className="w-4 h-4 text-brand-600" /> Recent Activities
              </h3>
              <Link to="/activities" className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
                View all
              </Link>
            </div>

            <div className="space-y-3.5">
              {recent_activities.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-6">No recent activities</div>
              ) : (
                recent_activities.map((act) => (
                  <div key={act.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <Avatar src={act.author_avatar} name={act.author_name} size="xs" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                        <span className="truncate">{act.subject}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">{formatDate(act.activity_date)}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {act.author_name} • {act.entity_name}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Follow-ups Widget */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-amber-500" /> Today's & Upcoming Follow-ups
              </h3>
              <Link to="/followups" className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
                Schedule
              </Link>
            </div>

            <div className="space-y-3">
              {upcoming_followups.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-6">No upcoming follow-ups scheduled</div>
              ) : (
                upcoming_followups.map((fol) => (
                  <div
                    key={fol.id}
                    className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-850/40 transition-all flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {fol.purpose}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                        <span>👤 {fol.contact_name}</span>
                        <span>•</span>
                        <span>Assignee: {fol.assigned_user_name}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <PriorityBadge priority={fol.priority} />
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {formatDate(fol.followup_date)} {fol.followup_time ? `@ ${formatTime12Hour(fol.followup_time)}` : ''}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
