import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  UserPlus,
  Mail,
  Phone,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  Plus,
  MessageSquare,
  Activity as ActivityIcon,
  CalendarClock,
  ClipboardCheck,
  History,
  Send,
  Trash2,
  Edit2,
  DollarSign,
  UserCheck,
} from 'lucide-react';
import { leadApi, auditApi, activityApi, followupApi, taskApi } from '../api/crmApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import StatusBadge from '../components/common/StatusBadge';
import PriorityBadge from '../components/common/PriorityBadge';
import Avatar from '../components/common/Avatar';
import Modal from '../components/common/Modal';
import { formatTime12Hour, formatDate, formatDateTime12Hour, getCurrentTimeInput, getCurrentDateInput } from '../utils/dateUtils';

const TABS = ['Overview', 'Timeline', 'Activities', 'Follow-ups', 'Tasks', 'Notes'];

export default function LeadDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [notes, setNotes] = useState([]);
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);

  // Quick action note input
  const [noteContent, setNoteContent] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Quick followup / task modals
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const [folForm, setFolForm] = useState({
    purpose: '',
    followup_date: getCurrentDateInput(),
    followup_time: getCurrentTimeInput(),
    priority: 'High',
    notes: ''
  });
  const [taskForm, setTaskForm] = useState({
    task_name: '',
    description: '',
    due_date: getCurrentDateInput(),
    priority: 'Medium'
  });

  const { canWrite } = useAuth();
  const { toast } = useToast();
  const { subscribeToEvent, unsubscribeFromEvent } = useSocket();

  const fetchLeadData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadRes, timelineRes, notesRes] = await Promise.all([
        leadApi.getLead(id),
        leadApi.getTimeline(id),
        auditApi.getNotes('lead', id),
      ]);

      if (leadRes.data.success) setLead(leadRes.data.data);
      if (timelineRes.data.success) setTimeline(timelineRes.data.data || []);
      if (notesRes.data.success) setNotes(notesRes.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load lead details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLeadData();
  }, [fetchLeadData]);

  // Real-time socket sync
  useEffect(() => {
    const handleUpdate = () => fetchLeadData();
    const events = [
      'lead_updated', 'lead_status_changed', 'lead_assigned',
      'activity_created', 'activity_updated', 'activity_deleted',
      'followup_created', 'followup_updated', 'followup_deleted',
      'task_created', 'task_updated', 'task_deleted',
      'note_created', 'note_deleted'
    ];
    events.forEach((ev) => subscribeToEvent(ev, handleUpdate));
    return () => {
      events.forEach((ev) => unsubscribeFromEvent(ev, handleUpdate));
    };
  }, [fetchLeadData]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    setAddingNote(true);
    try {
      const res = await auditApi.addNote({
        entity_type: 'lead',
        entity_id: parseInt(id),
        content: noteContent.trim(),
      });
      if (res.data.success) {
        setNotes([res.data.data, ...notes]);
        setNoteContent('');
        toast.success('Note added');
        // Refresh timeline
        const tlRes = await leadApi.getTimeline(id);
        if (tlRes.data.success) setTimeline(tlRes.data.data || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };


  const handleSaveFollowup = async (e) => {
    e.preventDefault();
    try {
      await followupApi.createFollowup({ ...folForm, lead_id: parseInt(id) });
      toast.success('Follow-up scheduled');
      setIsFollowupModalOpen(false);
      fetchLeadData();
    } catch (err) {
      toast.error('Failed to schedule follow-up');
    }
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    try {
      await taskApi.createTask({ ...taskForm, lead_id: parseInt(id) });
      toast.success('Task created');
      setIsTaskModalOpen(false);
      fetchLeadData();
    } catch (err) {
      toast.error('Failed to create task');
    }
  };

  if (loading || !lead) {
    return (
      <div className="p-8 text-center text-slate-500">
        <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading lead details...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          to="/leads"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Leads
        </Link>
      </div>

      {/* Profile Header Card */}
      <div className="clay-card p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-center gap-4">
          <Avatar name={lead.name} size="xl" />
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                {lead.name}
              </h1>
              <StatusBadge status={lead.status} />
              <PriorityBadge priority={lead.priority} />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-500" />
              {lead.company_name || 'Individual Lead'} • {lead.industry || 'General Industry'}
            </p>
          </div>
        </div>

        {/* Header Stats */}
        <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Estimated Value
            </span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              ₹{Number(lead.estimated_value || 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Assigned Salesperson
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <Avatar src={lead.assigned_user_avatar} name={lead.assigned_user_name} size="xs" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {lead.assigned_user_name || 'Unassigned'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      {canWrite && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsFollowupModalOpen(true)}
            className="clay-btn-secondary px-3.5 py-2 text-xs flex items-center gap-2"
          >
            <CalendarClock className="w-3.5 h-3.5 text-amber-500" /> Schedule Follow-up
          </button>
          <button
            onClick={() => setIsTaskModalOpen(true)}
            className="clay-btn-secondary px-3.5 py-2 text-xs flex items-center gap-2"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-emerald-500" /> Add Task
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="clay-card p-1.5 flex items-center gap-1.5 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              activeTab === tab
                ? 'bg-brand-600 text-white shadow-clay-pill'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="clay-card p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Contact Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 clay-inset rounded-xl">
                  <span className="text-slate-400 block mb-1 font-semibold text-[11px]">Email Address</span>
                  <a href={`mailto:${lead.email}`} className="font-bold text-brand-600 dark:text-brand-400 hover:underline">
                    {lead.email}
                  </a>
                </div>
                <div className="p-3 clay-inset rounded-xl">
                  <span className="text-slate-400 block mb-1 font-semibold text-[11px]">Phone Number</span>
                  <a href={`tel:${lead.phone}`} className="font-bold text-slate-800 dark:text-slate-200">
                    {lead.phone || '—'}
                  </a>
                </div>
                <div className="p-3 clay-inset rounded-xl">
                  <span className="text-slate-400 block mb-1 font-semibold text-[11px]">Source</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{lead.source}</span>
                </div>
                <div className="p-3 clay-inset rounded-xl">
                  <span className="text-slate-400 block mb-1 font-semibold text-[11px]">Created Date</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatDate(lead.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Add Note Box */}
            {canWrite && (
              <div className="clay-card p-5 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-brand-500" /> Add Internal Note
                </h3>
                <form onSubmit={handleAddNote} className="space-y-3">
                  <textarea
                    rows={3}
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Log important insights, conversation summaries, or next action steps..."
                    className="w-full p-3 clay-inset text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={addingNote || !noteContent.trim()}
                      className="clay-btn-primary px-4 py-2 text-xs flex items-center gap-2 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" /> Save Note
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Right Column Summary */}
          <div className="space-y-6">
            <div className="clay-card p-6 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Lead Status Tracker
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Current Stage:</span>
                  <StatusBadge status={lead.status} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Priority Level:</span>
                  <PriorityBadge priority={lead.priority} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Created By:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {lead.created_by_name || 'System'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chronological Timeline Tab */}
      {activeTab === 'Timeline' && (
        <div className="clay-card p-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
            <History className="w-4 h-4 text-brand-500" /> Chronological Activity & Interaction Timeline
          </h3>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {timeline.length === 0 ? (
              <div className="text-xs text-slate-400">No activity recorded for this lead yet.</div>
            ) : (
              timeline.map((evt, idx) => (
                <div key={idx} className="relative flex items-start gap-4">
                  {/* Timeline dot */}
                  <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-brand-600 ring-4 ring-white dark:ring-slate-900" />

                  <div className="flex-1 p-4 rounded-xl clay-card space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {evt.subject || evt.activity_type}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatDate(evt.event_date)} {evt.event_time ? `@ ${formatTime12Hour(evt.event_time)}` : ''}
                      </span>
                    </div>
                    {evt.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {evt.description}
                      </p>
                    )}
                    <div className="text-[10px] text-slate-400 pt-1 flex items-center gap-1.5">
                      <span>Logged by: {evt.author_name || 'User'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === 'Notes' && (
        <div className="clay-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Internal Collaboration Notes
          </h3>

          <div className="space-y-3">
            {notes.length === 0 ? (
              <div className="text-xs text-slate-400">No internal notes added.</div>
            ) : (
              notes.map((n) => (
                <div key={n.id} className="p-4 rounded-xl clay-inset space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Avatar src={n.author_avatar} name={n.author_name} size="xs" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{n.author_name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{formatDateTime12Hour(n.created_at)}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-6">
                    {n.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Schedule Followup Modal */}
      <Modal isOpen={isFollowupModalOpen} onClose={() => setIsFollowupModalOpen(false)} title="Schedule Follow-up">
        <form onSubmit={handleSaveFollowup} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Follow-up Date</label>
              <input
                type="date"
                required
                value={folForm.followup_date}
                onChange={(e) => setFolForm({ ...folForm, followup_date: e.target.value })}
                className="w-full px-3.5 py-2 clay-inset text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Follow-up Time</label>
              <input
                type="time"
                value={folForm.followup_time}
                onChange={(e) => setFolForm({ ...folForm, followup_time: e.target.value })}
                className="w-full px-3.5 py-2 clay-inset text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Purpose *</label>
            <input
              type="text"
              required
              value={folForm.purpose}
              onChange={(e) => setFolForm({ ...folForm, purpose: e.target.value })}
              placeholder="e.g. Follow up on proposal pricing"
              className="w-full px-3.5 py-2 clay-inset text-xs"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsFollowupModalOpen(false)} className="clay-btn-secondary px-4 py-2 text-xs">Cancel</button>
            <button type="submit" className="clay-btn-primary px-5 py-2 text-xs">Schedule</button>
          </div>
        </form>
      </Modal>

      {/* Add Task Modal */}
      <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title="Create Task">
        <form onSubmit={handleSaveTask} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Task Title *</label>
            <input
              type="text"
              required
              value={taskForm.task_name}
              onChange={(e) => setTaskForm({ ...taskForm, task_name: e.target.value })}
              placeholder="e.g. Prepare customized proposal draft"
              className="w-full px-3.5 py-2 clay-inset text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
              <input
                type="date"
                required
                value={taskForm.due_date}
                onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                className="w-full px-3.5 py-2 clay-inset text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
              <select
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                className="w-full px-3.5 py-2 clay-inset text-xs"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsTaskModalOpen(false)} className="clay-btn-secondary px-4 py-2 text-xs">Cancel</button>
            <button type="submit" className="clay-btn-primary px-5 py-2 text-xs">Create Task</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
