import React, { useState, useEffect, useCallback } from 'react';
import { Contact, Search, Plus, Edit2, Trash2, Mail, Phone, Building2 } from 'lucide-react';
import { contactApi, companyApi } from '../api/crmApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import DataTable from '../components/common/DataTable';
import Avatar from '../components/common/Avatar';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';

const CONTACT_TYPES = ['Decision Maker', 'Influencer', 'Evaluator', 'Executive', 'End User', 'Other'];

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companies, setCompanies] = useState([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    job_title: '',
    company_id: '',
    department: '',
    contact_type: 'Decision Maker',
  });
  const [submitting, setSubmitting] = useState(false);

  const { canWrite } = useAuth();
  const { toast } = useToast();
  const { subscribeToEvent, unsubscribeFromEvent } = useSocket();

  const loadCompanies = useCallback(() => {
    companyApi.getCompanies({ limit: 100 }).then((res) => {
      if (res.data.success) setCompanies(res.data.data.companies || []);
    });
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const fetchContacts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await contactApi.getContacts({ page, limit: 15, search });
      if (res.data.success) {
        setContacts(res.data.data.contacts || []);
        setPagination(res.data.data.pagination || { page: 1, limit: 15, total: 0, pages: 1 });
      }
    } catch (err) {
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchContacts(pagination.page);
  }, [fetchContacts]);

  // Real-time socket sync
  useEffect(() => {
    const handleUpdate = () => fetchContacts(pagination.page);
    const events = ['contact_created', 'contact_updated', 'contact_deleted'];
    events.forEach((ev) => subscribeToEvent(ev, handleUpdate));

    const handleCompUpdate = () => loadCompanies();
    subscribeToEvent('company_created', handleCompUpdate);
    subscribeToEvent('company_updated', handleCompUpdate);

    return () => {
      events.forEach((ev) => unsubscribeFromEvent(ev, handleUpdate));
      unsubscribeFromEvent('company_created', handleCompUpdate);
      unsubscribeFromEvent('company_updated', handleCompUpdate);
    };
  }, [pagination.page, loadCompanies]);

  const handleSaveContact = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditOpen && selectedContact) {
        await contactApi.updateContact(selectedContact.id, formData);
        toast.success('Contact updated');
        setIsEditOpen(false);
      } else {
        await contactApi.createContact(formData);
        toast.success('Contact created');
        setIsCreateOpen(false);
      }
      fetchContacts(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving contact');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedContact) return;
    setSubmitting(true);
    try {
      await contactApi.deleteContact(selectedContact.id);
      toast.success('Contact deleted');
      setIsDeleteOpen(false);
      fetchContacts(1);
    } catch (err) {
      toast.error('Failed to delete contact');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setSelectedContact(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      job_title: '',
      company_id: '',
      department: '',
      contact_type: 'Decision Maker',
    });
    setIsCreateOpen(true);
  };

  const openEditModal = (cnt) => {
    setSelectedContact(cnt);
    setFormData({
      first_name: cnt.first_name,
      last_name: cnt.last_name || '',
      email: cnt.email,
      phone: cnt.phone || '',
      job_title: cnt.job_title || '',
      company_id: cnt.company_id || '',
      department: cnt.department || '',
      contact_type: cnt.contact_type,
    });
    setIsEditOpen(true);
  };

  const columns = [
    {
      header: 'Name & Role',
      key: 'first_name',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${row.first_name} ${row.last_name}`} size="sm" />
          <div>
            <div className="font-semibold text-slate-800 dark:text-slate-200">
              {row.first_name} {row.last_name}
            </div>
            <div className="text-xs text-slate-400">{row.job_title || 'Staff'}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Company',
      key: 'company_name',
      render: (row) => (
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {row.company_name || 'Individual'}
        </span>
      ),
    },
    {
      header: 'Contact Info',
      key: 'email',
      render: (row) => (
        <div className="flex flex-col text-xs">
          <a href={`mailto:${row.email}`} className="text-brand-600 hover:underline">{row.email}</a>
          <span className="text-slate-400">{row.phone || '—'}</span>
        </div>
      ),
    },
    {
      header: 'Type',
      key: 'contact_type',
      render: (row) => (
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-medium">
          {row.contact_type}
        </span>
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
              <button onClick={() => { setSelectedContact(row); setIsDeleteOpen(true); }} className="p-1 text-slate-400 hover:text-rose-600">
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
            <Contact className="w-6 h-6 text-brand-500" /> Contacts
          </h1>
          <p className="text-xs text-slate-500">Business contacts, decision makers, and stakeholder directory.</p>
        </div>
        {canWrite && (
          <button onClick={openCreateModal} className="clay-btn-primary px-4 py-2 text-xs flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Contact
          </button>
        )}
      </div>

      <div className="clay-card p-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts by name, email, phone..."
            className="w-full pl-10 pr-3 py-2 clay-inset text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={contacts}
        loading={loading}
        pagination={pagination}
        onPageChange={(p) => fetchContacts(p)}
        emptyTitle="No contacts found"
        actionText="Add Contact"
        onEmptyAction={canWrite ? openCreateModal : null}
      />

      <Modal isOpen={isCreateOpen || isEditOpen} onClose={() => { setIsCreateOpen(false); setIsEditOpen(false); }} title={isEditOpen ? 'Edit Contact' : 'Add Contact'}>
        <form onSubmit={handleSaveContact} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">First Name *</label>
              <input type="text" required value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="w-full px-3.5 py-2 clay-inset text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Last Name</label>
              <input type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="w-full px-3.5 py-2 clay-inset text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Email Address *</label>
              <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3.5 py-2 clay-inset text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Phone Number</label>
              <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3.5 py-2 clay-inset text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Job Title</label>
              <input type="text" value={formData.job_title} onChange={(e) => setFormData({ ...formData, job_title: e.target.value })} className="w-full px-3.5 py-2 clay-inset text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Company</label>
              <select value={formData.company_id} onChange={(e) => setFormData({ ...formData, company_id: e.target.value })} className="w-full px-3.5 py-2 clay-inset text-xs">
                <option value="">None</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Contact Role</label>
              <select value={formData.contact_type} onChange={(e) => setFormData({ ...formData, contact_type: e.target.value })} className="w-full px-3.5 py-2 clay-inset text-xs">
                {CONTACT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }} className="clay-btn-secondary px-4 py-2 text-xs">Cancel</button>
            <button type="submit" disabled={submitting} className="clay-btn-primary px-5 py-2 text-xs">Save</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Contact"
        message={`Delete contact "${selectedContact?.first_name} ${selectedContact?.last_name}"?`}
        confirmText="Delete"
        loading={submitting}
      />
    </div>
  );
}
