import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Building2,
  Mail,
  Phone,
  Eye,
  DollarSign,
  Briefcase,
} from 'lucide-react';
import { customerApi, companyApi, userApi } from '../api/crmApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Avatar from '../components/common/Avatar';
import Modal from '../components/common/Modal';
import Drawer from '../components/common/Drawer';
import ConfirmDialog from '../components/common/ConfirmDialog';

const CUSTOMER_TYPES = ['Individual', 'Small Business', 'Enterprise', 'Corporate'];
const CUSTOMER_STATUSES = ['Active', 'Inactive', 'Potential'];

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');

  // Dropdown options
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);

  // Modals & Drawers
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetails, setCustomerDetails] = useState(null);

  const [formData, setFormData] = useState({
    customer_name: '',
    email: '',
    phone: '',
    company_id: '',
    industry: '',
    customer_type: 'Enterprise',
    status: 'Active',
    owner_id: '',
    address: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const { canWrite } = useAuth();
  const { toast } = useToast();
  const { subscribeToEvent, unsubscribeFromEvent } = useSocket();

  const loadDropdowns = useCallback(() => {
    companyApi.getCompanies({ limit: 100 }).then((res) => {
      if (res.data.success) setCompanies(res.data.data.companies || []);
    });
    userApi.getUsers({ status: 'active' }).then((res) => {
      if (res.data.success) setUsers(res.data.data || []);
    });
  }, []);

  useEffect(() => {
    loadDropdowns();
  }, [loadDropdowns]);

  const fetchCustomers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await customerApi.getCustomers({
        page,
        limit: 15,
        search,
        status: statusFilter,
        industry: industryFilter,
        customer_type: typeFilter,
        owner_id: ownerFilter,
      });
      if (res.data.success) {
        setCustomers(res.data.data.customers || []);
        setPagination(res.data.data.pagination || { page: 1, limit: 15, total: 0, pages: 1 });
      }
    } catch (err) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, industryFilter, typeFilter, ownerFilter]);

  useEffect(() => {
    fetchCustomers(pagination.page);
  }, [fetchCustomers]);

  // Real-time socket sync
  useEffect(() => {
    const handleUpdate = () => fetchCustomers(pagination.page);
    const events = ['customer_created', 'customer_updated', 'customer_deleted'];
    events.forEach((ev) => subscribeToEvent(ev, handleUpdate));

    const handleDropdownUpdate = () => loadDropdowns();
    subscribeToEvent('company_created', handleDropdownUpdate);
    subscribeToEvent('company_updated', handleDropdownUpdate);
    subscribeToEvent('user_created', handleDropdownUpdate);
    subscribeToEvent('user_updated', handleDropdownUpdate);

    return () => {
      events.forEach((ev) => unsubscribeFromEvent(ev, handleUpdate));
      unsubscribeFromEvent('company_created', handleDropdownUpdate);
      unsubscribeFromEvent('company_updated', handleDropdownUpdate);
      unsubscribeFromEvent('user_created', handleDropdownUpdate);
      unsubscribeFromEvent('user_updated', handleDropdownUpdate);
    };
  }, [pagination.page, loadDropdowns]);

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditOpen && selectedCustomer) {
        await customerApi.updateCustomer(selectedCustomer.id, formData);
        toast.success('Customer updated successfully');
        setIsEditOpen(false);
      } else {
        await customerApi.createCustomer(formData);
        toast.success('Customer created successfully');
        setIsCreateOpen(false);
      }
      fetchCustomers(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDrawer = async (cust) => {
    setSelectedCustomer(cust);
    setIsDrawerOpen(true);
    try {
      const res = await customerApi.getCustomer(cust.id);
      if (res.data.success) setCustomerDetails(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!selectedCustomer) return;
    setSubmitting(true);
    try {
      await customerApi.deleteCustomer(selectedCustomer.id);
      toast.success('Customer deleted');
      setIsDeleteOpen(false);
      fetchCustomers(1);
    } catch (err) {
      toast.error('Failed to delete customer');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setSelectedCustomer(null);
    setFormData({
      customer_name: '',
      email: '',
      phone: '',
      company_id: '',
      industry: '',
      customer_type: 'Enterprise',
      status: 'Active',
      owner_id: '',
      address: '',
    });
    setIsCreateOpen(true);
  };

  const openEditModal = (cust) => {
    setSelectedCustomer(cust);
    setFormData({
      customer_name: cust.customer_name,
      email: cust.email,
      phone: cust.phone || '',
      company_id: cust.company_id || '',
      industry: cust.industry || '',
      customer_type: cust.customer_type,
      status: cust.status,
      owner_id: cust.owner_id || '',
      address: cust.address || '',
    });
    setIsEditOpen(true);
  };

  const columns = [
    {
      header: 'Customer Name & Company',
      key: 'customer_name',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <button
            onClick={() => handleOpenDrawer(row)}
            className="font-semibold text-brand-600 dark:text-brand-400 hover:underline text-left"
          >
            {row.customer_name}
          </button>
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
      header: 'Type & Industry',
      key: 'customer_type',
      render: (row) => (
        <div className="flex flex-col text-xs">
          <span className="font-medium text-slate-800 dark:text-slate-200">{row.customer_type}</span>
          <span className="text-slate-400">{row.industry || 'General'}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Deals / Revenue',
      key: 'revenue',
      render: (row) => (
        <div className="flex flex-col text-xs">
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            ₹{Number(row.total_revenue || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-slate-400">{row.total_deals || 0} deals</span>
        </div>
      ),
    },
    {
      header: 'Assigned Salesperson',
      key: 'owner_name',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.owner_name ? (
            <>
              <Avatar src={row.owner_avatar} name={row.owner_name} size="xs" />
              <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate">
                {row.owner_name}
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
          <button
            onClick={() => handleOpenDrawer(row)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          {canWrite && (
            <>
              <button
                onClick={() => openEditModal(row)}
                className="p-1 text-slate-400 hover:text-brand-600"
                title="Edit Customer"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setSelectedCustomer(row);
                  setIsDeleteOpen(true);
                }}
                className="p-1 text-slate-400 hover:text-rose-600"
                title="Delete Customer"
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-500" /> Customer Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Active accounts, enterprise clients, and revenue history.
          </p>
        </div>

        {canWrite && (
          <button
            onClick={openCreateModal}
            className="clay-btn-primary px-4 py-2 text-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="clay-card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, email, phone..."
            className="w-full pl-10 pr-3 py-2 clay-inset text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2 clay-inset text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
        >
          <option value="">All Statuses</option>
          {CUSTOMER_STATUSES.map((st) => (
            <option key={st} value={st}>{st}</option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3.5 py-2 clay-inset text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
        >
          <option value="">All Account Types</option>
          {CUSTOMER_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={customers}
        loading={loading}
        pagination={pagination}
        onPageChange={(p) => fetchCustomers(p)}
        emptyTitle="No customers found"
        emptyDescription="Add enterprise accounts or convert won leads to customers."
        actionText="Add Customer"
        onEmptyAction={canWrite ? openCreateModal : null}
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isCreateOpen || isEditOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setIsEditOpen(false);
        }}
        title={isEditOpen ? 'Edit Customer' : 'Add New Customer'}
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Customer / Account Name *
              </label>
              <input
                type="text"
                required
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                placeholder="e.g. Apex Retail Group"
                className="w-full px-3.5 py-2 clay-inset text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. accounts@apexretail.example.com"
                className="w-full px-3.5 py-2 clay-inset text-xs"
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
                placeholder="e.g. +91 44 2847 1100"
                className="w-full px-3.5 py-2 clay-inset text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Parent Company
              </label>
              <select
                value={formData.company_id}
                onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                className="w-full px-3.5 py-2 clay-inset text-xs"
              >
                <option value="">None / Standalone</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
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
                placeholder="e.g. Retail / FMCG"
                className="w-full px-3.5 py-2 clay-inset text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Account Type
              </label>
              <select
                value={formData.customer_type}
                onChange={(e) => setFormData({ ...formData, customer_type: e.target.value })}
                className="w-full px-3.5 py-2 clay-inset text-xs"
              >
                {CUSTOMER_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2 clay-inset text-xs"
              >
                {CUSTOMER_STATUSES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Assigned Salesperson
              </label>
              <select
                value={formData.owner_id}
                onChange={(e) => setFormData({ ...formData, owner_id: e.target.value })}
                className="w-full px-3.5 py-2 clay-inset text-xs"
              >
                <option value="">Select Staff</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name} ({u.role_name})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Billing / Office Address
            </label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3.5 py-2 clay-inset text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsCreateOpen(false);
                setIsEditOpen(false);
              }}
              className="clay-btn-secondary px-4 py-2 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="clay-btn-primary px-5 py-2 text-xs"
            >
              {submitting ? 'Saving...' : isEditOpen ? 'Save Changes' : 'Create Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Slide-over Drawer for Details */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Customer Profile & Deals"
      >
        {selectedCustomer && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Avatar name={selectedCustomer.customer_name} size="lg" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {selectedCustomer.customer_name}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedCustomer.company_name || 'Individual'} • {selectedCustomer.industry}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <StatusBadge status={selectedCustomer.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedCustomer.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Phone:</span>
                <span>{selectedCustomer.phone || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Assigned Salesperson:</span>
                <span>{selectedCustomer.owner_name || 'Unassigned'}</span>
              </div>
            </div>

            {/* Associated Deals */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Associated Deals ({customerDetails?.deals?.length || 0})
              </h4>
              <div className="space-y-2">
                {customerDetails?.deals?.length === 0 ? (
                  <p className="text-xs text-slate-400">No deals associated yet.</p>
                ) : (
                  customerDetails?.deals?.map((d) => (
                    <div key={d.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">{d.deal_name}</div>
                        <div className="text-slate-400">{d.stage}</div>
                      </div>
                      <span className="font-bold text-emerald-600">₹{Number(d.amount).toLocaleString('en-IN')}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Customer"
        message={`Delete customer "${selectedCustomer?.customer_name}"?`}
        confirmText="Delete Customer"
        loading={submitting}
      />
    </div>
  );
}
