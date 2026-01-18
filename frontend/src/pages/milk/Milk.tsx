import { useState, useEffect } from 'react';
import { farmerAPI } from '../../services/farmerAPI';
import { settingsAPI } from '../../services/settingsAPI';
import { Plus, Eye, Phone, MapPin, Milk as MilkIcon, Settings, FileText } from 'lucide-react';
import { setupHourlyRefresh } from '../../utils/hourlyRefresh';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface CollectorWithTodayMilk {
  id: string;
  name: string;
  phone: string;
  address: string;
  today_milk: number;
}

export const Milk = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';
  const [collectors, setCollectors] = useState<CollectorWithTodayMilk[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCollectorModal, setShowAddCollectorModal] = useState(false);
  const [showAddMilkModal, setShowAddMilkModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCollector, setSelectedCollector] = useState<CollectorWithTodayMilk | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<any>(null);
  
  // Add Collector Form
  const [collectorForm, setCollectorForm] = useState({
    name: '',
    phone: '',
    address: ''
  });
  
  // Add Milk Form
  const [milkForm, setMilkForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    quantity_liters: ''
  });

  useEffect(() => {
    loadCollectors();
    // Refresh once per hour at the top of the hour
    const cleanup = setupHourlyRefresh(loadCollectors);
    return cleanup;
  }, []);

  const loadCollectors = async () => {
    try {
      setLoading(true);
      const response = await farmerAPI.getFarmersWithTodayMilk();
      setCollectors(response.data || []);
    } catch (error) {
      console.error('Failed to load dairy collectors:', error);
      setCollectors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCollector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectorForm.name.trim()) {
      alert('Please enter collector name');
      return;
    }

    try {
      await farmerAPI.create({
        name: collectorForm.name,
        phone: collectorForm.phone || undefined,
        address: collectorForm.address || undefined
      });
      setShowAddCollectorModal(false);
      setCollectorForm({ name: '', phone: '', address: '' });
      loadCollectors();
    } catch (error: any) {
      console.error('Failed to add collector:', error);
      alert(error.response?.data?.message || 'Failed to add dairy collector');
    }
  };

  const handleAddMilk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollector || !milkForm.quantity_liters) {
      alert('Please enter milk quantity');
      return;
    }

    try {
      const response = await farmerAPI.addMilkCollection({
        farmerId: selectedCollector.id,
        date: milkForm.date,
        time: milkForm.time,
        quantity_liters: parseFloat(milkForm.quantity_liters)
      });
      
      setShowAddMilkModal(false);
      setMilkForm({
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        quantity_liters: ''
      });
      setSelectedCollector(null);
      loadCollectors();
      
      // Show success message with inventory update info
      const message = response?.message || `Milk collection saved! ${milkForm.quantity_liters}L added to inventory.`;
      alert(message);
      
      // Refresh inventory page if it's open (trigger a custom event)
      console.log('📢 Dispatching milkInventoryUpdated event');
      window.dispatchEvent(new CustomEvent('milkInventoryUpdated'));
    } catch (error: any) {
      console.error('Failed to add milk:', error);
      const errorMessage = error.response?.data?.message || 'Failed to add milk collection';
      alert(`Error: ${errorMessage}\n\nPlease check:\n1. Backend server is running\n2. Database connection is working\n3. Milk inventory item exists in Raw Materials category`);
    }
  };

  const handleViewDetails = async (collector: CollectorWithTodayMilk) => {
    setSelectedCollector(collector);
    try {
      const report = await farmerAPI.getMonthlyReport(collector.id);
      setMonthlyReport(report);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Failed to load monthly report:', error);
      alert('Failed to load collector details');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dairy collectors...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Collector Button and Settings */}
      <div className="flex justify-between items-center gap-2">
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/milk/settings')}
              className="btn-secondary flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Milk Price Settings
            </button>
            <button
              onClick={() => navigate('/milk/free-products-settings')}
              className="btn-secondary flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Free Products Settings
            </button>
          </div>
        )}
        {isAdmin && (
          <button
            onClick={() => {
              setCollectorForm({ name: '', phone: '', address: '' });
              setShowAddCollectorModal(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Dairy Collector
          </button>
        )}
      </div>

      {/* Collectors Grid */}
      {collectors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collectors.map((collector) => (
            <div key={collector.id} className="card p-6 hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                {/* Collector Info */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{collector.name}</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    {collector.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{collector.phone}</span>
                      </div>
                    )}
                    {collector.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5" />
                        <span>{collector.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-600">Today's Milk:</span>
                    <span className="text-2xl font-bold text-primary-600">
                      {parseFloat(collector.today_milk?.toString() || '0').toFixed(2)} L
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedCollector(collector);
                        setMilkForm({
                          date: new Date().toISOString().split('T')[0],
                          time: new Date().toTimeString().slice(0, 5),
                          quantity_liters: ''
                        });
                        setShowAddMilkModal(true);
                      }}
                      className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Milk
                    </button>
                    <button
                      onClick={() => navigate(`/milk/paysheet/${collector.id}`)}
                      className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm"
                    >
                      <FileText className="w-4 h-4" />
                      View Paysheet
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <MilkIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">No dairy collectors found</p>
          <p className="text-gray-400 text-sm">Click "Add Dairy Collector" to get started</p>
        </div>
      )}

      {/* Daily Summary Table */}
      {collectors.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Today's Milk Summary</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-semibold text-gray-700">Collector Name</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-700">Phone</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-700">Address</th>
                  <th className="text-right p-3 text-sm font-semibold text-gray-700">Today Milk</th>
                  <th className="text-center p-3 text-sm font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {collectors.map((collector) => (
                  <tr key={collector.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{collector.name}</td>
                    <td className="p-3 text-gray-600">{collector.phone || '-'}</td>
                    <td className="p-3 text-gray-600">{collector.address || '-'}</td>
                    <td className="p-3 text-right font-semibold text-primary-600">
                      {parseFloat(collector.today_milk?.toString() || '0').toFixed(2)} L
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => navigate(`/milk/paysheet/${collector.id}`)}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        View Paysheet
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Collector Modal */}
      {showAddCollectorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Add Dairy Collector</h2>
            <form onSubmit={handleAddCollector}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Collector Name *
                  </label>
                  <input
                    type="text"
                    value={collectorForm.name}
                    onChange={(e) => setCollectorForm({ ...collectorForm, name: e.target.value })}
                    className="w-full input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telephone
                  </label>
                  <input
                    type="text"
                    value={collectorForm.phone}
                    onChange={(e) => setCollectorForm({ ...collectorForm, phone: e.target.value })}
                    className="w-full input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    value={collectorForm.address}
                    onChange={(e) => setCollectorForm({ ...collectorForm, address: e.target.value })}
                    className="w-full input"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddCollectorModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Milk Modal */}
      {showAddMilkModal && selectedCollector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Milk Collection</h2>
            <p className="text-sm text-gray-600 mb-4">Collector: {selectedCollector.name}</p>
            <form onSubmit={handleAddMilk}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={milkForm.date}
                    onChange={(e) => setMilkForm({ ...milkForm, date: e.target.value })}
                    className="w-full input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time *
                  </label>
                  <input
                    type="time"
                    value={milkForm.time}
                    onChange={(e) => setMilkForm({ ...milkForm, time: e.target.value })}
                    className="w-full input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Milk Amount (Liters) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={milkForm.quantity_liters || ''}
                    onChange={(e) => setMilkForm({ ...milkForm, quantity_liters: e.target.value })}
                    className="w-full input"
                    placeholder="Enter amount"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMilkModal(false);
                    setSelectedCollector(null);
                  }}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal - Monthly Report */}
      {showDetailsModal && selectedCollector && monthlyReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl my-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{monthlyReport.farmer.name}</h2>
                <p className="text-gray-600 mt-1">{monthlyReport.farmer.phone}</p>
                <p className="text-gray-600">{monthlyReport.farmer.address}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Milk Rate: Rs. {monthlyReport.summary.milkPrice.toFixed(2)} / Liter
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedCollector(null);
                  setMonthlyReport(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="card p-4">
                <p className="text-sm text-gray-600 mb-1">Total Liters (Month)</p>
                <p className="text-2xl font-bold text-primary-600">
                  {monthlyReport.summary.totalLiters.toFixed(2)} L
                </p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-gray-600 mb-1">Rate per Liter</p>
                <p className="text-2xl font-bold text-gray-900">
                  Rs. {monthlyReport.summary.milkPrice.toFixed(2)}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-gray-600 mb-1">Total Payment</p>
                <p className="text-2xl font-bold text-green-600">
                  Rs. {monthlyReport.summary.totalPayment.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Milk Collection Table */}
            <div className="card">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Milk Collection - {new Date(monthlyReport.period.year, monthlyReport.period.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Date</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Time</th>
                      <th className="text-right p-3 text-sm font-semibold text-gray-700">Liters</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyReport.collections.length > 0 ? (
                      monthlyReport.collections.map((collection: any) => (
                        <tr key={collection.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            {new Date(collection.date).toLocaleDateString()}
                          </td>
                          <td className="p-3">{collection.time || '-'}</td>
                          <td className="p-3 text-right font-semibold">
                            {parseFloat(collection.quantity_liters).toFixed(2)} L
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="p-6 text-center text-gray-500">
                          No milk collections for this month
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
