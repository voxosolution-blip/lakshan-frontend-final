import { useState, useEffect } from 'react';
import { returnsAPI, type Return, type CreateReturnData } from '../../services/returnsAPI';
import { salesAPI, type Sale } from '../../services/salesAPI';
import { inventoryAPI, type InventoryItem } from '../../services/inventoryAPI';
import { Plus, Trash2, RotateCcw, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center">
        <button
          onClick={() => {
            setSelectedReturn(null);
            setFormData({ date: new Date().toISOString().split('T')[0], settlementStatus: 'pending', items: [] });
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Return
        </button>
      </div>

      {/* Returns List */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200 bg-gray-50">
                <th className="text-left p-4 font-semibold text-gray-700">Date</th>
                <th className="text-left p-4 font-semibold text-gray-700">Shop Name</th>
                <th className="text-left p-4 font-semibold text-gray-700">Return Item</th>
                <th className="text-right p-4 font-semibold text-gray-700">Quantity</th>
                {isAdmin && <th className="text-center p-4 font-semibold text-gray-700">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {Array.isArray(returns) && returns.map((returnItem) => (
                <tr key={returnItem.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      {new Date(returnItem.date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="font-medium text-gray-900">{returnItem.shopName || '-'}</span>
                  </td>
                  <td className="p-4">{returnItem.productName || 'Unknown Item'}</td>
                  <td className="p-4 text-right">{returnItem.quantity || 0}</td>
                  {isAdmin && (
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleDelete(returnItem.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {returns.length === 0 && (
            <div className="text-center py-12">
              <RotateCcw className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No returns found</p>
              <p className="text-gray-400 text-sm mt-2">Process your first return</p>
            </div>
          )}
        </div>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        <h2 className="text-2xl font-bold mb-6">{editing ? 'Edit' : 'New'} Return</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Date *</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Original Sale</label>
              <select
                value={formData.originalSaleId || ''}
                onChange={(e) => setFormData({ ...formData, originalSaleId: e.target.value })}
                className="w-full input"
              >
                <option value="">Select Sale</option>
                {sales.map((sale) => (
                  <option key={sale.id} value={sale.id}>
                    {sale.id} - {sale.customerName || 'N/A'} - Rs. {sale.totalAmount.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Reason</label>
            <input
              type="text"
              value={formData.reason || ''}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full input"
              placeholder="Return reason"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Returned Items *</label>
              <button
                type="button"
                onClick={addItem}
                className="btn-secondary text-sm flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>
            <div className="space-y-2">
              {formData.items.map((item, index) => (
                <div key={index} className="flex gap-2 items-center p-3 bg-gray-50 rounded">
                  <select
                    required
                    value={item.inventoryItemId}
                    onChange={(e) => updateItem(index, 'inventoryItemId', e.target.value)}
                    className="flex-1 input"
                  >
                    <option value="">Select Item</option>
                    {inventoryItems.map((invItem) => (
                      <option key={invItem.id} value={invItem.id}>
                        {invItem.name} ({invItem.unit})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="1"
                    value={item.quantity || ''}
                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-32 input"
                    placeholder="Qty"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Settlement Status</label>
            <select
              value={formData.settlementStatus}
              onChange={(e) => setFormData({ ...formData, settlementStatus: e.target.value })}
              className="w-full input"
            >
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="settled">Settled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full input"
              rows={2}
              placeholder="Additional notes (optional)"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
