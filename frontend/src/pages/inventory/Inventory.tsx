import { useState, useEffect } from 'react';
import { inventoryAPI } from '../../services/inventoryAPI';
import { farmerAPI } from '../../services/farmerAPI';
import type { InventoryItem, CreateInventoryItemData } from '../../services/inventoryAPI';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Milk as MilkIcon, TrendingUp, Package, Box, FlaskConical, Zap, ShoppingCart, Search, Filter } from 'lucide-react';
import { setupHourlyRefresh } from '../../utils/hourlyRefresh';
import { formatNumber, formatNumberDecimals } from '../../utils/numberFormat';

export const Inventory = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [stockAction, setStockAction] = useState<'in' | 'out'>('in');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [milkInventory, setMilkInventory] = useState<any>(null);
  const [todayMilkUsage, setTodayMilkUsage] = useState<number>(0);

  useEffect(() => {
    loadInventory();
    loadLowStockAlerts();
    loadMilkInventory();
    loadTodayMilkUsage();
    // Refresh milk inventory once per hour at the top of the hour (12:00, 1:00 PM, etc.)
    const cleanup = setupHourlyRefresh(() => {
      loadMilkInventory();
      loadTodayMilkUsage();
    });
    
    // Listen for milk inventory updates from milk collection page
    const handleMilkInventoryUpdate = () => {
      console.log('🔄 Milk inventory update event received, refreshing...');
      loadInventory();
      loadMilkInventory();
      loadTodayMilkUsage();
    };
    
    // Listen for production updates (production uses milk)
    const handleProductionUpdate = () => {
      console.log('🔄 Production update event received, refreshing milk inventory...');
      loadInventory();
      loadMilkInventory();
      loadTodayMilkUsage();
    };
    
    // Listen for inventory updates from other sources
    const handleInventoryUpdate = () => {
      console.log('🔄 Inventory update event received, refreshing milk inventory...');
      loadInventory();
      loadMilkInventory();
      loadTodayMilkUsage();
    };
    
    window.addEventListener('milkInventoryUpdated', handleMilkInventoryUpdate);
    window.addEventListener('productionUpdated', handleProductionUpdate);
    window.addEventListener('inventoryUpdated', handleInventoryUpdate);
    
    // Also refresh when page becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Page became visible, refreshing milk inventory...');
        loadMilkInventory();
        loadTodayMilkUsage();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      cleanup();
      window.removeEventListener('milkInventoryUpdated', handleMilkInventoryUpdate);
      window.removeEventListener('productionUpdated', handleProductionUpdate);
      window.removeEventListener('inventoryUpdated', handleInventoryUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const response = await inventoryAPI.getAll({ category: filterCategory || undefined });
      const rawData = response.data.data || [];
      // Transform backend response to match frontend interface
      const transformedData = rawData.map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category || item.category_name || 'unknown',
        unit: item.unit,
        currentStock: parseFloat(item.current_stock || item.quantity || 0),
        totalUsage: parseFloat(item.total_usage || 0),
        minStockLevel: item.min_stock_level || item.min_quantity ? parseFloat(item.min_stock_level || item.min_quantity) : undefined,
        expiryDate: item.expiry_date || item.expiryDate,
        price: parseFloat(item.price || 0),
        createdAt: item.created_at || item.createdAt,
        updatedAt: item.updated_at || item.updatedAt,
      }));
      setItems(transformedData);
    } catch (error: any) {
      console.error('Failed to load inventory:', error);
      alert(error.response?.data?.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const loadLowStockAlerts = async () => {
    try {
      const response = await inventoryAPI.getLowStockAlerts();
      const rawData = response.data.data || [];
      // Transform backend response to match frontend interface
      const transformedData = rawData.map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category || item.category_name || 'unknown',
        unit: item.unit,
        currentStock: parseFloat(item.current_stock || item.quantity || 0),
        minStockLevel: item.min_stock_level || item.min_quantity ? parseFloat(item.min_stock_level || item.min_quantity) : undefined,
        expiryDate: item.expiry_date || item.expiryDate,
        price: parseFloat(item.price || 0),
        createdAt: item.created_at || item.createdAt,
        updatedAt: item.updated_at || item.updatedAt,
      }));
      setLowStockAlerts(transformedData);
    } catch (error: any) {
      console.error('Failed to load low stock alerts:', error);
    }
  };

  const loadMilkInventory = async () => {
    try {
      const data = await farmerAPI.getTotalMilkInventory();
      setMilkInventory(data);
    } catch (error) {
      console.error('Failed to load milk inventory:', error);
    }
  };

  const loadTodayMilkUsage = async () => {
    try {
      const response = await inventoryAPI.getTodayMilkUsage();
      setTodayMilkUsage(response.data.data?.todayUsage || 0);
    } catch (error) {
      console.error('Failed to load today milk usage:', error);
      setTodayMilkUsage(0);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await inventoryAPI.delete(id);
      loadInventory();
      loadLowStockAlerts();
      loadMilkInventory();
      loadTodayMilkUsage();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete item');
    }
  };

  const handleStockAdjust = async (quantity: number, notes?: string) => {
    if (!selectedItem) return;

    try {
      // Calculate adjustment based on action
      const adjustment = stockAction === 'in' ? quantity : -quantity;
      await inventoryAPI.adjustStock(selectedItem.id, {
        adjustment,
        reason: notes,
      });
      setShowStockModal(false);
      setSelectedItem(null);
      loadInventory();
      loadLowStockAlerts();
      loadMilkInventory();
      loadTodayMilkUsage();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to adjust stock');
    }
  };

  const isLowStock = (item: InventoryItem) => {
    return item.minStockLevel && item.currentStock < item.minStockLevel;
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(items.map((item) => item.category).filter((cat): cat is string => !!cat)));

  // Calculate category summaries
  const categorySummary = categories.reduce((acc, cat) => {
    const categoryItems = filteredItems.filter(item => item.category === cat);
    const totalStock = categoryItems.reduce((sum, item) => sum + item.currentStock, 0);
    const lowStockCount = categoryItems.filter(item => isLowStock(item)).length;
    acc[cat] = { totalItems: categoryItems.length, totalStock, lowStockCount };
    return acc;
  }, {} as Record<string, { totalItems: number; totalStock: number; lowStockCount: number }>);

  const getCategoryIcon = (category: string) => {
    const catLower = category.toLowerCase();
    if (catLower.includes('raw') || catLower.includes('material')) return FlaskConical;
    if (catLower.includes('packaging')) return Box;
    if (catLower.includes('finished')) return ShoppingCart;
    if (catLower.includes('utilities') || catLower.includes('energy')) return Zap;
    return Package;
  };

  const getCategoryColor = (category: string) => {
    const catLower = category.toLowerCase();
    if (catLower.includes('raw') || catLower.includes('material')) return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'text-green-600' };
    if (catLower.includes('packaging')) return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-600' };
    if (catLower.includes('finished')) return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: 'text-purple-600' };
    if (catLower.includes('utilities') || catLower.includes('energy')) return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: 'text-yellow-600' };
    return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', icon: 'text-gray-600' };
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-sm text-gray-600 mt-1">Track and manage all inventory items across categories</p>
        </div>
        <button
          onClick={() => {
            setSelectedItem(null);
            setShowAddModal(true);
          }}
          className="btn-primary flex items-center gap-2 px-4 py-2 shadow-lg hover:shadow-xl transition-shadow"
        >
          <PlusIcon className="w-5 h-5" />
          Add New Item
        </button>
      </div>

      {/* Real-time Milk Inventory - Raw Materials */}
      {milkInventory && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <MilkIcon className="w-8 h-8 text-blue-600" />
              <div>
                <h3 className="text-xl font-bold text-gray-900">Raw Materials - Milk Inventory</h3>
                <p className="text-sm text-gray-600">
                  Automatic cumulative inventory: Today's collection + Previous days' remaining milk
                </p>
                <p className="text-xs text-blue-600 mt-1 font-medium">
                  ✓ Auto-updated from milk collections • No manual entry needed
                </p>
              </div>
            </div>
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600 mb-1">Current Stock (Cumulative)</p>
              <p className="text-3xl font-bold text-blue-600">
                {formatNumberDecimals(milkInventory.currentStock, 2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Liters Available</p>
              <p className="text-xs text-blue-600 mt-1 font-medium">
                = Today + Previous Days
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-red-200">
              <p className="text-sm text-gray-600 mb-1">Today's Usage</p>
              <p className="text-3xl font-bold text-red-600">
                {formatNumberDecimals(todayMilkUsage, 2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Liters Used Today</p>
              <p className="text-xs text-red-600 mt-1 font-medium">
                From Production
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-green-200">
              <p className="text-sm text-gray-600 mb-1">Total Collected (All Time)</p>
              <p className="text-3xl font-bold text-green-600">
                {formatNumberDecimals(milkInventory.totalCollected, 2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Liters Collected</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-purple-200">
              <p className="text-sm text-gray-600 mb-1">This Month</p>
              <p className="text-3xl font-bold text-purple-600">
                {formatNumberDecimals(milkInventory.currentMonthTotal, 2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Liters This Month</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-orange-200">
              <p className="text-sm text-gray-600 mb-1">Active Dairy Collectors</p>
              <p className="text-3xl font-bold text-orange-600">
                {milkInventory.farmerCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">Collectors</p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-100 rounded-lg border border-blue-300">
            <p className="text-xs text-blue-800">
              <strong>How it works:</strong> When you collect milk from dairy collectors, it automatically adds to inventory. 
              The current stock shows all available milk (today's collection + previous days' remaining milk). 
              Milk is deducted automatically when used in production. No manual entry required!
            </p>
          </div>
          
          <p className="text-xs text-gray-500 mt-4 text-center">
            Auto-updates when milk is collected • Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
      )}

      {/* Low Stock Alerts */}
      {lowStockAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-5 rounded-lg shadow-md">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                <ExclamationTriangleIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-yellow-900 mb-1">
                Low Stock Alert: {lowStockAlerts.length} item(s) below minimum level
              </h3>
              <p className="text-sm text-yellow-700 mb-3">Please restock these items soon to avoid production delays</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                {lowStockAlerts.map((item) => (
                  <div key={item.id} className="bg-white p-3 rounded-lg border border-yellow-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900 text-sm">{item.name}</span>
                      <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-700 rounded-full">
                        Urgent
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-gray-600">Current:</span>
                      <span className="font-bold text-red-600">{formatNumber(item.currentStock)} {item.unit}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm">
                      <span className="text-gray-600">Minimum:</span>
                      <span className="font-semibold text-gray-700">{formatNumber(item.minStockLevel || 0)} {item.unit}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-yellow-100">
                      <span className="text-xs text-red-600 font-medium">
                        Shortfall: {formatNumber((item.minStockLevel || 0) - item.currentStock)} {item.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Summary Cards */}
      {categories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat);
            const colors = getCategoryColor(cat);
            const summary = categorySummary[cat] || { totalItems: 0, totalStock: 0, lowStockCount: 0 };
            const displayName = cat.replace('_', ' ').replace('raw material', 'Raw Materials').replace('packaging', 'Packaging').replace('finished product', 'Finished Goods').replace('utilities', 'Utilities');
            
            return (
              <div key={cat} className={`${colors.bg} ${colors.border} border-2 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow`}>
                <div className="flex items-center justify-between mb-3">
                  <Icon className={`w-6 h-6 ${colors.icon}`} />
                  {summary.lowStockCount > 0 && (
                    <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                      {summary.lowStockCount} Low
                    </span>
                  )}
                </div>
                <h3 className={`font-semibold ${colors.text} mb-1`}>{displayName}</h3>
                <p className="text-sm text-gray-600">
                  {summary.totalItems} items • {formatNumber(summary.totalStock)} total stock
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="card bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Items</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Category</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  loadInventory();
                }}
                className="input-field pl-10 appearance-none"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat ? cat.replace('_', ' ').replace('raw material', 'Raw Materials').replace('packaging', 'Packaging Materials').replace('finished product', 'Finished Goods').replace('utilities', 'Utilities & Energy') : 'Unknown'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-end">
            <div className="w-full bg-white p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{filteredItems.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="card shadow-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Inventory Items</h2>
          <p className="text-sm text-gray-600 mt-1">Manage all inventory items and stock levels</p>
        </div>
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading inventory...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Inventory Items Found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || filterCategory 
                ? 'Try adjusting your search or filter criteria' 
                : 'Get started by adding your first inventory item'}
            </p>
            {!searchTerm && !filterCategory && (
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setShowAddModal(true);
                }}
                className="btn-primary inline-flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Add First Item
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Item Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Unit</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Current Stock</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Usage</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Min Level</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => {
                  const isMilkItem = item.name.toLowerCase() === 'milk' && item.category === 'raw_material';
                  const CategoryIcon = getCategoryIcon(item.category || '');
                  const colors = getCategoryColor(item.category || '');
                  const lowStock = isLowStock(item);
                  
                  return (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-gray-50 transition-colors ${
                      lowStock && !isMilkItem ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`${colors.bg} p-2 rounded-lg`}>
                          <CategoryIcon className={`w-5 h-5 ${colors.icon}`} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{item.name}</div>
                          {isMilkItem && (
                            <div className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                              <MilkIcon className="w-3 h-3" />
                              Auto-managed from milk collections
                            </div>
                          )}
                          {lowStock && !isMilkItem && (
                            <div className="text-xs text-yellow-700 flex items-center gap-1 mt-1 font-medium">
                              <ExclamationTriangleIcon className="w-3 h-3" />
                              Low Stock Alert
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text} border ${colors.border}`}>
                        {item.category 
                          ? item.category.replace('_', ' ').replace('raw material', 'Raw Materials').replace('packaging', 'Packaging Materials').replace('finished product', 'Finished Goods').replace('utilities', 'Utilities & Energy')
                          : 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
                        {item.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {isMilkItem && milkInventory ? (
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900">
                            {formatNumberDecimals(milkInventory.currentStock, 2)} {item.unit}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Collected: {formatNumberDecimals(milkInventory.totalCollected, 2)}L
                          </div>
                          {milkInventory.totalUsed > 0 && (
                            <div className="text-xs text-red-500 mt-0.5">
                              Used: {formatNumberDecimals(milkInventory.totalUsed, 2)}L
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className={`text-sm font-bold ${lowStock && !isMilkItem ? 'text-yellow-700' : 'text-gray-900'}`}>
                          {formatNumber(item.currentStock)} {item.unit}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-semibold text-blue-600">
                        {formatNumber((item as any).totalUsage || 0)} {item.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm text-gray-600">
                        {item.minStockLevel ? `${formatNumber(item.minStockLevel)} ${item.unit}` : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        Rs. {item.price.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        {!isMilkItem && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedItem(item);
                                setStockAction('in');
                                setShowStockModal(true);
                              }}
                              className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                              title="Stock In"
                            >
                              <ArrowDownTrayIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedItem(item);
                                setStockAction('out');
                                setShowStockModal(true);
                              }}
                              className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                              title="Stock Out"
                            >
                              <ArrowUpTrayIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedItem(item);
                                setShowAddModal(true);
                              }}
                              className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        {isMilkItem && (
                          <span className="text-xs text-gray-500 italic px-3 py-1 bg-gray-100 rounded-full">
                            Auto-managed
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Item Modal */}
      {showAddModal && (
        <InventoryItemModal
          item={selectedItem}
          onClose={() => {
            setShowAddModal(false);
            setSelectedItem(null);
          }}
          onSave={() => {
            loadInventory();
            loadLowStockAlerts();
            loadMilkInventory();
            loadTodayMilkUsage();
          }}
        />
      )}

      {/* Stock Adjustment Modal */}
      {showStockModal && selectedItem && (
        <StockAdjustModal
          item={selectedItem}
          action={stockAction}
          onClose={() => {
            setShowStockModal(false);
            setSelectedItem(null);
          }}
          onSave={handleStockAdjust}
        />
      )}
    </div>
  );
};

// Inventory Item Modal Component
const InventoryItemModal = ({
  item,
  onClose,
  onSave,
}: {
  item: InventoryItem | null;
  onClose: () => void;
  onSave: () => void;
}) => {
  const [formData, setFormData] = useState<CreateInventoryItemData>({
    name: item?.name || '',
    category: item?.category || 'raw_material',
    unit: item?.unit || 'liter',
    currentStock: item?.currentStock ?? 0,
    minStockLevel: item?.minStockLevel,
    expiryDate: item?.expiryDate ? item.expiryDate.split('T')[0] : undefined,
    price: item?.price || 0,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (item) {
        await inventoryAPI.update(item.id, formData);
      } else {
        await inventoryAPI.create(formData);
      }
      onSave();
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">{item ? 'Edit' : 'Add'} Inventory Item</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              disabled={item?.name.toLowerCase() === 'milk' && item?.category === 'raw_material'}
            />
            {item?.name.toLowerCase() === 'milk' && item?.category === 'raw_material' && (
              <p className="text-xs text-blue-600 mt-1">
                Milk inventory is automatically managed from milk collections. Cannot be edited manually.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-field"
              >
                <option value="raw_material">Raw Materials</option>
                <option value="packaging">Packaging Materials</option>
                <option value="finished_product">Finished Goods</option>
                <option value="utilities">Utilities & Energy</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
              <input
                type="text"
                required
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="input-field"
                placeholder="e.g., liter, kg, piece"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={typeof formData.currentStock === 'number' ? formData.currentStock : ''}
                onChange={(e) =>
                  setFormData({ ...formData, currentStock: e.target.value ? parseFloat(e.target.value) : undefined })
                }
                className="input-field"
                disabled={item?.name.toLowerCase() === 'milk' && item?.category === 'raw_material'}
              />
              {item?.name.toLowerCase() === 'milk' && item?.category === 'raw_material' ? (
                <p className="text-xs text-blue-600 mt-1">
                  Milk stock is automatically calculated from milk collections (today + previous days). Cannot be edited manually.
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">Opening stock / current stock at the time of creating the item</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.minStockLevel || ''}
                onChange={(e) =>
                  setFormData({ ...formData, minStockLevel: e.target.value ? parseFloat(e.target.value) : undefined })
                }
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.price || ''}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className="input-field"
                placeholder="Enter price"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={formData.expiryDate || ''}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value || undefined })}
                className="input-field"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Stock Adjustment Modal Component
const StockAdjustModal = ({
  item,
  action,
  onClose,
  onSave,
}: {
  item: InventoryItem;
  action: 'in' | 'out';
  onClose: () => void;
  onSave: (quantity: number, notes?: string) => void;
}) => {
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || parseFloat(quantity) <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    if (action === 'out' && parseFloat(quantity) > item.currentStock) {
      alert('Insufficient stock');
      return;
    }

    setLoading(true);
    try {
      await onSave(parseFloat(quantity), notes || undefined);
      onClose();
    } catch (error) {
      // Error handled in parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">
          Stock {action === 'in' ? 'In' : 'Out'} - {item.name}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Current Stock: {item.currentStock} {item.unit}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={quantity || ''}
              onChange={(e) => setQuantity(e.target.value)}
              className="input-field"
              placeholder={`Enter quantity in ${item.unit}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field"
              rows={3}
              placeholder="Optional notes..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Processing...' : action === 'in' ? 'Add Stock' : 'Remove Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
