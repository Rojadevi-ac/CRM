import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardCheck, Search, Plus, Edit2, Trash2, Calendar, CheckSquare, Clock } from 'lucide-react';
import { taskApi, userApi, leadApi } from '../api/crmApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import PriorityBadge from '../components/common/PriorityBadge';
import Avatar from '../components/common/Avatar';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';

const TASK_STATUSES = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const [users, setUsers] = useState([]);
  const [leads, setLeads] = useState([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const [formData, setFormData] = useState({
    task_name: '',
    description: '',
    lead_id: '',
    due_date: new Date().toISOString().split('T')[0],
    priority: 'Medium',
    status: 'Pending',
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

  const fetchTasks = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await taskApi.getTasks({ page, limit: 15, status: statusFilter, priority: priorityFilter });
      if (res.data.success) {
        setTasks(res.data.data.tasks || []);
        setPagination(res.data.data.pagination || { page: 1, limit: 15, total: 0, pages: 1 });
      }
    } catch (err) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    fetchTasks(pagination.page);
  }, [fetchTasks]);

  // Real-time socket sync
  useEffect(() => {
    const handleUpdate = () => fetchTasks(pagination.page);
    const events = ['task_created', 'task_updated', 'task_deleted'];
    events.forEach((ev) => subscribeToEvent(ev, handleUpdate));
    return () => {
      events.forEach((ev) => unsubscribeFromEvent(ev, handleUpdate));
    };
  }, [pagination.page]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditOpen && selectedTask) {
        await taskApi.updateTask(selectedTask.id, formData);
        toast.success('Task updated');
        setIsEditOpen(false);
      } else {
        await taskApi.createTask(formData);
        toast.success('Task created');
        setIsCreateOpen(false);
      }
      fetchTasks(1);
    } catch (err) {
      toast.error('Error saving task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusToggle = async (task, newStatus) => {
    try {
      await taskApi.updateTask(task.id, { status: newStatus });
      toast.success(`Task marked as ${newStatus}`);
      fetchTasks(pagination.page);
    } catch (err) {
      toast.error('Failed to update task status');
    }
  };

  const handleDelete = async () => {
    if (!selectedTask) return;
    setSubmitting(true);
    try {
      await taskApi.deleteTask(selectedTask.id);
      toast.success('Task deleted');
      setIsDeleteOpen(false);
      fetchTasks(1);
    } catch (err) {
      toast.error('Failed to delete task');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setSelectedTask(null);
    setFormData({
      task_name: '',
      description: '',
      lead_id: '',
      due_date: new Date().toISOString().split('T')[0],
      priority: 'Medium',
      status: 'Pending',
      assigned_user_id: '',
    });
    setIsCreateOpen(true);
  };

  const openEditModal = (task) => {
    setSelectedTask(task);
    setFormData({
      task_name: task.task_name,
      description: task.description || '',
      lead_id: task.lead_id || '',
      due_date: task.due_date,
      priority: task.priority,
      status: task.status,
      assigned_user_id: task.assigned_user_id || '',
    });
    setIsEditOpen(true);
  };

  const columns = [
    {
      header: 'Task Title',
      key: 'task_name',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800 dark:text-slate-200">{row.task_name}</span>
          <span className="text-xs text-slate-400">{row.description || 'No description'}</span>
        </div>
      ),
    },
    {
      header: 'Priority',
      key: 'priority',
      render: (row) => <PriorityBadge priority={row.priority} />,
    },
    {
      header: 'Due Date',
      key: 'due_date',
      render: (row) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">{row.due_date}</span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => (
        canWrite ? (
          <select
            value={row.status}
            onChange={(e) => handleStatusToggle(row, e.target.value)}
            className="text-xs bg-transparent border-none font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            {TASK_STATUSES.map((st) => (
              <option key={st} value={st} className="bg-white dark:bg-slate-900">{st}</option>
            ))}
          </select>
        ) : (
          <StatusBadge status={row.status} />
        )
      ),
    },
    {
      header: 'Assignee',
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
              <button onClick={() => { setSelectedTask(row); setIsDeleteOpen(true); }} className="p-1 text-slate-400 hover:text-rose-600">
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-brand-500" /> Tasks
          </h1>
          <p className="text-xs text-slate-500">Manage deliverables, SLA obligations, and team action items.</p>
        </div>
        {canWrite && (
          <button onClick={openCreateModal} className="clay-btn-primary px-4 py-2 text-xs flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Task
          </button>
        )}
      </div>

      <div className="clay-card p-4 flex gap-3 flex-wrap">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3.5 py-2 clay-inset text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none">
          <option value="">All Statuses</option>
          {TASK_STATUSES.map((st) => (
            <option key={st} value={st}>{st}</option>
          ))}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="px-3.5 py-2 clay-inset text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none">
          <option value="">All Priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={tasks}
        loading={loading}
        pagination={pagination}
        onPageChange={(p) => fetchTasks(p)}
        emptyTitle="No tasks found"
        actionText="Create Task"
        onEmptyAction={canWrite ? openCreateModal : null}
      />

      <Modal isOpen={isCreateOpen || isEditOpen} onClose={() => { setIsCreateOpen(false); setIsEditOpen(false); }} title={isEditOpen ? 'Edit Task' : 'Create Task'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Task Title *</label>
            <input type="text" required value={formData.task_name} onChange={(e) => setFormData({ ...formData, task_name: e.target.value })} className="w-full px-3.5 py-2 clay-inset text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Due Date</label>
              <input type="date" required value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="w-full px-3.5 py-2 clay-inset text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Priority</label>
              <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="w-full px-3.5 py-2 clay-inset text-xs">
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Status</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3.5 py-2 clay-inset text-xs">
                {TASK_STATUSES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Assign Representative</label>
              <select value={formData.assigned_user_id} onChange={(e) => setFormData({ ...formData, assigned_user_id: e.target.value })} className="w-full px-3.5 py-2 clay-inset text-xs">
                <option value="">Select Staff</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Description</label>
            <textarea rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3.5 py-2 clay-inset text-xs" />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }} className="clay-btn-secondary px-4 py-2 text-xs">Cancel</button>
            <button type="submit" disabled={submitting} className="clay-btn-primary px-5 py-2 text-xs">Save Task</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Task"
        message={`Delete this task?`}
        confirmText="Delete"
        loading={submitting}
      />
    </div>
  );
}
