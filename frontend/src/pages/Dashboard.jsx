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
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Plus,
  Zap,
  Target,
  BarChart2,
  FileText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  Cell,
} from 'recharts';
import { reportApi } from '../api/crmApi';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import Avatar from '../components/common/Avatar';
import StatusBadge from '../components/common/StatusBadge';
import PriorityBadge from '../components/common/PriorityBadge';
import { formatDate, formatTime12Hour } from '../utils/dateUtils';
import { CardSkeleton, ChartSkeleton } from '../components/common/SkeletonLoader';
import { Link, useNavigate } from 'react-router-dom';

const PIPELINE_COLORS = {
  'Qualification': '#3b82f6',
  'Proposal': '#f59e0b',
  'Negotiation': '#8b5cf6',
  'Closed Won': '#10b981',
  'Closed Lost': '#ef4444',
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { subscribeToEvent, unsubscribeFromEvent } = useSocket();
  const { isDark } = useTheme();
  const navigate = useNavigate();

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
        <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        <CardSkeleton count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartSkeleton />
          </div>
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
      {/* Page Header / Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 sm:p-7 clay-card border border-white/80 dark:border-slate-800/60 shadow-clay-card dark:shadow-clay-card-dark">
        <div>
          <div className="text-brand-600 dark:text-brand-400 font-extrabold text-xs uppercase tracking-wider mb-1">
            Executive Sales Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Pipeline & Revenue Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Live velocity metrics, conversion stages, and real-time sales performance.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/leads"
            className="px-4 py-2.5 text-xs font-bold text-white clay-btn-primary flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Lead</span>
          </Link>
          <Link
            to="/deals"
            className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 clay-btn-secondary flex items-center gap-2"
          >
            <Handshake className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span>Kanban Pipeline</span>
          </Link>
        </div>
      </div>

      {/* Bento Grid Top Section: 4 Hero Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Bento Tile 1: Total Leads */}
        <div className="clay-card clay-card-hover p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Leads
              </p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1.5 tracking-tight">
                {summary.total_leads}
              </h3>
            </div>
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 rounded-2xl shadow-clay-pill dark:shadow-clay-pill-dark border border-white/60 dark:border-blue-900/40">
              <UserPlus className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <span className="text-brand-600 dark:text-brand-400 font-extrabold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              {summary.qualified_leads} Qualified
            </span>
            <span className="text-slate-400 text-[11px] font-medium">Conversion Ready</span>
          </div>
        </div>

        {/* Bento Tile 2: Active Deals */}
        <div className="clay-card clay-card-hover p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Active Deals
              </p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1.5 tracking-tight">
                {summary.active_deals}
              </h3>
            </div>
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 rounded-2xl shadow-clay-pill dark:shadow-clay-pill-dark border border-white/60 dark:border-emerald-900/40">
              <Handshake className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {summary.won_deals} Deals Won
            </span>
            <span className="text-slate-400 text-[11px] font-medium">High Velocity</span>
          </div>
        </div>

        {/* Bento Tile 3: Pipeline Value */}
        <div className="clay-card clay-card-hover p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Pipeline Value
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-1.5 tracking-tight">
                ₹{Number(summary.pipeline_value).toLocaleString('en-IN')}
              </h3>
            </div>
            <div className="p-3.5 bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 rounded-2xl shadow-clay-pill dark:shadow-clay-pill-dark border border-white/60 dark:border-purple-900/40">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <span className="text-purple-600 dark:text-purple-400 font-extrabold">
              Proposals & Review
            </span>
            <span className="text-slate-400 text-[11px] font-medium">Weighted Value</span>
          </div>
        </div>

        {/* Bento Tile 4: Won Revenue */}
        <div className="clay-card clay-card-hover p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Closed Revenue
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-brand-600 dark:text-brand-400 mt-1.5 tracking-tight">
                ₹{Number(summary.revenue).toLocaleString('en-IN')}
              </h3>
            </div>
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/70 text-brand-600 dark:text-brand-400 rounded-2xl shadow-clay-pill dark:shadow-clay-pill-dark border border-white/60 dark:border-blue-900/40">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <span className="text-slate-700 dark:text-slate-300 font-extrabold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-brand-500" />
              {summary.total_customers} Customers
            </span>
            <span className="text-emerald-500 font-extrabold text-[11px]">Net Realized</span>
          </div>
        </div>
      </div>

      {/* Bento Middle Section: Charts & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Bento Tile 5: Lead Conversion Funnel (7 Columns) */}
        <div className="lg:col-span-7 clay-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-brand-600" /> Lead Conversion Stages
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Volume of leads segmented by progressive pipeline status
              </p>
            </div>
            <span className="px-3 py-1 text-[11px] font-extrabold rounded-full clay-pill text-brand-600 dark:text-brand-400">
              Live Funnel
            </span>
          </div>

          <div className="h-64 w-full clay-inset p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadChartData} margin={{ top: 15, right: 10, left: -20, bottom: 10 }}>
                <defs>
                  <linearGradient id="leadBarClayGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#cbd5e1'} vertical={false} opacity={0.4} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                  contentStyle={{
                    backgroundColor: isDark ? '#131b2c' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                    borderRadius: '16px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: isDark ? '#f8fafc' : '#0f172a',
                  }}
                />
                <Bar dataKey="count" name="Leads" fill="url(#leadBarClayGradient)" radius={[8, 8, 0, 0]} barSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bento Tile 6: Deal Pipeline Value (5 Columns) */}
        <div className="lg:col-span-5 clay-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" /> Pipeline Stage Value
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Total deal valuation (₹) by active stage
              </p>
            </div>
            <Link
              to="/deals"
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5"
            >
              View <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-64 w-full clay-inset p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dealChartData} margin={{ top: 15, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#cbd5e1'} vertical={false} opacity={0.4} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Deal Value']}
                  contentStyle={{
                    backgroundColor: isDark ? '#131b2c' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                    borderRadius: '16px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]} barSize={30}>
                  {dealChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bento Bottom Section: Performance Leaderboard + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Bento Tile 7: Sales Performance Leaderboard (7 Columns) */}
        <div className="lg:col-span-7 clay-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-600" /> Sales Team Leaderboard
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Conversion velocity and closed revenue per representative
              </p>
            </div>
            <Link
              to="/reports"
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              Full Analytics <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-slate-800 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3">Representative</th>
                  <th className="pb-3">Leads</th>
                  <th className="pb-3">Deals</th>
                  <th className="pb-3">Won</th>
                  <th className="pb-3">Revenue</th>
                  <th className="pb-3">Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {sales_performance.map((sp) => (
                  <tr key={sp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 flex items-center gap-3">
                      <Avatar src={sp.avatar_url} name={sp.full_name} size="sm" />
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                        {sp.full_name}
                      </span>
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-400 text-xs font-bold">
                      {sp.total_leads}
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-400 text-xs font-bold">
                      {sp.total_deals}
                    </td>
                    <td className="py-3 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold">
                      {sp.won_deals}
                    </td>
                    <td className="py-3 font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                      ₹{Number(sp.won_revenue).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-16 clay-inset h-2.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-brand-500 to-indigo-600 h-full rounded-full"
                            style={{ width: `${Math.min(sp.conversion_rate, 100)}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
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

        {/* Bento Tile 8 & 9: Real-time Streams & Upcoming Followups (5 Columns) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Quick Actions Strip */}
          <div className="clay-card p-4 flex items-center justify-between gap-2.5">
            <Link
              to="/leads"
              className="flex-1 py-2.5 px-3 clay-pill text-brand-700 dark:text-brand-300 text-center text-xs font-extrabold hover:bg-brand-50 dark:hover:bg-brand-950/60 flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5 text-brand-500" /> + New Lead
            </Link>
            <Link
              to="/deals"
              className="flex-1 py-2.5 px-3 clay-pill text-indigo-700 dark:text-indigo-300 text-center text-xs font-extrabold hover:bg-indigo-50 dark:hover:bg-indigo-950/60 flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Handshake className="w-3.5 h-3.5 text-indigo-500" /> + New Deal
            </Link>
            <Link
              to="/followups"
              className="flex-1 py-2.5 px-3 clay-pill text-amber-700 dark:text-amber-300 text-center text-xs font-extrabold hover:bg-amber-50 dark:hover:bg-amber-950/60 flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <CalendarClock className="w-3.5 h-3.5 text-amber-500" /> Follow-up
            </Link>
          </div>

          {/* Recent Activity Feed */}
          <div className="clay-card p-5">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 uppercase tracking-wider">
                <ActivityIcon className="w-4 h-4 text-brand-600" /> Recent Activities
              </h3>
              <Link to="/activities" className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">
                View All
              </Link>
            </div>

            <div className="space-y-3">
              {recent_activities.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-4">No recent activities</div>
              ) : (
                recent_activities.slice(0, 4).map((act) => (
                  <div
                    key={act.id}
                    className="flex items-start gap-3 p-2.5 clay-pill hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <Avatar src={act.author_avatar} name={act.author_name} size="xs" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                        <span className="truncate">{act.subject}</span>
                        <span className="text-[10px] text-slate-400 font-normal shrink-0">{formatDate(act.activity_date)}</span>
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

          {/* Upcoming Follow-ups Widget */}
          <div className="clay-card p-5">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 uppercase tracking-wider">
                <CalendarClock className="w-4 h-4 text-amber-500" /> Scheduled Follow-ups
              </h3>
              <Link to="/followups" className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">
                Manage
              </Link>
            </div>

            <div className="space-y-2.5">
              {upcoming_followups.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-4">No upcoming follow-ups scheduled</div>
              ) : (
                upcoming_followups.slice(0, 3).map((fol) => (
                  <div
                    key={fol.id}
                    className="p-3.5 clay-pill flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">
                        {fol.purpose}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 truncate font-medium">
                        <span className="truncate">👤 {fol.contact_name}</span>
                        <span>•</span>
                        <span className="truncate">{fol.assigned_user_name}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <PriorityBadge priority={fol.priority} />
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
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
