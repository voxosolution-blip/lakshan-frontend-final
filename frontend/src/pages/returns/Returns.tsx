import { useState, useEffect } from 'react';
import { returnsAPI, type Return, type CreateReturnData } from '../../services/returnsAPI';
import { salesAPI, type Sale } from '../../services/salesAPI';
import { inventoryAPI, type InventoryItem } from '../../services/inventoryAPI';
import { Plus, Trash2, RotateCcw, Calendar, Package, Store, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatNumber } from '../../utils/numberFormat';

export const Returns = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [returns, setReturns] = useState<Return[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [formData, setFormData] = useState<CreateReturnData>({
    date: new Date().toISOString().split('T')[0],
    settlementStatus: 'pending',
    items: []
  });

  useEffect(() => {
    loadReturns();
    loadSales();
    loadInventoryItems();
  }, []);

  const loadReturns = async () => {
    try {
      setLoading(true);
      const data = await returnsAPI.getAll();
      setReturns(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load returns:', error);
      setReturns([]);
      alert('Failed to load returns');
    } finally {
      setLoading(false);
    }
  };

  const loadSales = async () => {
    try {
      const data = await salesAPI.getAll();
      setSales(data);
    } catch (error) {
      console.error('Failed to load sales:', error);
    }
  };

  const loadInventoryItems = async () => {
    try {
      const response = await inventoryAPI.getAll();
      setInventoryItems(response.data.data || []);
    } catch (error) {
      console.error('Failed to load inventory items:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    try {
      if (selectedReturn) {
        await returnsAPI.update(selectedReturn.id, formData);
      } else {
        await returnsAPI.create(formData);
      }
      setShowModal(false);
      setSelectedReturn(null);
      setFormData({ date: new Date().toISOString().split('T')[0], settlementStatus: 'pending', items: [] });
      loadReturns();
    } catch (error) {
      console.error('Failed to save return:', error);
      alert('Failed to save return');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this return?')) return;
    try {
      await returnsAPI.delete(id);
      loadReturns();
    } catch (error: any) {
      console.error('Failed to delete return:', error);
      alert(error.response?.data?.message || 'Failed to delete return');
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { inventoryItemId: '', quantity: 0 }]
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading returns...</div>
      </div>
    );
  }

  // Calculate statistics
  const totalReturns = returns.length;
  const totalQuantity = returns.reduce((sum, r) => sum + (r.quantity || 0), 0);
  const pendingReturns = returns.filter(r => r.settlementStatus === 'pending').length;
  const settledReturns = returns.filter(r => r.settlementStatus === 'settled').length;

  // Group returns by status
  const returnsByStatus = {
    pending: returns.filter(r => r.settlementStatus === 'pending'),
    partial: returns.filter(r => r.settlementStatus === 'partial'),
    settled: returns.filter(r => r.settlementStatus === 'settled')
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pending' },
      partial: { icon: AlertCircle, color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Partial' },
      settled: { icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-200', label: 'Settled' }
    };
    const badge = badges[status as keyof typeof badges] || badges.pending;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Returns Management</h1>
          <p className="text-sm text-gray-600 mt-1">Track and manage product returns</p>
        </div>
        <button
          onClick={() => {
            setSelectedReturn(null);
            setFormData({ date: new Date().toISOString().split('T')[0], settlementStatus: 'pending', items: [] });
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2 px-6 py-3 shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="w-5 h-5" />
          New Return
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 mb-1">Total Returns</p>
              <p className="text-3xl font-bold text-blue-900">{totalReturns}</p>
            </div>
            <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
              <RotateCcw className="w-6 h-6 text-blue-700" />
            </div>
          </div>
        </div>
        <div className="card p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700 mb-1">Total Quantity</p>
              <p className="text-3xl font-bold text-purple-900">{formatNumber(totalQuantity)}</p>
            </div>
            <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-700" />
            </div>
          </div>
        </div>
        <div className="card p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-700 mb-1">Pending</p>
              <p className="text-3xl font-bold text-yellow-900">{pendingReturns}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-200 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-700" />
            </div>
          </div>
        </div>
        <div className="card p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 mb-1">Settled</p>
              <p className="text-3xl font-bold text-green-900">{settledReturns}</p>
            </div>
            <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Returns List - Modern Card Design */}
      <div className="space-y-4">
        {returns.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <RotateCcw className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Returns Found</h3>
            <p className="text-gray-500 mb-6">Start processing returns to track them here</p>
            <button
              onClick={() => {
                setSelectedReturn(null);
                setFormData({ date: new Date().toISOString().split('T')[0], settlementStatus: 'pending', items: [] });
                setShowModal(true);
              }}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create First Return
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.isArray(returns) && returns.map((returnItem) => (
              <div
                key={returnItem.id}
                className="card p-6 hover:shadow-lg transition-all border-l-4 border-l-primary-500"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-5 h-5 text-primary-600" />
                      <h3 className="text-lg font-semibold text-gray-900">{returnItem.productName || 'Unknown Item'}</h3>
                    </div>
                    {returnItem.shopName && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <Store className="w-4 h-4" />
                        <span>{returnItem.shopName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(returnItem.date).toLocaleDateString('en-GB', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}</span>
                    </div>
                  </div>
                  {getStatusBadge(returnItem.settlementStatus || 'pending')}
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Quantity</p>
                    <p className="text-xl font-bold text-gray-900">{formatNumber(returnItem.quantity || 0)}</p>
                  </div>
                  {returnItem.reason && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Reason</p>
                      <p className="text-sm text-gray-700">{returnItem.reason}</p>
                    </div>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(returnItem.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <ReturnModal
          formData={formData}
          setFormData={setFormData}
          sales={sales}
          inventoryItems={inventoryItems}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowModal(false);
            setSelectedReturn(null);
            setFormData({ date: new Date().toISOString().split('T')[0], settlementStatus: 'pending', items: [] });
          }}
          addItem={addItem}
          updateItem={updateItem}
          removeItem={removeItem}
          editing={!!selectedReturn}
        />
      )}
    </div>
  );
};

// Return Modal Component
const ReturnModal = ({
  formData,
  setFormData,
  sales,
  inventoryItems,
  onSubmit,
  onClose,
  addItem,
  updateItem,
  removeItem,
  editing
}: {
  formData: CreateReturnData;
  setFormData: (data: CreateReturnData) => void;
  sales: Sale[];
  inventoryItems: InventoryItem[];
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  addItem: () => void;
  updateItem: (index: number, field: string, value: any) => void;
  removeItem: (index: number) => void;
  editing: boolean;
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{editing ? 'Edit' : 'New'} Return</h2>
            <p className="text-sm text-gray-600 mt-1">Record product returns and manage settlements</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full input border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2">
                <Store className="w-4 h-4" />
                Original Sale
              </label>
              <select
                value={formData.originalSaleId || ''}
                onChange={(e) => setFormData({ ...formData, originalSaleId: e.target.value })}
                className="w-full input border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select Sale (Optional)</option>
                {sales.map((sale) => (
                  <option key={sale.id} value={sale.id}>
                    {sale.id} - {sale.customerName || 'N/A'} - Rs. {sale.totalAmount.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">Return Reason</label>
            <input
              type="text"
              value={formData.reason || ''}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full input border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., Damaged goods, Expired product, Customer request"
            />
          </div>

          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Returned Items *
              </label>
              <button
                type="button"
                onClick={addItem}
                className="btn-secondary text-sm flex items-center gap-2 px-4 py-2 hover:shadow-md transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>
            <div className="space-y-3">
              {formData.items.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                  <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No items added. Click "Add Item" to start.</p>
                </div>
              ) : (
                formData.items.map((item, index) => (
                  <div key={index} className="flex gap-3 items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex-1">
                      <select
                        required
                        value={item.inventoryItemId}
                        onChange={(e) => updateItem(index, 'inventoryItemId', e.target.value)}
                        className="w-full input border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select Item</option>
                        {inventoryItems.map((invItem) => (
                          <option key={invItem.id} value={invItem.id}>
                            {invItem.name} ({invItem.unit})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        step="0.01"
                        required
                        min="0.01"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full input border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-center"
                        placeholder="Qty"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 hover:border-red-300"
                      title="Remove item"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Settlement Status</label>
              <select
                value={formData.settlementStatus}
                onChange={(e) => setFormData({ ...formData, settlementStatus: e.target.value })}
                className="w-full input border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="settled">Settled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Notes</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full input border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={3}
                placeholder="Additional notes (optional)"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button 
              type="button" 
              onClick={onClose} 
              className="btn-secondary px-6 py-2.5 font-semibold"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary px-6 py-2.5 font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              {editing ? 'Update Return' : 'Create Return'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
