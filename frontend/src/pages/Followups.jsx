import React, { useState, useEffect, useCallback } from 'react';
import { CalendarClock, Search, Plus, Edit2, Trash2, Clock, CheckCircle2, Phone, Calendar } from 'lucide-react';
import { followupApi, userApi, leadApi } from '../api/crmApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import PriorityBadge from '../components/common/PriorityBadge';
import Avatar from '../components/common/Avatar';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { formatTime12Hour, formatDate, getCurrentTimeInput, getCurrentDateInput } from '../utils/dateUtils';

const FOLLOWUP_STATUSES = ['Pending', 'Completed', 'Missed', 'Cancelled'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

export default function Followups() {
  const [followups, setFollowups] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [todayOnly, setTodayOnly] = useState(false);

  const [users, setUsers] = useState([]);
  const [leads, setLeads] = useState([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedFollowup, setSelectedFollowup] = useState(null);

  const [formData, setFormData] = useState({
    purpose: '',
    followup_date: getCurrentDateInput(),
    followup_time: getCurrentTimeInput(),
    lead_id: '',
    priority: 'High',
    status: 'Pending',
    notes: '',
    assigned_user_id: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const { canWrite } = useAuth();
  const { toast } = useToast();
  const { subscribeToEvent, unsubscribeFromEvent } = useSocket();

  useEffect(() => {
    userApi.getUsers({ status: 'active' }).then((res) => {
      if (res.data.success) setUsers(res.data.data || []);
    });
    leadApi.getLeads({ limit: 100 }).then((res) => {
      if (res.data.success) setLeads(res.data.data.leads || []);
    });
  }, []);

  const fetchFollowups = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await followupApi.getFollowups({
        page,
        limit: 15,
        status: statusFilter,
        priority: priorityFilter,
        today_only: todayOnly,
      });
      if (res.data.success) {
        setFollowups(res.data.data.followups || []);
        setPagination(res.data.data.pagination || { page: 1, limit: 15, total: 0, pages: 1 });
      }
    } catch (err) {
      toast.error('Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, todayOnly]);

  useEffect(() => {
    fetchFollowups(pagination.page);
  }, [fetchFollowups]);

  // Real-time socket sync
  useEffect(() => {
    const handleUpdate = () => fetchFollowups(pagination.page);
    const events = ['followup_created', 'followup_updated', 'followup_deleted'];
    events.forEach((ev) => subscribeToEvent(ev, handleUpdate));
    return () => {
      events.forEach((ev) => unsubscribeFromEvent(ev, handleUpdate));
    };
  }, [pagination.page]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditOpen && selectedFollowup) {
        await followupApi.updateFollowup(selectedFollowup.id, formData);
        toast.success('Follow-up updated');
        setIsEditOpen(false);
      } else {
        await followupApi.createFollowup(formData);
        toast.success('Follow-up scheduled');
        setIsCreateOpen(false);
      }
      fetchFollowups(1);
    } catch (err) {
      toast.error('Error saving follow-up');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (fol, newStatus) => {
    try {
      await followupApi.updateFollowup(fol.id, { status: newStatus });
      toast.success(`Follow-up marked as ${newStatus}`);
      fetchFollowups(pagination.page);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!selectedFollowup) return;
    setSubmitting(true);
    try {
      await followupApi.deleteFollowup(selectedFollowup.id);
      toast.success('Follow-up deleted');
      setIsDeleteOpen(false);
      fetchFollowups(1);
    } catch (err) {
      toast.error('Failed to delete follow-up');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setSelectedFollowup(null);
    setFormData({
      purpose: '',
      followup_date: getCurrentDateInput(),
      followup_time: getCurrentTimeInput(),
      lead_id: '',
      priority: 'High',
      status: 'Pending',
      notes: '',
      assigned_user_id: '',
    });
    setIsCreateOpen(true);
  };

  const openEditModal = (fol) => {
    setSelectedFollowup(fol);
    setFormData({
      purpose: fol.purpose,
      followup_date: fol.followup_date,
      followup_time: fol.followup_time ? fol.followup_time.slice(0, 5) : getCurrentTimeInput(),
      lead_id: fol.lead_id || '',
      priority: fol.priority,
      status: fol.status,
      notes: fol.notes || '',
      assigned_user_id: fol.assigned_user_id || '',
    });
    setIsEditOpen(true);
  };

  const columns = [
    {
      header: 'Follow-up Purpose & Contact',
      key: 'purpose',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800 dark:text-slate-200">{row.purpose}</span>
          <span className="text-xs text-slate-500">
            {row.lead_name || row.customer_name || 'General Client'}
          </span>
        </div>
      ),
    },
    {
      header: 'Priority',
      key: 'priority',
      render: (row) => <PriorityBadge priority={row.priority} />,
    },
    {
      header: 'Scheduled Date & Time',
      key: 'followup_date',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{formatDate(row.followup_date)} {row.followup_time ? `@ ${formatTime12Hour(row.followup_time)}` : ''}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => (
        canWrite ? (
          <select
            value={row.status}
            onChange={(e) => handleStatusChange(row, e.target.value)}
            className="text-xs bg-transparent border-none font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            {FOLLOWUP_STATUSES.map((st) => (
              <option key={st} value={st} className="bg-white dark:bg-slate-900">{st}</option>
            ))}
          </select>
        ) : (
          <StatusBadge status={row.status} />
        )
      ),
    },
    {
      header: 'Assigned Salesperson',
      key: 'assigned_user_name',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar src={row.assigned_user_avatar} name={row.assigned_user_name} size="xs" />
          <span className="text-xs text-slate-700 dark:text-slate-300">{row.assigned_user_name || '—'}</span>
        </div>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {canWrite && (
            <>
              <button onClick={() => openEditModal(row)} className="p-1 text-slate-400 hover:text-brand-600">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => { setSelectedFollowup(row); setIsDeleteOpen(true); }} className="p-1 text-slate-400 hover:text-rose-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Follow-ups</h1>
          <p className="text-xs text-slate-500">Scheduled touchpoints, call-backs, and prospect check-ins.</p>
        </div>
        {canWrite && (
          <button onClick={openCreateModal} className="px-3.5 py-2 text-xs font-semibold text-white bg-brand-600 rounded-lg flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Schedule Follow-up
          </button>
        )}
      </div>

      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setTodayOnly(!todayOnly)}
          className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
            todayOnly
              ? 'bg-amber-500 text-white border-amber-600'
              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
          }`}
        >
          {todayOnly ? "Showing Today's Follow-ups" : "Filter: Today Only"}
        </button>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
          <option value="">All Statuses</option>
          {FOLLOWUP_STATUSES.map((st) => (
            <option key={st} value={st}>{st}</option>
          ))}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
          <option value="">All Priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={followups}
        loading={loading}
        pagination={pagination}
        onPageChange={(p) => fetchFollowups(p)}
        emptyTitle="No follow-ups found"
        actionText="Schedule Follow-up"
        onEmptyAction={canWrite ? openCreateModal : null}
      />

      <Modal isOpen={isCreateOpen || isEditOpen} onClose={() => { setIsCreateOpen(false); setIsEditOpen(false); }} title={isEditOpen ? 'Edit Follow-up' : 'Schedule Follow-up'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Date *</label>
              <input type="date" required value={formData.followup_date} onChange={(e) => setFormData({ ...formData, followup_date: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Time</label>
              <input type="time" value={formData.followup_time} onChange={(e) => setFormData({ ...formData, followup_time: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Related Lead</label>
              <select value={formData.lead_id} onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
                <option value="">Select Lead (Optional)</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>{l.name} ({l.company_name})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Priority</label>
              <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Purpose / Agenda *</label>
            <input type="text" required value={formData.purpose} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} placeholder="e.g. Discuss revised pricing with CTO" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Status</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
                {FOLLOWUP_STATUSES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Assigned Salesperson</label>
              <select value={formData.assigned_user_id} onChange={(e) => setFormData({ ...formData, assigned_user_id: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
                <option value="">Select Representative</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Preparation Notes</label>
            <textarea rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs" />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <button type="button" onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }} className="px-3 py-1.5 text-xs">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 rounded-lg">Save</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Follow-up"
        message={`Delete this follow-up?`}
        confirmText="Delete"
        loading={submitting}
      />
    </div>
  );
}
