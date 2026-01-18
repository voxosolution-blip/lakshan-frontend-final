import { useState, useEffect, useMemo } from 'react';
import { salesAPI, type Sale, type CreateSaleData } from '../../services/salesAPI';
import { inventoryAPI, type InventoryItem } from '../../services/inventoryAPI';
import { buyerAPI } from '../../services/buyerAPI';
import type { Buyer } from '../../types';
import {
  PlusIcon,
  TrashIcon,
  ShoppingCartIcon,
  CalendarIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  GiftIcon,
  CurrencyDollarIcon,
  CubeIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import { formatCurrencySimple } from '../../utils/currency';
import { useAuth } from '../../context/AuthContext';
import { SalespersonSalesView } from './SalespersonSalesView';
import { AdminSalesView } from './AdminSalesView';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const StatCard = ({ title, value, icon: Icon, color }: StatCardProps) => {
  return (
    <div className="group relative bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 overflow-hidden">
      <div className="relative p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 truncate">{title}</p>
            <p className="text-lg font-bold text-gray-900 leading-snug truncate">{value}</p>
          </div>
          <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center shadow-sm flex-shrink-0 transform group-hover:scale-105 transition-transform duration-200`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const Sales = () => {
  const { user } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
  const isSalesperson = user?.role?.toUpperCase() === 'SALESPERSON';

  // Show salesperson-specific view for salespersons
  if (isSalesperson) {
    return <SalespersonSalesView />;
  }

  // Show admin-specific view for admins
  if (isAdmin) {
    return <AdminSalesView />;
  }
  const [sales, setSales] = useState<Sale[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAddShopModal, setShowAddShopModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [newShopForm, setNewShopForm] = useState({ shopName: '', contact: '', address: '' });
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [viewSale, setViewSale] = useState<any>(null);
  const [formData, setFormData] = useState<CreateSaleData>({
    date: new Date().toISOString().split('T')[0],
    paymentStatus: 'pending',
    items: []
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSales();
    loadInventoryItems();
    loadBuyers();
  }, []);

  const loadBuyers = async () => {
    try {
      const data = await buyerAPI.getAll();
      setBuyers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load buyers:', error);
      setBuyers([]);
    }
  };

  const loadSales = async () => {
    try {
      setLoading(true);
      const data = await salesAPI.getAll();
      setSales(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load sales:', error);
      setSales([]);
      alert('Failed to load sales');
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryItems = async () => {
    try {
      const response = await inventoryAPI.getAll();
      const rawData = response?.data?.data || response?.data || response || [];
      const dataArray = Array.isArray(rawData) ? rawData : [];
      
      console.log('Raw inventory data:', dataArray);
      
      const transformedData = dataArray
        .filter((item: any) => {
          // Check multiple category fields - backend returns category_name as "Finished Goods"
          // and category as "finished_product"
          const categoryName = item.category_name || '';
          const category = item.category || '';
          return categoryName === 'Finished Goods' || 
                 category === 'finished_product' || 
                 category === 'Finished Goods';
        })
        .map((item: any) => ({
          id: item.id,
          name: item.name,
          category: item.category_name || item.category || 'unknown',
          unit: item.unit || 'piece',
          currentStock: parseFloat(item.current_stock || item.quantity || 0),
          minStockLevel: item.min_stock_level || item.min_quantity ? parseFloat(item.min_stock_level || item.min_quantity) : undefined,
          expiryDate: item.expiry_date || item.expiryDate,
          price: parseFloat(item.price || 0),
          createdAt: item.created_at || item.createdAt,
          updatedAt: item.updated_at || item.updatedAt,
        }));
      
      console.log('Filtered inventory items:', transformedData);
      setInventoryItems(transformedData);
    } catch (error: any) {
      console.error('Failed to load inventory items:', error);
      setInventoryItems([]);
    }
  };

  // Group sales by customer and date
  const groupedSales = useMemo(() => {
    const groups = new Map<string, {
      key: string;
      date: string;
      rawDate: string;
      customerName: string;
      address: string;
      contact: string;
      items: Array<{
        productName: string;
        unitPrice: number;
        quantity: number;
        subtotal: number;
        freeQuantity?: number;
      }>;
      returns: Array<{
        productName: string;
        quantity: number;
        reason?: string;
      }>;
      paymentStatus: string;
      paymentMethod?: string;
      totalSubtotal: number;
      saleIds: string[];
      totalPaid: number;
      pendingAmount: number;
      isEdited?: boolean;
    }>();

    Array.isArray(sales) && sales.forEach((sale) => {
      const saleDate = new Date(sale.date).toLocaleDateString();
      const rawDate = sale.date;
      const customerName = sale.customerName || '-';
      const address = (sale as any).address || sale.route || '-';
      const contact = sale.contact || '-';
      const isEdited = sale.isEdited || false;
      const groupKey = `${saleDate}_${customerName}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          key: groupKey,
          date: saleDate,
          rawDate,
          customerName,
          address,
          contact,
          items: [],
          returns: [],
          paymentStatus: sale.paymentStatus || 'pending',
          paymentMethod: sale.paymentMethod,
          totalSubtotal: 0,
          saleIds: [],
          totalPaid: 0,
          pendingAmount: 0,
          isEdited: false
        });
      }

      const group = groups.get(groupKey)!;
      group.saleIds.push(sale.id);
      group.totalPaid += sale.totalPaid || 0;
      group.pendingAmount += sale.pendingAmount || 0;
      // Mark group as edited if any sale in the group is edited
      if (isEdited) {
        group.isEdited = true;
      }
      
      const saleItems = sale.items || [];
      
      saleItems.forEach((item) => {
        const productName = item.productName || item.inventoryItem?.name || '-';
        const unitPrice = item.unitPrice || item.price || 0;
        const quantity = item.quantity;
        const freeQuantity = item.freeQuantity || 0;
        const subtotal = unitPrice * quantity;

        const existingItem = group.items.find(i => i.productName === productName && i.unitPrice === unitPrice);
        if (existingItem) {
          existingItem.quantity += quantity;
          existingItem.subtotal += subtotal;
          existingItem.freeQuantity = (existingItem.freeQuantity || 0) + freeQuantity;
        } else {
          group.items.push({
            productName,
            unitPrice,
            quantity,
            subtotal,
            freeQuantity
          });
        }
        group.totalSubtotal += subtotal;
      });
      
      const saleReturns = (sale as any).returns || [];
      saleReturns.forEach((ret: any) => {
        const productName = ret.productName || 'Unknown Product';
        const quantity = ret.quantity || 0;
        const reason = ret.reason || null;
        
        const existingReturn = group.returns.find(r => r.productName === productName);
        if (existingReturn) {
          existingReturn.quantity += quantity;
        } else {
          group.returns.push({
            productName,
            quantity,
            reason
          });
        }
      });
    });

    return Array.from(groups.values());
  }, [sales]);

  // Filtered sales
  const filteredSales = useMemo(() => {
    return groupedSales.filter(group => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
          group.customerName.toLowerCase().includes(search) ||
          group.address.toLowerCase().includes(search) ||
          group.contact.toLowerCase().includes(search) ||
          group.items.some(item => item.productName.toLowerCase().includes(search));
        if (!matchesSearch) return false;
      }

      if (dateFrom) {
        const saleDate = new Date(group.rawDate);
        const fromDate = new Date(dateFrom);
        if (saleDate < fromDate) return false;
      }
      if (dateTo) {
        const saleDate = new Date(group.rawDate);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (saleDate > toDate) return false;
      }

      if (statusFilter !== 'all') {
        if (group.paymentStatus !== statusFilter) return false;
      }

      return true;
    });
  }, [groupedSales, searchTerm, dateFrom, dateTo, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredSales.reduce((sum, g) => sum + g.totalSubtotal, 0);
    const paid = filteredSales.reduce((sum, g) => sum + g.totalPaid, 0);
    const pending = filteredSales.reduce((sum, g) => sum + g.pendingAmount, 0);
    const totalItems = filteredSales.reduce((sum, g) => sum + g.items.reduce((s, i) => s + i.quantity, 0), 0);
    return { total, paid, pending, totalItems, count: filteredSales.length };
  }, [filteredSales]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    try {
      if (selectedSale) {
        await salesAPI.update(selectedSale.id, formData);
      } else {
        await salesAPI.create(formData);
      }
      setShowModal(false);
      setSelectedSale(null);
      setFormData({ date: new Date().toISOString().split('T')[0], paymentStatus: 'pending', items: [] });
      loadSales();
    } catch (error: any) {
      console.error('Failed to save sale:', error);
      alert(error.response?.data?.message || 'Failed to save sale');
    }
  };

  const handleDelete = async (saleIds: string[]) => {
    if (!confirm(`Are you sure you want to delete ${saleIds.length > 1 ? 'these sales' : 'this sale'}?`)) {
      return;
    }

    try {
      for (const id of saleIds) {
        await salesAPI.delete(id);
      }
      loadSales();
    } catch (error: any) {
      console.error('Failed to delete sale:', error);
      alert(error.response?.data?.message || 'Failed to delete sale');
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { inventoryItemId: '', quantity: 0, freeQuantity: 0 }]
    });
  };

  const updateItem = (index: number, field: string, value: any, additionalFields?: Record<string, any>) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value, ...additionalFields };
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => {
      const invItem = inventoryItems.find(i => i.id === item.inventoryItemId);
      const price = item.unitPrice || invItem?.price || 0;
      return sum + (price * item.quantity);
    }, 0);
  };

  const handleAddShop = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newBuyer = await buyerAPI.create({
        shopName: newShopForm.shopName,
        contact: newShopForm.contact,
        address: newShopForm.address
      });
      await loadBuyers();
      setFormData({ ...formData, buyerId: newBuyer.id });
      setShowAddShopModal(false);
      setNewShopForm({ shopName: '', contact: '', address: '' });
    } catch (error) {
      console.error('Failed to add shop:', error);
      alert('Failed to add shop');
    }
  };

  const toggleRowExpand = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusBadge = (paymentStatus: string, paymentMethod?: string) => {
    // Check for ongoing payment method first (most specific)
    if (paymentMethod === 'ongoing') {
      if (paymentStatus === 'paid') {
        return { text: 'Ongoing - Paid', color: 'bg-green-100 text-green-700' };
      } else if (paymentStatus === 'partial') {
        return { text: 'Ongoing - Partial', color: 'bg-yellow-100 text-yellow-700' };
      } else {
        return { text: 'Ongoing', color: 'bg-yellow-100 text-yellow-700' };
      }
    }
    
    // Check for other payment methods
    if (paymentMethod === 'cash' && paymentStatus === 'paid') {
      return { text: 'Cash - Paid', color: 'bg-green-100 text-green-700' };
    } else if (paymentMethod === 'cheque' && (paymentStatus === 'pending' || paymentStatus === 'partial')) {
      return { text: 'Cheque - Pending', color: 'bg-blue-100 text-blue-700' };
    }
    
    // Default status badges based on payment status only
    if (paymentStatus === 'paid') {
      return { text: 'Paid', color: 'bg-green-100 text-green-700' };
    } else if (paymentStatus === 'partial') {
      return { text: 'Partial', color: 'bg-orange-100 text-orange-700' };
    } else {
      return { text: 'Pending', color: 'bg-yellow-100 text-yellow-700' };
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setStatusFilter('all');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600 font-medium">Loading sales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Total Sales"
          value={formatCurrencySimple(stats.total)}
          icon={CurrencyDollarIcon}
          color="bg-gradient-to-br from-primary-500 to-primary-600"
        />
        <StatCard
          title="Paid Amount"
          value={formatCurrencySimple(stats.paid)}
          icon={ArrowTrendingUpIcon}
          color="bg-gradient-to-br from-emerald-500 to-emerald-600"
        />
        <StatCard
          title="Pending"
          value={formatCurrencySimple(stats.pending)}
          icon={ExclamationTriangleIcon}
          color="bg-gradient-to-br from-amber-500 to-amber-600"
        />
        <StatCard
          title="Items Sold"
          value={stats.totalItems.toString()}
          icon={CubeIcon}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by shop name, address, contact, or product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          
          {/* Filter Toggle & New Sale Button */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                showFilters || dateFrom || dateTo || statusFilter !== 'all'
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="w-5 h-5" />
              Filters
              {(dateFrom || dateTo || statusFilter !== 'all') && (
                <span className="bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {[dateFrom, dateTo, statusFilter !== 'all'].filter(Boolean).length}
                </span>
              )}
            </button>
            
            {isAdmin && (
              <button
                onClick={() => {
                  setSelectedSale(null);
                  setFormData({ 
                    date: new Date().toISOString().split('T')[0], 
                    paymentStatus: 'pending', 
                    items: [] 
                  });
                  setShowModal(true);
                }}
                className="btn-primary flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                New Sale
              </button>
            )}
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full btn-secondary"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sales List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="w-10 px-4 py-4"></th>
                <th className="text-left px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Shop</th>
                <th className="text-left px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                <th className="text-left px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Items</th>
                <th className="text-right px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                <th className="text-center px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="text-center px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSales.map((group) => {
                const status = getStatusBadge(group.paymentStatus, group.paymentMethod);
                const isExpanded = expandedRows.has(group.key);
                
                return (
                  <tr key={group.key} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleRowExpand(group.key)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUpIcon className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{group.date}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{group.customerName}</span>
                          {group.isEdited && (
                            <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                              (edited)
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <MapPinIcon className="w-3 h-3" />
                          {group.address}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{group.contact}</span>
                    </td>
                    <td className="px-4 py-4">
                      {isExpanded ? (
                        <div className="space-y-2">
                          {group.items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-sm bg-gray-50 px-3 py-2 rounded-lg">
                              <span className="font-medium text-gray-900 min-w-[140px]">{item.productName}</span>
                              <span className="text-gray-600 bg-white px-2 py-0.5 rounded border">{item.quantity} × {formatCurrencySimple(item.unitPrice)}</span>
                              {(item.freeQuantity || 0) > 0 && (
                                <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                  <GiftIcon className="w-3 h-3" />
                                  +{item.freeQuantity} Free
                                </span>
                              )}
                              <span className="ml-auto font-semibold text-gray-900">{formatCurrencySimple(item.subtotal)}</span>
                            </div>
                          ))}
                          {group.returns.length > 0 && (
                            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex items-center gap-1 text-red-700 text-xs font-semibold mb-2">
                                <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                                Returns
                              </div>
                              {group.returns.map((ret, idx) => (
                                <div key={idx} className="text-sm text-red-600 flex items-center gap-2">
                                  <span className="font-medium">{ret.productName}</span>
                                  <span className="bg-red-100 px-2 py-0.5 rounded font-semibold">{ret.quantity}</span>
                                  {ret.reason && <span className="text-red-500 italic text-xs">({ret.reason})</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700">{group.items.length} item{group.items.length !== 1 ? 's' : ''}</span>
                          {group.returns.length > 0 && (
                            <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-medium">
                              {group.returns.length} return{group.returns.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-bold text-gray-900">{formatCurrencySimple(group.totalSubtotal)}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                        {status.text}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setViewSale(group);
                            setShowViewModal(true);
                          }}
                          className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(group.saleIds)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredSales.length === 0 && (
            <div className="text-center py-16">
              <ShoppingCartIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">No sales found</p>
              <p className="text-gray-400 text-sm mt-2">
                {searchTerm || dateFrom || dateTo || statusFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Create your first sale to get started'}
              </p>
            </div>
          )}
        </div>
        
        {/* Footer with count */}
        {filteredSales.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold">{filteredSales.length}</span> of <span className="font-semibold">{groupedSales.length}</span> sales
            </p>
          </div>
        )}
      </div>

      {/* View Sale Modal */}
      {showViewModal && viewSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl">
            <div className="bg-primary-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Sale Details</h2>
              <button onClick={() => setShowViewModal(false)} className="text-white/80 hover:text-white">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Date</p>
                  <p className="font-semibold text-gray-900">{viewSale.date}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Status</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(viewSale.paymentStatus, viewSale.paymentMethod).color}`}>
                    {getStatusBadge(viewSale.paymentStatus, viewSale.paymentMethod).text}
                  </span>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Shop Name</p>
                  <p className="font-semibold text-gray-900">{viewSale.customerName}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Contact</p>
                  <p className="font-semibold text-gray-900">{viewSale.contact}</p>
                </div>
                <div className="col-span-2 bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Address</p>
                  <p className="font-semibold text-gray-900">{viewSale.address}</p>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
              <div className="space-y-2 mb-6">
                {viewSale.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900">{item.productName}</span>
                      <span className="text-gray-500 text-sm">{item.quantity} × {formatCurrencySimple(item.unitPrice)}</span>
                      {(item.freeQuantity || 0) > 0 && (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                          <GiftIcon className="w-3 h-3" />
                          +{item.freeQuantity} Free
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-gray-900">{formatCurrencySimple(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              {viewSale.returns.length > 0 && (
                <>
                  <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    Returns
                  </h3>
                  <div className="space-y-2 mb-6">
                    {viewSale.returns.map((ret: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-red-50 px-4 py-3 rounded-lg border border-red-200">
                        <span className="font-medium text-red-700">{ret.productName}</span>
                        <div className="flex items-center gap-2">
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-semibold">{ret.quantity}</span>
                          {ret.reason && <span className="text-red-500 text-sm italic">({ret.reason})</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="bg-primary-50 p-4 rounded-lg border border-primary-200">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-900">Total Amount</span>
                  <span className="text-2xl font-bold text-primary-600">{formatCurrencySimple(viewSale.totalSubtotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <SaleModal
          formData={formData}
          setFormData={setFormData}
          inventoryItems={inventoryItems}
          buyers={buyers}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowModal(false);
            setSelectedSale(null);
            setFormData({ date: new Date().toISOString().split('T')[0], paymentStatus: 'pending', items: [] });
          }}
          addItem={addItem}
          updateItem={updateItem}
          removeItem={removeItem}
          calculateTotal={calculateTotal}
          editing={!!selectedSale}
          onAddShop={isAdmin ? () => setShowAddShopModal(true) : undefined}
        />
      )}

      {/* Add Shop Modal */}
      {showAddShopModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">Add New Shop</h2>
            <form onSubmit={handleAddShop} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Shop Name *</label>
                <input
                  type="text"
                  required
                  value={newShopForm.shopName}
                  onChange={(e) => setNewShopForm({ ...newShopForm, shopName: e.target.value })}
                  className="w-full input-field"
                  placeholder="Enter shop name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contact</label>
                <input
                  type="text"
                  value={newShopForm.contact}
                  onChange={(e) => setNewShopForm({ ...newShopForm, contact: e.target.value })}
                  className="w-full input-field"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <textarea
                  value={newShopForm.address}
                  onChange={(e) => setNewShopForm({ ...newShopForm, address: e.target.value })}
                  className="w-full input-field"
                  rows={2}
                  placeholder="Shop address"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddShopModal(false);
                    setNewShopForm({ shopName: '', contact: '', address: '' });
                  }}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Add Shop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Sale Modal Component
const SaleModal = ({
  formData,
  setFormData,
  inventoryItems,
  buyers,
  onSubmit,
  onClose,
  addItem,
  updateItem,
  removeItem,
  calculateTotal,
  editing,
  onAddShop
}: {
  formData: CreateSaleData;
  setFormData: (data: CreateSaleData) => void;
  inventoryItems: InventoryItem[];
  buyers: Buyer[];
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  addItem: () => void;
  updateItem: (index: number, field: string, value: any, additionalFields?: Record<string, any>) => void;
  removeItem: (index: number) => void;
  calculateTotal: () => number;
  editing: boolean;
  onAddShop?: () => void;
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl">
        <div className="bg-primary-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{editing ? 'Edit' : 'New'} Sale</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Date *</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Payment Status *</label>
                <select
                  required
                  value={formData.paymentStatus}
                  onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                  className="w-full input-field"
                >
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Shop *</label>
                <select
                  value={formData.buyerId || ''}
                  onChange={(e) => {
                    const selectedBuyer = buyers.find(b => b.id === e.target.value);
                    setFormData({ 
                      ...formData, 
                      buyerId: e.target.value || undefined,
                      customerName: selectedBuyer?.shopName || formData.customerName || undefined
                    });
                  }}
                  className="w-full input-field"
                  required
                >
                  <option value="">Select a shop...</option>
                  {buyers.map((buyer) => (
                    <option key={buyer.id} value={buyer.id}>
                      {buyer.shopName}
                    </option>
                  ))}
                </select>
                {onAddShop && (
                  <button
                    type="button"
                    onClick={onAddShop}
                    className="mt-2 text-sm text-primary-600 hover:text-primary-800 flex items-center gap-1 font-medium"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Add New Shop
                  </button>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Address</label>
                <div className="w-full input-field flex items-center gap-2 bg-gray-50 text-gray-600">
                  <MapPinIcon className="w-4 h-4 flex-shrink-0 text-gray-400" />
                  <span className="truncate">
                    {formData.buyerId 
                      ? (buyers.find(b => b.id === formData.buyerId)?.address || 'No address available')
                      : 'Select a shop to see address'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">Items *</label>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors font-medium"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Item
                </button>
              </div>
              <div className="space-y-3">
                {formData.items.map((item, index) => {
                  const invItem = inventoryItems.find(i => i.id === item.inventoryItemId);
                  const itemPrice = item.unitPrice || invItem?.price || 0;
                  const itemQuantity = item.quantity || 0;
                  const freeQty = item.freeQuantity || 0;
                  return (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex gap-3 items-start">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Product</label>
                          <select
                            required
                            value={item.inventoryItemId || ''}
                            onChange={(e) => {
                              const selectedId = e.target.value;
                              const selectedItem = inventoryItems.find(i => i.id === selectedId);
                              // Update both inventoryItemId and unitPrice in one call
                              updateItem(index, 'inventoryItemId', selectedId, 
                                selectedItem && (!item.unitPrice || item.unitPrice === 0) 
                                  ? { unitPrice: selectedItem.price || 0 } 
                                  : undefined
                              );
                            }}
                            className="w-full input-field text-sm"
                          >
                            <option value="">Select Item</option>
                            {inventoryItems.map((inv) => (
                              <option key={inv.id} value={inv.id}>
                                {inv.name} - Rs. {(inv.price || 0).toFixed(2)}/{inv.unit || 'piece'} (Stock: {inv.currentStock})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-24">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Quantity</label>
                          <input
                            type="number"
                            step="1"
                            required
                            min="1"
                            value={itemQuantity || ''}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            className="w-full input-field text-sm"
                            placeholder="Qty"
                          />
                        </div>
                        <div className="w-24">
                          <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                            <GiftIcon className="w-3 h-3 text-green-500" />
                            Free
                          </label>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={freeQty || ''}
                            onChange={(e) => updateItem(index, 'freeQuantity', parseFloat(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            className="w-full input-field text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div className="w-28">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Unit Price</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={itemPrice || ''}
                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            className="w-full input-field text-sm"
                            placeholder="Price"
                          />
                        </div>
                        <div className="w-28 pt-6">
                          <div className="text-right font-bold text-gray-900">
                            {formatCurrencySimple(itemPrice * itemQuantity)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="mt-6 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove item"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                      {freeQty > 0 && (
                        <div className="mt-2 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-lg inline-flex items-center gap-1">
                          <GiftIcon className="w-3 h-3" />
                          {freeQty} free item{freeQty > 1 ? 's' : ''} will be deducted from inventory
                        </div>
                      )}
                    </div>
                  );
                })}
                {formData.items.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <CubeIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No items added yet</p>
                    <button
                      type="button"
                      onClick={addItem}
                      className="mt-2 text-sm text-primary-600 hover:text-primary-800 font-medium"
                    >
                      + Add your first item
                    </button>
                  </div>
                )}
              </div>
              {formData.items.length > 0 && (
                <div className="mt-4 p-4 bg-primary-50 rounded-lg border border-primary-200">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total Amount:</span>
                    <span className="text-2xl font-bold text-primary-600">{formatCurrencySimple(calculateTotal())}</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Notes</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full input-field"
                rows={2}
                placeholder="Additional notes (optional)"
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {editing ? 'Update Sale' : 'Create Sale'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
