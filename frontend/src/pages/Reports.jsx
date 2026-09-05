import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  TrendingUp,
  UserPlus,
  Users,
  DollarSign,
  FileSpreadsheet,
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
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import Avatar from '../components/common/Avatar';
import StatusBadge from '../components/common/StatusBadge';
import * as XLSX from 'xlsx';

const DATE_RANGES = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: 'last_7_days' },
  { label: 'Last 30 Days', value: 'last_30_days' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'This Quarter', value: 'this_quarter' },
  { label: 'This Year', value: 'this_year' },
  { label: 'Custom Range', value: 'custom' },
];

const COLORS = ['#0269c9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

export default function Reports() {
  const [dateRange, setDateRange] = useState('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [activeReportTab, setActiveReportTab] = useState('sales'); // 'sales' | 'leads' | 'salesperson' | 'customers'

  const [salesData, setSalesData] = useState(null);
  const [leadData, setLeadData] = useState(null);
  const [spData, setSpData] = useState(null);
  const [custData, setCustData] = useState(null);
  const [loading, setLoading] = useState(true);

  const { isDark } = useTheme();
  const { isReadOnly } = useAuth();
  const { toast } = useToast();
  const { subscribeToEvent, unsubscribeFromEvent } = useSocket();

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = { date_range: dateRange, custom_from: customFrom, custom_to: customTo };
      const [sRes, lRes, spRes, cRes] = await Promise.all([
        reportApi.getSalesReport(params),
        reportApi.getLeadReport(params),
        reportApi.getSalespersonReport(params),
        reportApi.getCustomerReport(params),
      ]);

      if (sRes.data.success) setSalesData(sRes.data.data);
      if (lRes.data.success) setLeadData(lRes.data.data);
      if (spRes.data.success) setSpData(spRes.data.data);
      if (cRes.data.success) setCustData(cRes.data.data);
    } catch (err) {
      toast.error('Failed to load report metrics');
    } finally {
      setLoading(false);
    }
  }, [dateRange, customFrom, customTo]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Real-time socket sync
  useEffect(() => {
    const handleUpdate = () => fetchReports();
    const events = [
      'deal_created', 'deal_updated', 'deal_stage_changed', 'deal_deleted',
      'lead_created', 'lead_updated', 'lead_status_changed', 'lead_deleted',
      'customer_created', 'customer_updated', 'customer_deleted'
    ];
    events.forEach((ev) => subscribeToEvent(ev, handleUpdate));
    return () => {
      events.forEach((ev) => unsubscribeFromEvent(ev, handleUpdate));
    };
  }, [fetchReports]);

  // Export multi-sheet Excel report
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // 1. Sales Sheet
      if (salesData?.details) {
        const salesRows = salesData.details.map((d) => ({
          'Deal ID': d.id,
          'Deal Name': d.deal_name,
          'Client': d.client_name,
          'Amount (INR)': d.amount,
          'Stage': d.stage,
          'Probability (%)': `${d.probability}%`,
          'Weighted Value (INR)': d.weighted_value,
          'Assigned Salesperson': d.owner_name,
          'Expected Close': d.expected_closing_date,
        }));
        const wsSales = XLSX.utils.json_to_sheet(salesRows);
        XLSX.utils.book_append_sheet(wb, wsSales, 'Sales Pipeline');
      }

      // 2. Leads Sheet
      if (leadData?.details) {
        const leadRows = leadData.details.map((l) => ({
          'Lead ID': l.id,
          'Name': l.name,
          'Email': l.email,
          'Company': l.company_name,
          'Source': l.source,
          'Industry': l.industry,
          'Status': l.status,
          'Priority': l.priority,
          'Est. Value (INR)': l.estimated_value,
          'Assigned Salesperson': l.assigned_user,
          'Created Date': l.created_date,
        }));
        const wsLeads = XLSX.utils.json_to_sheet(leadRows);
        XLSX.utils.book_append_sheet(wb, wsLeads, 'Lead Analytics');
      }

      // 3. Salesperson Performance
      if (spData?.performance) {
        const spRows = spData.performance.map((sp) => ({
          'Salesperson': sp.salesperson,
          'Department': sp.department,
          'Assigned Leads': sp.assigned_leads,
          'Qualified Leads': sp.qualified_leads,
          'Won Deals': sp.won_deals,
          'Lost Deals': sp.lost_deals,
          'Won Revenue (INR)': sp.revenue,
          'Conversion Rate': `${sp.conversion_rate}%`,
        }));
        const wsSp = XLSX.utils.json_to_sheet(spRows);
        XLSX.utils.book_append_sheet(wb, wsSp, 'Team Performance');
      }

      // 4. Customers Sheet
      if (custData?.details) {
        const custRows = custData.details.map((c) => ({
          'Customer ID': c.id,
          'Customer Name': c.customer_name,
          'Email': c.email,
          'Phone': c.phone,
          'Industry': c.industry,
          'Type': c.customer_type,
          'Status': c.status,
          'Assigned Salesperson': c.owner_name,
          'Deals Count': c.deals_count,
          'Total Revenue (INR)': c.total_revenue,
        }));
        const wsCust = XLSX.utils.json_to_sheet(custRows);
        XLSX.utils.book_append_sheet(wb, wsCust, 'Customer Directory');
      }

      const todayStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `RD_CRM_Performance_Report_${todayStr}.xlsx`);
      toast.success('Excel workbook exported successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export Excel report');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Title & Excel Download Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Executive Reports & Analytics
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Data insights, lead conversion rates, rep leaderboard, and downloadable Excel sheets.
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
        >
          <FileSpreadsheet className="w-4 h-4" /> Download Complete Excel Workbook (.xlsx)
        </button>
      </div>

      {/* Date Range Selector Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Period:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {DATE_RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setDateRange(r.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                dateRange === r.value
                  ? 'bg-brand-600 text-white shadow-2xs font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {dateRange === 'custom' && (
          <div className="flex items-center gap-2 ml-auto">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>
        )}
      </div>

      {/* Report Module Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveReportTab('sales')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeReportTab === 'sales'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Sales & Pipeline Report
        </button>
        <button
          onClick={() => setActiveReportTab('leads')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeReportTab === 'leads'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Lead Conversion Analytics
        </button>
        <button
          onClick={() => setActiveReportTab('salesperson')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeReportTab === 'salesperson'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Sales Team Leaderboard
        </button>
        <button
          onClick={() => setActiveReportTab('customers')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeReportTab === 'customers'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Customer Distribution
        </button>
      </div>

      {/* 1. SALES REPORT */}
      {activeReportTab === 'sales' && salesData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-slate-400 uppercase">Total Deals</span>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {salesData.total_deals}
              </h3>
            </div>
            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-slate-400 uppercase">Won Revenue</span>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                ₹{Number(salesData.won_revenue).toLocaleString('en-IN')}
              </h3>
            </div>
            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-slate-400 uppercase">Pipeline Value</span>
              <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                ₹{Number(salesData.pipeline_value).toLocaleString('en-IN')}
              </h3>
            </div>
            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-slate-400 uppercase">Average Deal Size</span>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                ₹{Number(salesData.avg_deal_size).toLocaleString('en-IN')}
              </h3>
            </div>
          </div>

          {/* Deals Table */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Deal Breakdown in Period
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase">
                    <th className="pb-3">Deal Name</th>
                    <th className="pb-3">Client</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Stage</th>
                    <th className="pb-3">Weighted Value</th>
                    <th className="pb-3">Assigned Salesperson</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {salesData.details.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">{d.deal_name}</td>
                      <td className="py-2.5 text-slate-500">{d.client_name}</td>
                      <td className="py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                        ₹{Number(d.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5"><StatusBadge status={d.stage} /></td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-300">
                        ₹{Number(d.weighted_value).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5">{d.owner_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. LEADS REPORT */}
      {activeReportTab === 'leads' && leadData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-slate-400 uppercase">Total Leads Captured</span>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{leadData.total_leads}</h3>
            </div>
            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-slate-400 uppercase">Conversion Rate</span>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{leadData.conversion_rate}%</h3>
            </div>
            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-slate-400 uppercase">Period Filter</span>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1">
                {leadData.date_bounds.from} to {leadData.date_bounds.to}
              </h3>
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Leads by Status</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {leadData.by_status.map((st) => (
                <div key={st.status} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs">
                  <span className="text-slate-400 font-medium block">{st.status}</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5 block">{st.count} leads</span>
                  <span className="text-[11px] text-slate-500">₹{Number(st.total_value).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. SALESPERSON REPORT */}
      {activeReportTab === 'salesperson' && spData && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Sales Representative Performance Breakdown
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase">
                  <th className="pb-3">Salesperson</th>
                  <th className="pb-3">Department</th>
                  <th className="pb-3">Assigned Leads</th>
                  <th className="pb-3">Won Deals</th>
                  <th className="pb-3">Won Revenue</th>
                  <th className="pb-3">Conversion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {spData.performance.map((sp) => (
                  <tr key={sp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 font-bold text-slate-800 dark:text-slate-200">{sp.salesperson}</td>
                    <td className="py-3 text-slate-500">{sp.department}</td>
                    <td className="py-3 text-slate-700 dark:text-slate-300 font-medium">{sp.assigned_leads}</td>
                    <td className="py-3 text-emerald-600 font-bold">{sp.won_deals}</td>
                    <td className="py-3 font-bold text-slate-900 dark:text-slate-100">
                      ₹{Number(sp.revenue).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 font-bold text-brand-600">{sp.conversion_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. CUSTOMER REPORT */}
      {activeReportTab === 'customers' && custData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-slate-400 uppercase">Total Accounts</span>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{custData.total_customers}</h3>
            </div>
            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-slate-400 uppercase">Active Clients</span>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{custData.active_customers}</h3>
            </div>
            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-slate-400 uppercase">New In Period</span>
              <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{custData.new_customers}</h3>
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Accounts by Industry</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {custData.by_industry.map((ind) => (
                <div key={ind.industry} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs">
                  <span className="text-slate-400 font-medium">{ind.industry}</span>
                  <span className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 block">{ind.count} accounts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
