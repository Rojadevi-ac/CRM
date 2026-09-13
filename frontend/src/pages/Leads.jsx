import React, { useState, useEffect, useCallback } from 'react';
import {
  UserPlus,
  Search,
  Filter,
  LayoutGrid,
  List,
  Plus,
  Download,
  MoreVertical,
  Edit2,
  Trash2,
  UserCheck,
  Calendar,
  DollarSign,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { leadApi, userApi, reportApi } from '../api/crmApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import PriorityBadge from '../components/common/PriorityBadge';
import Avatar from '../components/common/Avatar';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { Link, useNavigate } from 'react-router-dom';

const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];
const LEAD_SOURCES = ['Website', 'Google Ads', 'Facebook', 'Instagram', 'Referral', 'Email Campaign', 'Cold Call', 'Event', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

export default function Leads() {
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'kanban'
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [sortBy, setSortBy] = useState('id');
  const [sortDir, setSortDir] = useState('DESC');

  // Staff users for assignment
  const [users, setUsers] = useState([]);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    source: 'Website',
    industry: '',
    status: 'New',
    priority: 'Medium',
    estimated_value: '',
    assigned_user_id: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const { canWrite, isReadOnly } = useAuth();
  const { toast } = useToast();
  const { subscribeToEvent, unsubscribeFromEvent } = useSocket();
  const navigate = useNavigate();

  // Load staff users
  const loadUsers = useCallback(() => {
    userApi.getUsers({ status: 'active' }).then((res) => {
      if (res.data.success) {
        setUsers(res.data.data);
      }
    });
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Fetch leads
  const fetchLeads = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await leadApi.getLeads({
        page,
        limit: viewMode === 'kanban' ? 100 : 15,
        search,
        status: statusFilter,
        source: sourceFilter,
        priority: priorityFilter,
        assigned_user_id: assignedFilter,
        sort_by: sortBy,
        sort_dir: sortDir,
      });

      if (res.data.success) {
        setLeads(res.data.data.leads || []);
        setPagination(res.data.data.pagination || { page: 1, limit: 15, total: 0, pages: 1 });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sourceFilter, priorityFilter, assignedFilter, sortBy, sortDir, viewMode]);

  useEffect(() => {
    fetchLeads(pagination.page);
  }, [fetchLeads]);

  // Real-time socket sync
  useEffect(() => {
    const handleUpdate = () => fetchLeads(pagination.page);
    subscribeToEvent('lead_created', handleUpdate);
    subscribeToEvent('lead_updated', handleUpdate);
    subscribeToEvent('lead_assigned', handleUpdate);
    subscribeToEvent('lead_status_changed', handleUpdate);
    subscribeToEvent('lead_deleted', handleUpdate);

    const handleUserUpdate = () => loadUsers();
    subscribeToEvent('user_created', handleUserUpdate);
    subscribeToEvent('user_updated', handleUserUpdate);

    return () => {
      unsubscribeFromEvent('lead_created', handleUpdate);
      unsubscribeFromEvent('lead_updated', handleUpdate);
      unsubscribeFromEvent('lead_assigned', handleUpdate);
      unsubscribeFromEvent('lead_status_changed', handleUpdate);
      unsubscribeFromEvent('lead_deleted', handleUpdate);
      unsubscribeFromEvent('user_created', handleUserUpdate);
      unsubscribeFromEvent('user_updated', handleUserUpdate);
    };
  }, [pagination.page, loadUsers]);

  // Handle Form submit (Create / Edit)
  const handleSaveLead = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (selectedLead && isEditOpen) {
        await leadApi.updateLead(selectedLead.id, formData);
        toast.success('Lead updated successfully');
        setIsEditOpen(false);
      } else {
        await leadApi.createLead(formData);
        toast.success('Lead created successfully');
        setIsCreateOpen(false);
      }
      fetchLeads(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving lead');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Assign Lead
  const handleAssign = async (userId) => {
    if (!selectedLead) return;
    try {
      await leadApi.assignLead(selectedLead.id, userId || null);
      toast.success('Lead assigned successfully');
      setIsAssignOpen(false);
      fetchLeads(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error assigning lead');
    }
  };

  // Handle Status change from Kanban or dropdown
  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await leadApi.updateStatus(leadId, newStatus);
      toast.success(`Lead moved to ${newStatus}`);
      fetchLeads(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  // Handle Delete Lead
  const handleDelete = async () => {
    if (!selectedLead) return;
    setSubmitting(true);
    try {
      await leadApi.deleteLead(selectedLead.id);
      toast.success('Lead deleted successfully');
      setIsDeleteOpen(false);
      fetchLeads(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete lead');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setSelectedLead(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      company_name: '',
      source: 'Website',
      industry: '',
      status: 'New',
      priority: 'Medium',
      estimated_value: '',
      assigned_user_id: '',
    });
    setIsCreateOpen(true);
  };

  const openEditModal = (lead) => {
    setSelectedLead(lead);
    setFormData({
      name: lead.name,
      email: lead.email,
      phone: lead.phone || '',
      company_name: lead.company_name || '',
      source: lead.source,
      industry: lead.industry || '',
      status: lead.status,
      priority: lead.priority,
      estimated_value: lead.estimated_value || '',
      assigned_user_id: lead.assigned_user_id || '',
    });
    setIsEditOpen(true);
  };

  // Table Columns Definition
  const columns = [
    {
      header: 'Lead Name & Company',
      key: 'name',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <Link
            to={`/leads/${row.id}`}
            className="font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
          >
            {row.name}
          </Link>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
            {row.company_name || 'Individual'}
          </span>
        </div>
      ),
    },
    {
      header: 'Contact Info',
      key: 'email',
      render: (row) => (
        <div className="flex flex-col text-xs">
          <span className="text-slate-700 dark:text-slate-300 font-medium">{row.email}</span>
          <span className="text-slate-400">{row.phone || '—'}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      sortable: true,
      render: (row) => (
        canWrite ? (
          <select
            value={row.status}
            onChange={(e) => handleStatusChange(row.id, e.target.value)}
            className="text-xs bg-transparent border-none font-medium text-slate-700 dark:text-slate-300 cursor-pointer focus:ring-0"
          >
            {LEAD_STATUSES.map((st) => (
              <option key={st} value={st} className="bg-white dark:bg-slate-900">
                {st}
              </option>
            ))}
          </select>
        ) : (
          <StatusBadge status={row.status} />
        )
      ),
    },
    {
      header: 'Priority',
      key: 'priority',
      sortable: true,
      render: (row) => <PriorityBadge priority={row.priority} />,
    },
    {
      header: 'Est. Value',
      key: 'estimated_value',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
          ₹{Number(row.estimated_value || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Source',
      key: 'source',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">{row.source}</span>
      ),
    },
    {
      header: 'Assigned Salesperson',
      key: 'assigned_user_id',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.assigned_user_name ? (
            <>
              <Avatar src={row.assigned_user_avatar} name={row.assigned_user_name} size="xs" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[110px]">
                {row.assigned_user_name}
              </span>
            </>
          ) : (
            <span className="text-xs text-slate-400 italic">Unassigned</span>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            to={`/leads/${row.id}`}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            title="View Details"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
          {canWrite && (
            <>
              <button
                onClick={() => {
                  setSelectedLead(row);
                  setIsAssignOpen(true);
                }}
                className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                title="Assign Lead"
              >
                <UserCheck className="w-4 h-4" />
              </button>
              <button
                onClick={() => openEditModal(row)}
                className="p-1 text-slate-400 hover:text-brand-600 transition-colors"
                title="Edit Lead"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setSelectedLead(row);
                  setIsDeleteOpen(true);
                }}
                className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                title="Delete Lead"
              >
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
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Lead Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Capture, route, qualify, and convert potential B2B opportunities.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View toggle (Table / Kanban) */}
          <div className="flex items-center p-1 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-soft-xs">
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-soft-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Table
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-soft-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Kanban
            </button>
          </div>

          {canWrite && (
            <button
              onClick={openCreateModal}
              className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 rounded-xl shadow-soft shadow-brand-500/25 transition-all flex items-center gap-1.5 hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" /> Create Lead
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 sm:p-5 clay-card flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads by name, email, company..."
            className="w-full pl-10 pr-4 py-2.5 clay-inset text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 clay-pill text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
        >
          <option value="">All Statuses</option>
          {LEAD_STATUSES.map((st) => (
            <option key={st} value={st}>{st}</option>
          ))}
        </select>

        {/* Source filter */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-3.5 py-2.5 clay-pill text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
        >
          <option value="">All Sources</option>
          {LEAD_SOURCES.map((src) => (
            <option key={src} value={src}>{src}</option>
          ))}
        </select>

        {/* Priority filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3.5 py-2.5 clay-pill text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
        >
          <option value="">All Priorities</option>
          {PRIORITIES.map((pri) => (
            <option key={pri} value={pri}>{pri}</option>
          ))}
        </select>

        {/* Assignee filter */}
        <select
          value={assignedFilter}
          onChange={(e) => setAssignedFilter(e.target.value)}
          className="px-3.5 py-2.5 clay-pill text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
        >
          <option value="">All Salespeople</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.full_name}</option>
          ))}
        </select>

        {(search || statusFilter || sourceFilter || priorityFilter || assignedFilter) && (
          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('');
              setSourceFilter('');
              setPriorityFilter('');
              setAssignedFilter('');
            }}
            className="px-3.5 py-2 text-xs font-extrabold text-rose-600 dark:text-rose-400 clay-pill flex items-center gap-1.5 active:scale-95"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Main Content: Table or Kanban */}
      {viewMode === 'table' ? (
        <DataTable
          columns={columns}
          data={leads}
          loading={loading}
          pagination={pagination}
          onPageChange={(p) => fetchLeads(p)}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={(col, dir) => {
            setSortBy(col);
            setSortDir(dir);
          }}
          emptyTitle="No leads found"
          emptyDescription="Start by adding your first B2B sales lead."
          actionText="Create Lead"
          onEmptyAction={canWrite ? openCreateModal : null}
        />
      ) : (
        /* Kanban Board View (Fixed non-overlapping horizontal flex track) */
        <div className="flex gap-5 overflow-x-auto pb-6 w-full items-start min-h-[650px]">
          {LEAD_STATUSES.map((status) => {
            const statusLeads = leads.filter((l) => l.status === status);
            const totalVal = statusLeads.reduce((acc, l) => acc + parseFloat(l.estimated_value || 0), 0);

            return (
              <div
                key={status}
                className="clay-panel w-80 min-w-[320px] shrink-0 flex flex-col max-h-[80vh]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={status} />
                    <span className="text-xs font-extrabold text-slate-400">
                      ({statusLeads.length})
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 clay-pill px-2.5 py-1">
                    ₹{(totalVal / 1000).toFixed(0)}k
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto space-y-3.5 p-1 pr-1.5">
                  {statusLeads.length === 0 ? (
                    <div className="p-8 text-center text-xs font-bold text-slate-400 clay-inset">No leads in {status}</div>
                  ) : (
                    statusLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="p-4 clay-card space-y-3 select-none hover:-translate-y-0.5 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            to={`/leads/${lead.id}`}
                            className="text-xs font-extrabold text-slate-900 dark:text-slate-100 hover:text-brand-600 line-clamp-1 flex-1"
                          >
                            {lead.name}
                          </Link>
                          <PriorityBadge priority={lead.priority} />
                        </div>

                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5 font-medium">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{lead.company_name || 'Individual Prospect'}</span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                          <span className="font-black text-slate-900 dark:text-slate-100 text-xs">
                            ₹{Number(lead.estimated_value || 0).toLocaleString('en-IN')}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Avatar
                              src={lead.assigned_user_avatar}
                              name={lead.assigned_user_name}
                              size="xs"
                            />
                            <span className="text-[11px] text-slate-500 font-bold truncate max-w-[90px]">
                              {lead.assigned_user_name ? lead.assigned_user_name.split(' ')[0] : 'Unassigned'}
                            </span>
                          </div>
                        </div>

                        {/* Quick shift stage for easy desktop/mobile interaction */}
                        {canWrite && (
                          <div className="pt-1">
                            <select
                              value={lead.status}
                              onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                              className="w-full py-1.5 px-2.5 text-[10px] font-extrabold text-slate-700 dark:text-slate-300 clay-inset cursor-pointer focus:outline-none"
                            >
                              {LEAD_STATUSES.map((st) => (
                                <option key={st} value={st} className="bg-white dark:bg-[#131b2c]">
                                  Move to: {st}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Lead Modal */}
      <Modal
        isOpen={isCreateOpen || isEditOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setIsEditOpen(false);
        }}
        title={isEditOpen ? 'Edit Lead Record' : 'Create New Sales Lead'}
      >
        <form onSubmit={handleSaveLead} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Harish Varma"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. harish@company.com"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. +91 98410 99001"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="e.g. CloudMatrix India"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Lead Source
              </label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-500"
              >
                {LEAD_SOURCES.map((src) => (
                  <option key={src} value={src}>{src}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Industry
              </label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="e.g. Information Technology"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-500"
              >
                {LEAD_STATUSES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-500"
              >
                {PRIORITIES.map((pri) => (
                  <option key={pri} value={pri}>{pri}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Estimated Deal Value (INR)
              </label>
              <input
                type="number"
                value={formData.estimated_value}
                onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                placeholder="e.g. 85000"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Assign Salesperson
              </label>
              <select
                value={formData.assigned_user_id}
                onChange={(e) => setFormData({ ...formData, assigned_user_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-500"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name} ({u.role_name})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsCreateOpen(false);
                setIsEditOpen(false);
              }}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {isEditOpen ? 'Save Changes' : 'Create Lead'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Lead Modal */}
      <Modal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title="Assign Lead to Sales Representative"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select an active representative to assign <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedLead?.name}</span> ({selectedLead?.company_name}).
          </p>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
            {users.map((u) => (
              <div
                key={u.id}
                onClick={() => handleAssign(u.id)}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar src={u.avatar_url} name={u.full_name} size="sm" />
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{u.full_name}</div>
                    <div className="text-xs text-slate-400">{u.role_name} • {u.department}</div>
                  </div>
                </div>
                {selectedLead?.assigned_user_id === u.id && (
                  <span className="text-xs font-bold text-brand-600 dark:text-brand-400">Assigned</span>
                )}
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={() => handleAssign(null)}
              className="px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:underline"
            >
              Unassign Lead
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Lead"
        message={`Are you sure you want to permanently delete lead "${selectedLead?.name}"? All associated activities and notes will be removed.`}
        confirmText="Delete Lead"
        loading={submitting}
      />
    </div>
  );
}
