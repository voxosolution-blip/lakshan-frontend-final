import { useState, useEffect } from 'react';
import { farmerAPI, type Farmer, type CreateFarmerData } from '../../services/farmerAPI';
import { Plus, Edit, Trash2, Milk, History, DollarSign, Phone, MapPin } from 'lucide-react';

export const Farmers = () => {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showMilkModal, setShowMilkModal] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [editingFarmer, setEditingFarmer] = useState<Farmer | null>(null);
  const [formData, setFormData] = useState<CreateFarmerData>({
    name: '',
    phone: '',
    address: '',
    allowance: 0
  });

  useEffect(() => {
    loadFarmers();
  }, []);

  const loadFarmers = async () => {
    try {
      setLoading(true);
      const data = await farmerAPI.getAll();
      setFarmers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load farmers:', error);
      setFarmers([]);
      alert('Failed to load farmers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFarmer) {
        await farmerAPI.update(editingFarmer.id, formData);
      } else {
        await farmerAPI.create(formData);
      }
      setShowModal(false);
      setEditingFarmer(null);
      setFormData({ name: '', phone: '', address: '', allowance: 0 });
      loadFarmers();
    } catch (error) {
      console.error('Failed to save farmer:', error);
      alert('Failed to save farmer');
    }
  };

  const handleEdit = (farmer: Farmer) => {
    setEditingFarmer(farmer);
    setFormData({
      name: farmer.name,
      phone: farmer.phone || '',
      address: farmer.address || '',
      allowance: farmer.allowance || 0
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this farmer?')) return;
    try {
      await farmerAPI.delete(id);
      loadFarmers();
    } catch (error: any) {
      console.error('Failed to delete farmer:', error);
      alert(error.response?.data?.message || 'Failed to delete farmer');
    }
  };

  const handleAddMilk = (farmer: Farmer) => {
    setSelectedFarmer(farmer);
    setShowMilkModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading farmers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button
          onClick={() => {
            setEditingFarmer(null);
            setFormData({ name: '', phone: '', address: '', allowance: 0 });
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Farmer
        </button>
      </div>

      {/* Farmers List - Improved Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.isArray(farmers) && farmers.map((farmer) => (
          <div key={farmer.id} className="card p-5 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="font-bold text-xl text-gray-900 mb-2">{farmer.name}</h3>
                
                {/* Display Format: Name, Address, Telephone */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-gray-600 font-medium">Home Address:</span>
                      <p className="text-gray-800 mt-0.5">{farmer.address || 'No address provided'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <div>
                      <span className="text-gray-600 font-medium">Telephone:</span>
                      <span className="text-gray-800 ml-2">{farmer.phone || 'No phone'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-1 ml-2">
                <button
                  onClick={() => handleEdit(farmer)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(farmer.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Collection Count */}
            <div className="mb-4 pt-3 border-t">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Collections:</span>{' '}
                <span className="text-gray-900">{farmer._count?.milkCollections || 0}</span>
              </p>
            </div>

            {/* Add Milk Button */}
            <button
              onClick={() => handleAddMilk(farmer)}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <Milk className="w-4 h-4" />
              Add Milk Collection
            </button>
          </div>
        ))}
      </div>

      {farmers.length === 0 && (
        <div className="card text-center py-12">
          <Milk className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No farmers found</p>
          <p className="text-gray-400 text-sm mt-2">Add your first farmer to get started</p>
        </div>
      )}

      {/* Add/Edit Farmer Modal */}
      {showModal && (
        <FarmerModal
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowModal(false);
            setEditingFarmer(null);
            setFormData({ name: '', phone: '', address: '', allowance: 0 });
          }}
          editing={!!editingFarmer}
        />
      )}

      {/* Milk Collection Modal */}
      {showMilkModal && selectedFarmer && (
        <MilkCollectionModal
          farmer={selectedFarmer}
          onClose={() => {
            setShowMilkModal(false);
            setSelectedFarmer(null);
          }}
          onSuccess={() => {
            setShowMilkModal(false);
            setSelectedFarmer(null);
            loadFarmers();
          }}
        />
      )}
    </div>
  );
};

// Farmer Modal Component
const FarmerModal = ({
  formData,
  setFormData,
  onSubmit,
  onClose,
  editing
}: {
  formData: CreateFarmerData;
  setFormData: (data: CreateFarmerData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  editing: boolean;
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <h2 className="text-2xl font-bold mb-6">{editing ? 'Edit' : 'Add'} Farmer</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full input"
              placeholder="Enter farmer name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Telephone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full input"
              placeholder="Enter telephone number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Home Address</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full input"
              rows={3}
              placeholder="Enter home address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Monthly Allowance (Rs.)</label>
            <input
              type="number"
              step="0.01"
              value={formData.allowance || 0}
              onChange={(e) => setFormData({ ...formData, allowance: parseFloat(e.target.value) || 0 })}
              className="w-full input"
              placeholder="0.00"
            />
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editing ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Milk Collection Modal Component - Enhanced
const MilkCollectionModal = ({
  farmer,
  onClose,
  onSuccess
}: {
  farmer: Farmer;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [ratePerLiter, setRatePerLiter] = useState('');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    loadCurrentMonth();
  }, []);

  const loadCurrentMonth = async () => {
    try {
      const data = await farmerAPI.getCurrentMonthTotal(farmer.id);
      setCurrentMonth(data.currentMonth);
    } catch (error) {
      console.error('Failed to load current month:', error);
    }
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await farmerAPI.getMilkHistory(farmer.id, 100);
      setHistory(data);
      setShowHistory(true);
    } catch (error) {
      console.error('Failed to load history:', error);
      alert('Failed to load history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const calculatePayment = async () => {
    if (!ratePerLiter || parseFloat(ratePerLiter) <= 0) {
      alert('Please enter a valid rate per liter');
      return;
    }
    try {
      setCalculating(true);
      const data = await farmerAPI.calculatePayment(farmer.id, parseFloat(ratePerLiter));
      setPaymentData(data);
      setShowPayment(true);
    } catch (error) {
      console.error('Failed to calculate payment:', error);
      alert('Failed to calculate payment');
    } finally {
      setCalculating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || parseFloat(quantity) <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    try {
      setLoading(true);
      // Combine date and time
      const dateTime = date && time 
        ? new Date(`${date}T${time}`).toISOString()
        : new Date().toISOString();
      
      await farmerAPI.addMilkCollection({
        farmerId: farmer.id,
        quantity: parseFloat(quantity),
        date: dateTime,
        notes: notes || undefined
      });
      setQuantity('');
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
      setTime(new Date().toTimeString().slice(0, 5));
      loadCurrentMonth();
      onSuccess();
      alert('Milk collection saved successfully!');
    } catch (error) {
      console.error('Failed to add milk collection:', error);
      alert('Failed to add milk collection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Milk Collection</h2>
            <p className="text-gray-600 mt-1">Farmer: <span className="font-semibold">{farmer.name}</span></p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Current Month Summary */}
        {currentMonth && (
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-5 rounded-lg mb-6 border border-blue-200">
            <h3 className="font-bold text-lg mb-3 text-blue-900">Current Month Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded">
                <p className="text-sm text-gray-600 mb-1">Total Quantity</p>
                <p className="text-2xl font-bold text-blue-600">{currentMonth.totalQuantity.toFixed(2)} L</p>
              </div>
              <div className="bg-white p-3 rounded">
                <p className="text-sm text-gray-600 mb-1">Collections</p>
                <p className="text-2xl font-bold text-blue-600">{currentMonth.collectionCount}</p>
              </div>
            </div>
          </div>
        )}

        {/* Milk Collection Form */}
        <form onSubmit={handleSubmit} className="space-y-5 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Quantity (Liters) *
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                required
                min="0.01"
                value={quantity || ''}
                onChange={(e) => setQuantity(e.target.value)}
                className="flex-1 input"
                placeholder="Enter quantity in liters"
              />
              <button
                type="button"
                onClick={loadHistory}
                className="btn-secondary flex items-center gap-2 px-4"
                title="View Collection History"
                disabled={loadingHistory}
              >
                <History className="w-5 h-5" />
                {loadingHistory ? 'Loading...' : 'History'}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Time *</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full input"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full input"
              rows={2}
              placeholder="Additional notes (optional)"
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <button 
              type="submit" 
              className="btn-primary flex-1 flex items-center justify-center gap-2" 
              disabled={loading}
            >
              <Milk className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Collection'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPayment(!showPayment);
                if (!showPayment && !paymentData) {
                  calculatePayment();
                }
              }}
              className="btn-secondary flex items-center gap-2"
            >
              <DollarSign className="w-4 h-4" />
              Payment
            </button>
          </div>
        </form>

        {/* Payment Calculation Section */}
        {showPayment && (
          <div className="border-t pt-6 mt-6">
            <h3 className="font-bold text-lg mb-4 text-gray-900">Payment Calculation</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Rate Per Liter (Rs.) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={ratePerLiter}
                    onChange={(e) => setRatePerLiter(e.target.value)}
                    className="flex-1 input"
                    placeholder="Enter rate per liter"
                  />
                  <button
                    type="button"
                    onClick={calculatePayment}
                    className="btn-primary px-6"
                    disabled={calculating || !ratePerLiter}
                  >
                    {calculating ? 'Calculating...' : 'Calculate'}
                  </button>
                </div>
              </div>
              
              {paymentData && (
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-5 rounded-lg border border-green-200">
                  <h4 className="font-semibold mb-3 text-green-900">Payment Breakdown</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between bg-white p-2 rounded">
                      <span className="text-gray-700">Total Milk (This Month):</span>
                      <span className="font-semibold">{paymentData.milk.totalQuantity.toFixed(2)} L</span>
                    </div>
                    <div className="flex justify-between bg-white p-2 rounded">
                      <span className="text-gray-700">Rate Per Liter:</span>
                      <span className="font-semibold">Rs. {paymentData.payment.ratePerLiter.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between bg-white p-2 rounded">
                      <span className="text-gray-700">Milk Payment:</span>
                      <span className="font-semibold">Rs. {paymentData.payment.milkPayment.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between bg-white p-2 rounded">
                      <span className="text-gray-700">Monthly Allowance:</span>
                      <span className="font-semibold">Rs. {(parseFloat(paymentData.payment.allowance) || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between bg-white p-3 rounded mt-3 border-2 border-green-300">
                      <span className="text-lg font-bold text-gray-900">Total Payment:</span>
                      <span className="text-lg font-bold text-green-700">
                        Rs. {paymentData.payment.totalPayment.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* History Section */}
        {showHistory && (
          <div className="border-t pt-6 mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-gray-900">Collection History</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
              >
                Close History
              </button>
            </div>
            {loadingHistory ? (
              <div className="text-center py-8 text-gray-500">Loading history...</div>
            ) : (
              <div className="max-h-96 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-semibold text-gray-700">Date & Time</th>
                      <th className="text-right p-3 font-semibold text-gray-700">Quantity (L)</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center py-8 text-gray-500">
                          No collection history found
                        </td>
                      </tr>
                    ) : (
                      history.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            {new Date(item.date).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="text-right p-3 font-semibold">
                            {parseFloat(item.quantity).toFixed(2)} L
                          </td>
                          <td className="p-3 text-gray-600">
                            {item.notes || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
