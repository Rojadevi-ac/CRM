import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Edit2, Trash2 } from 'lucide-react';
import { productApi } from '../api/crmApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Software License',
    description: '',
    price: '',
    tax_rate: '18.0',
    status: 'Active',
  });
  const [submitting, setSubmitting] = useState(false);

  const { canWrite, isAdmin } = useAuth();
  const { toast } = useToast();
  const { subscribeToEvent, unsubscribeFromEvent } = useSocket();

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await productApi.getProducts({ search });
      if (res.data.success) {
        setProducts(res.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load product catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search]);

  // Real-time socket sync
  useEffect(() => {
    const handleUpdate = () => fetchProducts();
    const events = ['product_created', 'product_updated', 'product_deleted'];
    events.forEach((ev) => subscribeToEvent(ev, handleUpdate));
    return () => {
      events.forEach((ev) => unsubscribeFromEvent(ev, handleUpdate));
    };
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditOpen && selectedProduct) {
        await productApi.updateProduct(selectedProduct.id, formData);
        toast.success('Product updated');
        setIsEditOpen(false);
      } else {
        await productApi.createProduct(formData);
        toast.success('Product added');
        setIsCreateOpen(false);
      }
      fetchProducts();
    } catch (err) {
      toast.error('Error saving product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    setSubmitting(true);
    try {
      await productApi.deleteProduct(selectedProduct.id);
      toast.success('Product deleted');
      setIsDeleteOpen(false);
      fetchProducts();
    } catch (err) {
      toast.error('Failed to delete product');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setSelectedProduct(null);
    setFormData({
      name: '',
      category: 'Software License',
      description: '',
      price: '',
      tax_rate: '18.0',
      status: 'Active',
    });
    setIsCreateOpen(true);
  };

  const openEditModal = (prod) => {
    setSelectedProduct(prod);
    setFormData({
      name: prod.name,
      category: prod.category,
      description: prod.description || '',
      price: prod.price,
      tax_rate: prod.tax_rate,
      status: prod.status,
    });
    setIsEditOpen(true);
  };

  const columns = [
    {
      header: 'Product / Service Name',
      key: 'name',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800 dark:text-slate-200">{row.name}</span>
          <span className="text-xs text-slate-400">{row.description}</span>
        </div>
      ),
    },
    {
      header: 'Category',
      key: 'category',
      render: (row) => <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{row.category}</span>,
    },
    {
      header: 'Base Price (INR)',
      key: 'price',
      render: (row) => (
        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
          ₹{Number(row.price).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Tax Rate',
      key: 'tax_rate',
      render: (row) => <span className="text-xs text-slate-600 dark:text-slate-400">{row.tax_rate}% GST</span>,
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Actions',
      key: 'actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {isAdmin && (
            <>
              <button onClick={() => openEditModal(row)} className="p-1 text-slate-400 hover:text-brand-600">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => { setSelectedProduct(row); setIsDeleteOpen(true); }} className="p-1 text-slate-400 hover:text-rose-600">
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
            <Package className="w-6 h-6 text-brand-500" /> Products & Services Catalog
          </h1>
          <p className="text-xs text-slate-500">Software subscriptions, consulting services, and pricing tiers.</p>
        </div>
        {isAdmin && (
          <button onClick={openCreateModal} className="clay-btn-primary px-4 py-2 text-xs flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Product
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
            placeholder="Search products by name or description..."
            className="w-full pl-10 pr-3 py-2 clay-inset text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={products}
        loading={loading}
        emptyTitle="No products found"
        actionText="Add Product"
        onEmptyAction={isAdmin ? openCreateModal : null}
      />

      <Modal isOpen={isCreateOpen || isEditOpen} onClose={() => { setIsCreateOpen(false); setIsEditOpen(false); }} title={isEditOpen ? 'Edit Product' : 'Add Product'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Product Name *</label>
              <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3.5 py-2 clay-inset text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Category</label>
              <input type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-3.5 py-2 clay-inset text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Price (INR) *</label>
              <input type="number" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full px-3.5 py-2 clay-inset text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Tax Rate (%)</label>
              <input type="number" value={formData.tax_rate} onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })} className="w-full px-3.5 py-2 clay-inset text-xs" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Description</label>
            <textarea rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3.5 py-2 clay-inset text-xs" />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }} className="clay-btn-secondary px-4 py-2 text-xs">Cancel</button>
            <button type="submit" disabled={submitting} className="clay-btn-primary px-5 py-2 text-xs">Save Product</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Product"
        message={`Delete "${selectedProduct?.name}" from catalog?`}
        confirmText="Delete"
        loading={submitting}
      />
    </div>
  );
}
