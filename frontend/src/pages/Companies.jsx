import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Search, Plus, Edit2, Trash2, Globe, Phone, Mail, Users, Eye } from 'lucide-react';
import { companyApi, userApi } from '../api/crmApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import DataTable from '../components/common/DataTable';
import Avatar from '../components/common/Avatar';
import Modal from '../components/common/Modal';
import Drawer from '../components/common/Drawer';
import ConfirmDialog from '../components/common/ConfirmDialog';

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [users, setUsers] = useState([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyDetails, setCompanyDetails] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    website: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    employee_count: '',
    annual_revenue: '',
    owner_id: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const { canWrite } = useAuth();
  const { toast } = useToast();
  const { subscribeToEvent, unsubscribeFromEvent } = useSocket();

  const loadUsers = useCallback(() => {
    userApi.getUsers({ status: 'active' }).then((res) => {
      if (res.data.success) setUsers(res.data.data || []);
    });
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const fetchCompanies = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await companyApi.getCompanies({ page, limit: 15, search, industry: industryFilter });
      if (res.data.success) {
        setCompanies(res.data.data.companies || []);
        setPagination(res.data.data.pagination || { page: 1, limit: 15, total: 0, pages: 1 });
      }
    } catch (err) {
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, [search, industryFilter]);

  useEffect(() => {
    fetchCompanies(pagination.page);
  }, [fetchCompanies]);

  // Real-time socket sync
  useEffect(() => {
    const handleUpdate = () => fetchCompanies(pagination.page);
    const events = ['company_created', 'company_updated', 'company_deleted'];
    events.forEach((ev) => subscribeToEvent(ev, handleUpdate));

    const handleUserUpdate = () => loadUsers();
    subscribeToEvent('user_created', handleUserUpdate);
    subscribeToEvent('user_updated', handleUserUpdate);

    return () => {
      events.forEach((ev) => unsubscribeFromEvent(ev, handleUpdate));
      unsubscribeFromEvent('user_created', handleUserUpdate);
      unsubscribeFromEvent('user_updated', handleUserUpdate);
    };
  }, [pagination.page, loadUsers]);

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditOpen && selectedCompany) {
        await companyApi.updateCompany(selectedCompany.id, formData);
        toast.success('Company updated');
        setIsEditOpen(false);
      } else {
        await companyApi.createCompany(formData);
        toast.success('Company created');
        setIsCreateOpen(false);
      }
      fetchCompanies(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving company');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDrawer = async (comp) => {
    setSelectedCompany(comp);
    setIsDrawerOpen(true);
    try {
      const res = await companyApi.getCompany(comp.id);
      if (res.data.success) setCompanyDetails(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!selectedCompany) return;
    setSubmitting(true);
    try {
      await companyApi.deleteCompany(selectedCompany.id);
      toast.success('Company deleted');
      setIsDeleteOpen(false);
      fetchCompanies(1);
    } catch (err) {
      toast.error('Failed to delete company');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setSelectedCompany(null);
    setFormData({
      name: '',
      industry: '',
      website: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      country: 'India',
      employee_count: '',
      annual_revenue: '',
      owner_id: '',
    });
    setIsCreateOpen(true);
  };

  const openEditModal = (comp) => {
    setSelectedCompany(comp);
    setFormData({
      name: comp.name,
      industry: comp.industry || '',
      website: comp.website || '',
      phone: comp.phone || '',
      email: comp.email || '',
      address: comp.address || '',
      city: comp.city || '',
      state: comp.state || '',
      country: comp.country || 'India',
      employee_count: comp.employee_count || '',
      annual_revenue: comp.annual_revenue || '',
      owner_id: comp.owner_id || '',
    });
    setIsEditOpen(true);
  };

  const columns = [
    {
      header: 'Company Name',
      key: 'name',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <button
            onClick={() => handleOpenDrawer(row)}
            className="font-semibold text-brand-600 dark:text-brand-400 hover:underline text-left"
          >
            {row.name}
          </button>
          <span className="text-xs text-slate-500">{row.city ? `${row.city}, ${row.state}` : 'India'}</span>
        </div>
      ),
    },
    {
      header: 'Industry',
      key: 'industry',
      render: (row) => <span className="text-xs font-medium">{row.industry || 'General'}</span>,
    },
    {
      header: 'Contacts / Deals',
      key: 'contacts',
      render: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {row.contact_count || 0} Contacts • {row.deal_count || 0} Deals
        </span>
      ),
    },
    {
      header: 'Annual Revenue',
      key: 'annual_revenue',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
          ₹{Number(row.annual_revenue || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Assigned Salesperson',
      key: 'owner_name',
      render: (row) => <span className="text-xs text-slate-600 dark:text-slate-400">{row.owner_name || '—'}</span>,
    },
    {
      header: 'Actions',
      key: 'actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={() => handleOpenDrawer(row)} className="p-1 text-slate-400 hover:text-slate-600">
            <Eye className="w-4 h-4" />
          </button>
          {canWrite && (
            <>
              <button onClick={() => openEditModal(row)} className="p-1 text-slate-400 hover:text-brand-600">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => { setSelectedCompany(row); setIsDeleteOpen(true); }} className="p-1 text-slate-400 hover:text-rose-600">
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
            <Building2 className="w-6 h-6 text-brand-500" /> Companies
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Manage client accounts and enterprise organizations.</p>
        </div>
        {canWrite && (
          <button onClick={openCreateModal} className="clay-btn-primary px-4 py-2 text-xs flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Company
          </button>
        )}
      </div>

      <div className="clay-card p-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies by name, city, email..."
            className="w-full pl-10 pr-3 py-2 clay-inset text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={companies}
        loading={loading}
        pagination={pagination}
        onPageChange={(p) => fetchCompanies(p)}
        emptyTitle="No companies found"
        actionText="Add Company"
        onEmptyAction={canWrite ? openCreateModal : null}
      />

      <Modal isOpen={isCreateOpen || isEditOpen} onClose={() => { setIsCreateOpen(false); setIsEditOpen(false); }} title={isEditOpen ? 'Edit Company' : 'Add Company'}>
        <form onSubmit={handleSaveCompany} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Company Name *</label>
              <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3.5 py-2 clay-inset text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Industry</label>
              <input type="text" value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} className="w-full px-3.5 py-2 clay-inset text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Website</label>
              <input type="url" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} className="w-full px-3.5 py-2 clay-inset text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3.5 py-2 clay-inset text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">City</label>
              <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full px-3.5 py-2 clay-inset text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Annual Revenue (INR)</label>
              <input type="number" value={formData.annual_revenue} onChange={(e) => setFormData({ ...formData, annual_revenue: e.target.value })} className="w-full px-3.5 py-2 clay-inset text-xs" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }} className="clay-btn-secondary px-4 py-2 text-xs">Cancel</button>
            <button type="submit" disabled={submitting} className="clay-btn-primary px-5 py-2 text-xs">Save</button>
          </div>
        </form>
      </Modal>

      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Company & Contacts">
        {selectedCompany && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-brand-600" />
              <div>
                <h3 className="text-base font-bold">{selectedCompany.name}</h3>
                <p className="text-xs text-slate-400">{selectedCompany.industry} • {selectedCompany.city}</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Contacts ({companyDetails?.contacts?.length || 0})
              </h4>
              <div className="space-y-2">
                {companyDetails?.contacts?.map((cnt) => (
                  <div key={cnt.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                    <div className="font-bold">{cnt.first_name} {cnt.last_name}</div>
                    <div className="text-slate-500">{cnt.job_title} • {cnt.email}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Company"
        message={`Delete company "${selectedCompany?.name}"?`}
        confirmText="Delete"
        loading={submitting}
      />
    </div>
  );
}
