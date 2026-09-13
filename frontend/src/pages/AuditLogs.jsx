import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Filter, Clock, User, ArrowRight, Eye, CheckCircle2, PlusCircle, Trash2, Edit3, ArrowUpRight } from 'lucide-react';
import { auditApi } from '../api/crmApi';
import DataTable from '../components/common/DataTable';
import Avatar from '../components/common/Avatar';
import Modal from '../components/common/Modal';
import { formatDateTime12Hour, formatTime12Hour, formatDate } from '../utils/dateUtils';

const FIELD_LABELS = {
  stage: 'Stage',
  status: 'Status',
  priority: 'Priority',
  amount: 'Amount',
  estimated_value: 'Estimated Value',
  weighted_value: 'Weighted Value',
  probability: 'Probability',
  subject: 'Subject',
  description: 'Description',
  task_name: 'Task Name',
  deal_name: 'Deal Name',
  customer_name: 'Customer Name',
  company_name: 'Company',
  lead_name: 'Lead',
  lead_id: 'Lead',
  customer_id: 'Customer',
  deal_id: 'Deal',
  assigned_user_name: 'Assigned To',
  assigned_user_id: 'Assigned Rep',
  owner_name: 'Owner',
  owner_id: 'Owner',
  activity_type: 'Activity Type',
  activity_date: 'Activity Date',
  activity_time: 'Activity Time',
  due_date: 'Due Date',
  followup_date: 'Follow-up Date',
  followup_time: 'Follow-up Time',
  purpose: 'Purpose',
  email: 'Email',
  phone: 'Phone',
  notes: 'Notes',
  role_name: 'Role',
  full_name: 'Full Name',
  department: 'Department',
  job_title: 'Job Title',
  contact_type: 'Contact Type',
  address: 'Address',
  city: 'City',
  state: 'State',
  country: 'Country',
  website: 'Website',
  annual_revenue: 'Annual Revenue',
  employee_count: 'Employees',
  source: 'Source',
  industry: 'Industry',
  customer_type: 'Customer Type'
};

const IGNORED_DIFF_FIELDS = new Set([
  'id', 'created_at', 'updated_at', 'created_by_id', 'items', 'deals', 'contacts',
  'owner_avatar', 'assigned_user_avatar', 'owner_email', 'customer_email', 'lead_phone', 'lead_company', 'customer_phone'
]);

function safeParseJson(val) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return val;
  }
}

function formatValue(key, val) {
  if (val === null || val === undefined || val === '') return 'None';
  const k = key.toLowerCase();
  if ((k.includes('amount') || k.includes('value') || k.includes('revenue')) && !isNaN(Number(val))) {
    return `₹${Number(val).toLocaleString('en-IN')}`;
  }
  if (k.includes('probability') && !isNaN(Number(val))) {
    return `${val}%`;
  }
  if (typeof val === 'object') {
    return JSON.stringify(val);
  }
  return String(val);
}

function getEntityName(obj) {
  if (!obj || typeof obj !== 'object') return '';
  return obj.name || obj.deal_name || obj.customer_name || obj.subject || obj.task_name || obj.purpose || obj.full_name || obj.company_name || '';
}

