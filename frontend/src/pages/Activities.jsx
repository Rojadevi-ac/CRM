import React, { useState, useEffect, useCallback } from 'react';
import { Activity as ActivityIcon, Search, Edit2, Trash2, Phone, Mail, Users, MessageSquare, CheckCircle, Clock } from 'lucide-react';
import { activityApi, userApi, leadApi } from '../api/crmApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Avatar from '../components/common/Avatar';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { formatTime12Hour, formatDate, getCurrentTimeInput, getCurrentDateInput } from '../utils/dateUtils';

const ACTIVITY_TYPES = ['Call', 'Email', 'Meeting', 'Demo', 'WhatsApp', 'Other'];
const ACTIVITY_STATUSES = ['Completed', 'Planned', 'Cancelled'];

export default function Activities() {
  const [activities, setActivities] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [users, setUsers] = useState([]);
  const [leads, setLeads] = useState([]);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const [formData, setFormData] = useState({
    activity_type: 'Call',
    subject: '',
    description: '',
    lead_id: '',
    activity_date: getCurrentDateInput(),
    activity_time: getCurrentTimeInput(),
    status: 'Completed',
    assigned_user_id: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const { canWrite } = useAuth();
  const { toast } = useToast();
  const { subscribeToEvent, unsubscribeFromEvent } = useSocket();

  // Load dropdowns
  useEffect(() => {
    userApi.getUsers({ status: 'active' }).then((res) => {
      if (res.data.success) setUsers(res.data.data || []);
    });
    leadApi.getLeads({ limit: 100 }).then((res) => {
      if (res.data.success) setLeads(res.data.data.leads || []);
    });
  }, []);

  const fetchActivities = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await activityApi.getActivities({
        page,
        limit: 15,
        activity_type: typeFilter,
        status: statusFilter,
      });
      if (res.data.success) {
        setActivities(res.data.data.activities || []);
        setPagination(res.data.data.pagination || { page: 1, limit: 15, total: 0, pages: 1 });
      }
    } catch (err) {
      toast.error('Failed to load activities');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    fetchActivities(pagination.page);
  }, [fetchActivities]);

  // Real-time socket sync
  useEffect(() => {
    const handleUpdate = () => fetchActivities(pagination.page);
    const events = ['activity_created', 'activity_updated', 'activity_deleted', 'deal_stage_changed', 'lead_status_changed'];
    events.forEach((ev) => subscribeToEvent(ev, handleUpdate));
    return () => {
      events.forEach((ev) => unsubscribeFromEvent(ev, handleUpdate));
    };
  }, [pagination.page]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedActivity) return;
    setSubmitting(true);
    try {
      const payload = {
        activity_type: formData.activity_type,
        subject: formData.subject,
        description: formData.description,
        lead_id: formData.lead_id ? parseInt(formData.lead_id) : null,
        assigned_user_id: formData.assigned_user_id ? parseInt(formData.assigned_user_id) : null,
        activity_date: formData.activity_date,
        activity_time: formData.activity_time || null,
        status: formData.status,
      };
      const res = await activityApi.updateActivity(selectedActivity.id, payload);
      if (res.data.success) {
        toast.success('Activity updated');
        setIsEditOpen(false);
        fetchActivities(pagination.page);
      } else {
        toast.error(res.data.message || 'Error saving activity');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving activity');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedActivity) return;
    setSubmitting(true);
    try {
      await activityApi.deleteActivity(selectedActivity.id);
      toast.success('Activity deleted');
      setIsDeleteOpen(false);
      fetchActivities(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete activity');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (act) => {
    setSelectedActivity(act);
    setFormData({
      activity_type: act.activity_type || 'Call',
      subject: act.subject || '',
      description: act.description || '',
      lead_id: act.lead_id ? String(act.lead_id) : '',
      activity_date: act.activity_date ? String(act.activity_date).slice(0, 10) : getCurrentDateInput(),
      activity_time: act.activity_time ? String(act.activity_time).slice(0, 5) : getCurrentTimeInput(),
      status: act.status || 'Completed',
      assigned_user_id: act.assigned_user_id ? String(act.assigned_user_id) : '',
    });
    setIsEditOpen(true);
  };

  const columns = [
    {
      header: 'Activity & Subject',
      key: 'subject',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800 dark:text-slate-200">{row.subject}</span>
          <span className="text-xs text-slate-400">{row.lead_name || row.customer_name || 'General Account'}</span>
        </div>
      ),
    },
    {
      header: 'Type',
      key: 'activity_type',
      render: (row) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          {row.activity_type}
        </span>
      ),
    },
    {
      header: 'Date & Time',
      key: 'activity_date',
      render: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {formatDate(row.activity_date)} {row.activity_time ? `@ ${formatTime12Hour(row.activity_time)}` : ''}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => <StatusBadge status={row.status} />,
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
              <button onClick={() => { setSelectedActivity(row); setIsDeleteOpen(true); }} className="p-1 text-slate-400 hover:text-rose-600">
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Activities</h1>
          <p className="text-xs text-slate-500">Track client calls, presentations, emails, and demos.</p>
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
        >
          <option value="">All Activity Types</option>
          {ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
        >
          <option value="">All Statuses</option>
          {ACTIVITY_STATUSES.map((st) => (
            <option key={st} value={st}>{st}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={activities}
        loading={loading}
        pagination={pagination}
        onPageChange={(p) => fetchActivities(p)}
        emptyTitle="No activities found"
      />

      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Activity">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Activity Type</label>
              <select value={formData.activity_type} onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
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
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Subject *</label>
            <input type="text" required value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Date</label>
              <input type="date" required value={formData.activity_date} onChange={(e) => setFormData({ ...formData, activity_date: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Time (12-hr local)</label>
              <input type="time" value={formData.activity_time} onChange={(e) => setFormData({ ...formData, activity_time: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Status</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
                {ACTIVITY_STATUSES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Assigned Salesperson</label>
              <select value={formData.assigned_user_id} onChange={(e) => setFormData({ ...formData, assigned_user_id: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
                <option value="">Select Representative (Optional)</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name} ({u.role_name})</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Description / Minutes</label>
            <textarea rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs" />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <button type="button" onClick={() => setIsEditOpen(false)} className="px-3 py-1.5 text-xs">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 rounded-lg">Save</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Activity"
        message={`Delete this activity record?`}
        confirmText="Delete"
        loading={submitting}
      />
    </div>
  );
}
