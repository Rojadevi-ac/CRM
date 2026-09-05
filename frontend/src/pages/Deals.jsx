import React, { useState, useEffect, useCallback } from 'react';
import {
  Handshake,
  Search,
  Plus,
  Edit2,
  Trash2,
  List,
  LayoutGrid,
  DollarSign,
  TrendingUp,
  Percent,
  Calendar,
  Building2,
  Package,
  Clock,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
} from 'lucide-react';
import { dealApi, customerApi, companyApi, userApi, productApi } from '../api/crmApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Avatar from '../components/common/Avatar';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { formatTime12Hour, formatDateTime12Hour, formatDate } from '../utils/dateUtils';

const DEAL_STAGES = ['Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
const DEAL_STAGE_PROBABILITIES = {
  Qualification: 20,
  Proposal: 50,
  Negotiation: 75,
  'Closed Won': 100,
  'Closed Lost': 0,
};

export default function Deals() {
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'table'
  const [deals, setDeals] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');

  // Dropdowns
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);

  // Form with line items
  const [formData, setFormData] = useState({
    deal_name: '',
    customer_id: '',
    company_id: '',
    amount: '',
    stage: 'Qualification',
    probability: 20,
    expected_closing_date: '',
    owner_id: '',
    source: 'Organic',
    items: [],
  });
  const [submitting, setSubmitting] = useState(false);

  const { canWrite } = useAuth();
  const { toast } = useToast();
  const { subscribeToEvent, unsubscribeFromEvent } = useSocket();

  const loadDropdowns = useCallback(() => {
    customerApi.getCustomers({ limit: 100 }).then((res) => {
      if (res.data.success) setCustomers(res.data.data.customers || []);
    });
    userApi.getUsers({ status: 'active' }).then((res) => {
      if (res.data.success) setUsers(res.data.data || []);
    });
    productApi.getProducts({ status: 'Active' }).then((res) => {
      if (res.data.success) setProducts(res.data.data || []);
    });
  }, []);

  useEffect(() => {
    loadDropdowns();
  }, [loadDropdowns]);

  const fetchDeals = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await dealApi.getDeals({
        page,
        limit: viewMode === 'kanban' ? 100 : 15,
        search,
        stage: stageFilter,
        owner_id: ownerFilter,
      });
      if (res.data.success) {
        setDeals(res.data.data.deals || []);
        setPagination(res.data.data.pagination || { page: 1, limit: 15, total: 0, pages: 1 });
      }
    } catch (err) {
      toast.error('Failed to load deals');
    } finally {
      setLoading(false);
    }
  }, [search, stageFilter, ownerFilter, viewMode]);

  useEffect(() => {
    fetchDeals(pagination.page);
  }, [fetchDeals]);

  // Real-time socket sync
  useEffect(() => {
    const handleUpdate = () => fetchDeals(pagination.page);
    subscribeToEvent('deal_created', handleUpdate);
    subscribeToEvent('deal_updated', handleUpdate);
    subscribeToEvent('deal_stage_changed', handleUpdate);
    subscribeToEvent('deal_deleted', handleUpdate);

    const handleDropdownUpdate = () => loadDropdowns();
    subscribeToEvent('customer_created', handleDropdownUpdate);
    subscribeToEvent('customer_updated', handleDropdownUpdate);
    subscribeToEvent('product_created', handleDropdownUpdate);
    subscribeToEvent('product_updated', handleDropdownUpdate);
    subscribeToEvent('user_created', handleDropdownUpdate);
    subscribeToEvent('user_updated', handleDropdownUpdate);

    return () => {
      unsubscribeFromEvent('deal_created', handleUpdate);
      unsubscribeFromEvent('deal_updated', handleUpdate);
      unsubscribeFromEvent('deal_stage_changed', handleUpdate);
      unsubscribeFromEvent('deal_deleted', handleUpdate);

      unsubscribeFromEvent('customer_created', handleDropdownUpdate);
      unsubscribeFromEvent('customer_updated', handleDropdownUpdate);
      unsubscribeFromEvent('product_created', handleDropdownUpdate);
      unsubscribeFromEvent('product_updated', handleDropdownUpdate);
      unsubscribeFromEvent('user_created', handleDropdownUpdate);
      unsubscribeFromEvent('user_updated', handleDropdownUpdate);
    };
  }, [pagination.page, loadDropdowns, fetchDeals]);

  const handleStageChange = async (dealId, newStage) => {
    const prevDeals = [...deals];
    const nowIso = new Date().toISOString();
    const nowTimeStr = formatTime12Hour(new Date());
    const targetProb = DEAL_STAGE_PROBABILITIES[newStage] !== undefined ? DEAL_STAGE_PROBABILITIES[newStage] : 0;

    // Optimistic update so UI updates immediately in Kanban board
    setDeals((prev) =>
      prev.map((d) =>
        d.id === dealId
          ? {
              ...d,
              stage: newStage,
              probability: targetProb,
              weighted_value: (parseFloat(d.amount || 0) * targetProb / 100),
              updated_at: nowIso,
            }
          : d
      )
    );

    try {
      const res = await dealApi.updateStage(dealId, newStage);
      if (res.data.success && res.data.data) {
        setDeals((prev) =>
          prev.map((d) => (d.id === dealId ? { ...d, ...res.data.data } : d))
        );
      }
      toast.success(`Deal moved to "${newStage}" at ${nowTimeStr}`);
    } catch (err) {
      setDeals(prevDeals); // Revert on failure
      toast.error(err.response?.data?.message || 'Failed to update deal stage');
    }
  };

  const handleSaveDeal = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const nowTimeStr = formatTime12Hour(new Date());
    const payload = {
      ...formData,
      customer_id: formData.customer_id ? parseInt(formData.customer_id) : null,
      company_id: formData.company_id ? parseInt(formData.company_id) : null,
      owner_id: formData.owner_id ? parseInt(formData.owner_id) : null,
      probability: DEAL_STAGE_PROBABILITIES[formData.stage] !== undefined ? DEAL_STAGE_PROBABILITIES[formData.stage] : formData.probability,
    };
    try {
      if (isEditOpen && selectedDeal) {
        const res = await dealApi.updateDeal(selectedDeal.id, payload);
        if (res.data.success && res.data.data) {
          setDeals((prev) =>
            prev.map((d) => (d.id === selectedDeal.id ? { ...d, ...res.data.data } : d))
          );
        }
        toast.success(`Deal updated successfully at ${nowTimeStr}`);
        setIsEditOpen(false);
      } else {
        const res = await dealApi.createDeal(payload);
        if (res.data.success && res.data.data) {
          setDeals((prev) => [res.data.data, ...prev]);
        }
        toast.success(`Deal created successfully at ${nowTimeStr}`);
        setIsCreateOpen(false);
      }
      fetchDeals(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving deal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDeal) return;
    setSubmitting(true);
    const nowTimeStr = formatTime12Hour(new Date());
    try {
      await dealApi.deleteDeal(selectedDeal.id);
      setDeals((prev) => prev.filter((d) => d.id !== selectedDeal.id));
      toast.success(`Deal deleted at ${nowTimeStr}`);
      setIsDeleteOpen(false);
      fetchDeals(pagination.page);
    } catch (err) {
      toast.error('Failed to delete deal');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setSelectedDeal(null);
    setFormData({
      deal_name: '',
      customer_id: '',
      company_id: '',
      amount: '',
      stage: 'Qualification',
      probability: 20,
      expected_closing_date: '',
      owner_id: '',
      source: 'Organic',
      items: [],
    });
    setIsCreateOpen(true);
  };

  const openEditModal = async (deal) => {
    setSelectedDeal(deal);
    try {
      const res = await dealApi.getDeal(deal.id);
      const detail = res.data.data;
      setFormData({
        deal_name: detail.deal_name,
        customer_id: detail.customer_id || '',
        company_id: detail.company_id || '',
        amount: detail.amount,
        stage: detail.stage,
        probability: detail.probability,
        expected_closing_date: detail.expected_closing_date || '',
        owner_id: detail.owner_id || '',
        source: detail.source || 'Organic',
        items: detail.items || [],
      });
      setIsEditOpen(true);
    } catch (err) {
      toast.error('Error fetching deal details');
    }
  };

  const addProductItem = (prod) => {
    const newItem = {
      product_id: prod.id,
      product_name: prod.name,
      quantity: 1,
      unit_price: prod.price,
      tax_rate: prod.tax_rate,
      discount_percent: 0,
    };
    const updated = [...formData.items, newItem];
    // Calculate new total amount
    const totalAmt = updated.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price * (1 - item.discount_percent / 100) * (1 + item.tax_rate / 100));
    }, 0);
    setFormData({ ...formData, items: updated, amount: Math.round(totalAmt) });
  };

  const removeItem = (index) => {
    const updated = formData.items.filter((_, i) => i !== index);
    const totalAmt = updated.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price * (1 - item.discount_percent / 100) * (1 + item.tax_rate / 100));
    }, 0);
    setFormData({ ...formData, items: updated, amount: Math.round(totalAmt) });
  };

  const columns = [
    {
      header: 'Deal Name & Customer',
      key: 'deal_name',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 dark:text-slate-100">{row.deal_name}</span>
          <span className="text-xs text-slate-500">{row.customer_name || row.lead_name || 'Prospect'}</span>
        </div>
      ),
    },
    {
      header: 'Deal Amount',
      key: 'amount',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
            ₹{Number(row.amount).toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-400">
            Weighted: ₹{Number(row.weighted_value || 0).toLocaleString('en-IN')} ({row.probability}%)
          </span>
        </div>
      ),
    },
    {
      header: 'Stage',
      key: 'stage',
      sortable: true,
      render: (row) => (
        canWrite ? (
          <select
            value={row.stage}
            onChange={(e) => handleStageChange(row.id, e.target.value)}
            className="text-xs bg-transparent border-none font-medium text-slate-700 dark:text-slate-300 cursor-pointer focus:ring-0"
          >
            {DEAL_STAGES.map((st) => (
              <option key={st} value={st} className="bg-white dark:bg-slate-900">{st}</option>
            ))}
          </select>
        ) : (
          <StatusBadge status={row.stage} />
        )
      ),
    },
    {
      header: 'Expected Close',
      key: 'expected_closing_date',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
          {row.expected_closing_date ? formatDate(row.expected_closing_date) : '—'}
        </span>
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
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{row.owner_name}</span>
            </>
          ) : (
            <span className="text-xs text-slate-400">Unassigned</span>
          )}
        </div>
      ),
    },
    {
      header: 'Last Updated',
      key: 'updated_at',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 text-xs">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{formatDateTime12Hour(row.updated_at || row.created_at)}</span>
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
              <button
                onClick={() => openEditModal(row)}
                title="Edit Deal"
                className="p-1 text-slate-400 hover:text-brand-600 rounded transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setSelectedDeal(row); setIsDeleteOpen(true); }}
                title="Delete Deal"
                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Sales Deals & Pipeline
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track revenue stages, probability weighting, and product line items with real-time sync.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Pipeline Kanban
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Table
            </button>
          </div>

          {canWrite && (
            <button
              onClick={openCreateModal}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Create Deal
            </button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search deals, customers, companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs placeholder:text-slate-400"
          />
        </div>

        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
        >
          <option value="">All Salespersons</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.full_name}</option>
          ))}
        </select>

        {(search || ownerFilter) && (
          <button
            onClick={() => {
              setSearch('');
              setOwnerFilter('');
            }}
            className="p-1.5 text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        )}
      </div>

      {/* Kanban Pipeline View */}
      {viewMode === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4 w-full">
          {DEAL_STAGES.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage === stage);
            const totalStageAmt = stageDeals.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);

            return (
              <div
                key={stage}
                className="bg-slate-100/70 dark:bg-slate-850/60 rounded-xl p-3 border border-slate-200 dark:border-slate-800 w-80 shrink-0 flex flex-col h-[75vh]"
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={stage} />
                    <span className="text-xs font-bold text-slate-500">({stageDeals.length})</span>
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    ₹{(totalStageAmt / 1000).toFixed(0)}k
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {stageDeals.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">No deals in this stage</div>
                  ) : (
                    stageDeals.map((deal) => {
                      const isLost = deal.stage === 'Closed Lost';
                      const isWon = deal.stage === 'Closed Won';

                      return (
                        <div
                          key={deal.id}
                          className={`p-3.5 rounded-lg border transition-all space-y-2.5 select-none ${
                            isLost
                              ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900/70 shadow-2xs'
                              : isWon
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-900/70 shadow-2xs'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-md'
                          }`}
                        >
                          {/* Header: Title, Probability & Quick Actions */}
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                              {deal.deal_name}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {isLost ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 font-bold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                  Lost (0%)
                                </span>
                              ) : isWon ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  Won (100%)
                                </span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-400">
                                  {deal.probability}%
                                </span>
                              )}
                              {canWrite && (
                                <div className="flex items-center gap-0.5">
                                  <button
                                    onClick={() => openEditModal(deal)}
                                    title="Edit Deal"
                                    className="p-1 text-slate-400 hover:text-brand-600 rounded transition-colors"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => { setSelectedDeal(deal); setIsDeleteOpen(true); }}
                                    title="Delete Deal"
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Customer / Prospect Name */}
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{deal.customer_name || deal.lead_name || 'Prospect'}</span>
                          </div>

                          {/* Amount & Salesperson */}
                          <div className="flex items-center justify-between pt-1 text-xs">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              ₹{Number(deal.amount).toLocaleString('en-IN')}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Avatar src={deal.owner_avatar} name={deal.owner_name} size="xs" />
                              <span className="text-[10px] text-slate-500 truncate max-w-[80px]">
                                {deal.owner_name ? deal.owner_name.split(' ')[0] : 'Unassigned'}
                              </span>
                            </div>
                          </div>

                          {/* Updated Timestamp Badge */}
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded border border-slate-100 dark:border-slate-800">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">
                              Updated: {formatDateTime12Hour(deal.updated_at || deal.created_at)}
                            </span>
                          </div>

                          {/* Quick 1-Click Action & Stage Selector */}
                          {canWrite && (
                            <div className="pt-0.5 space-y-1.5">
                              {!isLost && !isWon ? (
                                <div className="grid grid-cols-2 gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleStageChange(deal.id, 'Closed Won')}
                                    className="py-1 px-2 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 rounded flex items-center justify-center gap-1 transition-colors"
                                  >
                                    <CheckCircle2 className="w-3 h-3" /> Mark Won
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStageChange(deal.id, 'Closed Lost')}
                                    className="py-1 px-2 text-[10px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800 rounded flex items-center justify-center gap-1 transition-colors"
                                  >
                                    <XCircle className="w-3 h-3" /> Mark Lost
                                  </button>
                                </div>
                              ) : isLost ? (
                                <button
                                  type="button"
                                  onClick={() => handleStageChange(deal.id, 'Proposal')}
                                  className="w-full py-1 px-2 text-[10px] font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded flex items-center justify-center gap-1 transition-colors"
                                >
                                  <RotateCcw className="w-3 h-3 text-brand-600" /> Reopen to Proposal
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleStageChange(deal.id, 'Negotiation')}
                                  className="w-full py-1 px-2 text-[10px] font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded flex items-center justify-center gap-1 transition-colors"
                                >
                                  <RotateCcw className="w-3 h-3 text-emerald-600" /> Reopen to Negotiation
                                </button>
                              )}

                              <select
                                value={deal.stage}
                                onChange={(e) => handleStageChange(deal.id, e.target.value)}
                                className="text-[11px] py-1 px-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300 w-full focus:ring-1 focus:ring-brand-500"
                              >
                                {DEAL_STAGES.map((st) => (
                                  <option key={st} value={st}>Move to: {st}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={deals}
          loading={loading}
          pagination={pagination}
          onPageChange={(p) => fetchDeals(p)}
          emptyTitle="No deals found"
          actionText="Create Deal"
          onEmptyAction={canWrite ? openCreateModal : null}
        />
      )}

      {/* Create / Edit Deal Modal with Product Line Item Builder */}
      <Modal
        isOpen={isCreateOpen || isEditOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setIsEditOpen(false);
        }}
        title={isEditOpen ? 'Edit Deal & Line Items' : 'Create New Sales Deal'}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSaveDeal} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Deal Name *</label>
              <input
                type="text"
                required
                value={formData.deal_name}
                onChange={(e) => setFormData({ ...formData, deal_name: e.target.value })}
                placeholder="e.g. Apex Omni-CRM Expansion"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Customer / Account</label>
              <select
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              >
                <option value="">Select Customer (Optional)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.customer_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Deal Amount (INR) *</label>
              <input
                type="number"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="e.g. 135000"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Pipeline Stage</label>
              <select
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              >
                {DEAL_STAGES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Expected Closing Date</label>
              <input
                type="date"
                value={formData.expected_closing_date}
                onChange={(e) => setFormData({ ...formData, expected_closing_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Assigned Salesperson</label>
              <select
                value={formData.owner_id}
                onChange={(e) => setFormData({ ...formData, owner_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              >
                <option value="">Select Representative</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name} ({u.role_name})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Product Items Catalog Quick-Add */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-brand-600" /> Products & Services Line Items
              </span>
              <span className="text-[11px] text-slate-400">Add products to compute deal total</span>
            </div>

            {/* Product selection pill buttons */}
            <div className="flex flex-wrap gap-1.5">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addProductItem(p)}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-950 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-700 dark:text-slate-300 font-medium transition-colors"
                >
                  + {p.name} (₹{p.price})
                </button>
              ))}
            </div>

            {/* Selected items list */}
            {formData.items.length > 0 && (
              <div className="divide-y divide-slate-200 dark:divide-slate-700 pt-2">
                {formData.items.map((item, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold">{item.product_name}</span>
                      <span className="text-slate-400 ml-2">Qty: {item.quantity} × ₹{item.unit_price} (+18% Tax)</span>
                    </div>
                    <button type="button" onClick={() => removeItem(idx)} className="text-rose-600 hover:underline">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsCreateOpen(false);
                setIsEditOpen(false);
              }}
              className="px-4 py-2 text-xs font-medium text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm"
            >
              {submitting ? 'Saving...' : isEditOpen ? 'Save Changes' : 'Create Deal'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Deal"
        message={`Are you sure you want to delete deal "${selectedDeal?.deal_name}"?`}
        confirmText="Delete"
        loading={submitting}
      />
    </div>
  );
}