function calculateDiffs(oldObj, newObj) {
  if (!oldObj || typeof oldObj !== 'object' || !newObj || typeof newObj !== 'object') {
    return [];
  }
  const diffs = [];
  const handledKeys = new Set();

  // Helper for composite pairs like assigned_user_name + assigned_user_id
  const checkPair = (idKey, nameKey, label) => {
    if ((idKey in oldObj || idKey in newObj || nameKey in oldObj || nameKey in newObj) &&
        (oldObj[idKey] !== newObj[idKey] || oldObj[nameKey] !== newObj[nameKey])) {
      const oldLabel = oldObj[nameKey] || (oldObj[idKey] ? `ID #${oldObj[idKey]}` : 'None');
      const newLabel = newObj[nameKey] || (newObj[idKey] ? `ID #${newObj[idKey]}` : 'None');
      if (oldLabel !== newLabel) {
        diffs.push({ field: label, oldVal: oldLabel, newVal: newLabel });
      }
      handledKeys.add(idKey);
      handledKeys.add(nameKey);
    }
  };

  checkPair('assigned_user_id', 'assigned_user_name', 'Assigned To');
  checkPair('owner_id', 'owner_name', 'Owner');
  checkPair('lead_id', 'lead_name', 'Lead');
  checkPair('customer_id', 'customer_name', 'Customer');
  checkPair('deal_id', 'deal_name', 'Deal');

  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  allKeys.forEach((key) => {
    if (IGNORED_DIFF_FIELDS.has(key) || handledKeys.has(key)) return;

    let oVal = oldObj[key];
    let nVal = newObj[key];

    // Normalize empty strings and nulls
    if (oVal === '') oVal = null;
    if (nVal === '') nVal = null;

    // Normalize numbers/strings for amounts
    if (typeof oVal === 'number' && typeof nVal === 'string' && Number(nVal) === oVal) return;
    if (typeof nVal === 'number' && typeof oVal === 'string' && Number(oVal) === nVal) return;

    if (oVal !== nVal) {
      diffs.push({
        field: FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        oldVal: formatValue(key, oVal),
        newVal: formatValue(key, nVal),
      });
    }
  });

  return diffs;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const res = await auditApi.getAuditLogs({ page, limit: 25, module: moduleFilter });
      if (res.data.success) {
        setLogs(res.data.data.logs || []);
        setPagination(res.data.data.pagination || { page: 1, limit: 25, total: 0, pages: 1 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(pagination.page);
  }, [moduleFilter]);

  const renderChangesCell = (row) => {
    const action = String(row.action || '').toUpperCase();
    const oldVal = safeParseJson(row.old_value);
    const newVal = safeParseJson(row.new_value);
    const moduleName = row.module ? (row.module.endsWith('s') ? row.module.slice(0, -1) : row.module) : 'record';

    // 1. Stage / Status changes
    if (action.includes('STAGE_CHANGE') || action.includes('STATUS_CHANGE') || action.includes('UPDATE_STAGE')) {
      const field = action.includes('STAGE') ? 'Stage' : 'Status';
      const o = (oldVal && typeof oldVal === 'object') ? (oldVal.stage || oldVal.status) : (oldVal || 'None');
      const n = (newVal && typeof newVal === 'object') ? (newVal.stage || newVal.status) : (newVal || 'None');
      return (
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">{field}:</span>
          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 line-through text-[11px]">
            {String(o)}
          </span>
          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-bold text-[11px]">
            {String(n)}
          </span>
        </div>
      );
    }

    // 2. Creation logs
    if (action.startsWith('CREATE') || action === 'CREATE') {
      const name = getEntityName(newVal);
      return (
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
            <PlusCircle className="w-3.5 h-3.5" /> Created {moduleName}
          </span>
          {name && (
            <span className="font-bold text-slate-800 dark:text-slate-200">
              "{name}"
            </span>
          )}
          {newVal && newVal.amount && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium">
              ₹{Number(newVal.amount).toLocaleString('en-IN')}
            </span>
          )}
          {newVal && newVal.activity_type && (
            <span className="px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 text-[11px] font-medium">
              {newVal.activity_type}
            </span>
          )}
        </div>
      );
    }

    // 3. Deletion logs
    if (action.startsWith('DELETE') || action === 'DELETE') {
      const name = getEntityName(oldVal);
      return (
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
            <Trash2 className="w-3.5 h-3.5" /> Deleted {moduleName}
          </span>
          {name && (
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              "{name}"
            </span>
          )}
        </div>
      );
    }

    // 4. Update / Edit logs with diff calculation
    if (oldVal && newVal && typeof oldVal === 'object' && typeof newVal === 'object') {
      const diffs = calculateDiffs(oldVal, newVal);
      if (diffs.length > 0) {
        return (
          <div className="space-y-1 max-w-md">
            <div className="flex flex-wrap items-center gap-1.5">
              {diffs.slice(0, 2).map((d, i) => (
                <div key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px]">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{d.field}:</span>
                  <span className="text-slate-400 line-through truncate max-w-[90px]">{d.oldVal}</span>
                  <ArrowRight className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                  <span className="font-bold text-brand-600 dark:text-brand-400 truncate max-w-[100px]">{d.newVal}</span>
                </div>
              ))}
              {diffs.length > 2 && (
                <button
                  type="button"
                  onClick={() => setSelectedLog(row)}
                  className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 underline cursor-pointer"
                >
                  +{diffs.length - 2} more changes
                </button>
              )}
            </div>
          </div>
        );
      }
      const recordName = getEntityName(newVal) || getEntityName(oldVal);
      return (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          Updated {moduleName} {recordName ? `"${recordName}"` : `#${row.record_id}`}
        </span>
      );
    }

    // Fallback for simple values
    if (newVal || oldVal) {
      return (
        <span className="text-xs text-slate-700 dark:text-slate-300">
          {formatValue('change', newVal || oldVal)}
        </span>
      );
    }

    return <span className="text-xs text-slate-400">—</span>;
  };

  const columns = [
    {
      header: 'Action & Module',
      key: 'action',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">{row.action}</span>
          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
            {row.module} #{row.record_id || ''}
          </span>
        </div>
      ),
    },
    {
      header: 'User',
      key: 'user_name',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar name={row.user_name || 'System'} size="xs" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{row.user_name || 'System'}</span>
        </div>
      ),
    },
    {
      header: 'Changes',
      key: 'changes',
      render: (row) => renderChangesCell(row),
    },
    {
      header: 'Timestamp (12-hr)',
      key: 'created_at',
      render: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
          {formatDateTime12Hour(row.created_at)}
        </span>
      ),
    },
    {
      header: 'Details',
      key: 'actions',
      className: 'text-right',
      render: (row) => (
        <button
          onClick={() => setSelectedLog(row)}
          className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="View Full Audit Details"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-brand-500" /> System Audit Trails
        </h1>
        <p className="text-xs text-slate-500">Administrative immutable log of critical CRM data modifications.</p>
      </div>

      <div className="clay-card p-4 flex flex-wrap gap-3 items-center justify-between">
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="px-3.5 py-2 clay-inset text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
        >
          <option value="">All Modules</option>
          <option value="leads">Leads</option>
          <option value="deals">Deals</option>
          <option value="customers">Customers</option>
          <option value="companies">Companies</option>
          <option value="contacts">Contacts</option>
          <option value="activities">Activities</option>
          <option value="tasks">Tasks</option>
          <option value="followups">Follow-ups</option>
          <option value="users">Users</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        loading={loading}
        pagination={pagination}
        onPageChange={(p) => fetchLogs(p)}
        emptyTitle="No audit logs found"
      />

      {/* Structured Audit Log Details Modal */}
      <Modal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title={`Audit Trail Details #${selectedLog?.id || ''}`}
      >
        {selectedLog && (
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-2 gap-3 p-4 clay-card">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Action & Module</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{selectedLog.action}</span>
                <span className="text-slate-500 block">{selectedLog.module} #{selectedLog.record_id}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Initiated By</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{selectedLog.user_name || 'System'}</span>
                <span className="text-slate-500 block">{selectedLog.user_email || ''}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Logged At</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{formatDateTime12Hour(selectedLog.created_at)}</span>
              </div>
            </div>

            {/* Field Diff Breakdown */}
            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2.5">Field-by-Field Changes</h4>
              {(() => {
                const o = safeParseJson(selectedLog.old_value);
                const n = safeParseJson(selectedLog.new_value);
                if (o && n && typeof o === 'object' && typeof n === 'object') {
                  const diffs = calculateDiffs(o, n);
                  if (diffs.length === 0) {
                    return <div className="text-slate-400 p-3 clay-inset rounded-xl">No direct field variations detected.</div>;
                  }
                  return (
                    <div className="clay-card overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                      <div className="grid grid-cols-3 bg-slate-100/70 dark:bg-slate-800/70 px-3 py-2 font-bold text-[11px] text-slate-600 dark:text-slate-300">
                        <span>Field</span>
                        <span>Previous Value</span>
                        <span>Updated Value</span>
                      </div>
                      {diffs.map((d, i) => (
                        <div key={i} className="grid grid-cols-3 px-3 py-2 text-xs items-center">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{d.field}</span>
                          <span className="text-rose-600 dark:text-rose-400 line-through break-words">{d.oldVal}</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 break-words">{d.newVal}</span>
                        </div>
                      ))}
                    </div>
                  );
                }
                if (n && !o) {
                  return (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300">
                      Record newly created with parameters: {getEntityName(n) || 'New Record'}
                    </div>
                  );
                }
                if (o && !n) {
                  return (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300">
                      Record deleted permanently: {getEntityName(o) || 'Deleted Record'}
                    </div>
                  );
                }
                return <div className="text-slate-400">{formatValue('val', n || o)}</div>;
              })()}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="clay-btn-secondary px-4 py-2 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
