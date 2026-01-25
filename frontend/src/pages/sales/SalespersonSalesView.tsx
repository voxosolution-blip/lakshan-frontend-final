import { useState, useEffect, useMemo } from 'react';
import { salesAPI, type Sale } from '../../services/salesAPI';
import { useAuth } from '../../context/AuthContext';
import {
  CalendarIcon,
  MapPinIcon,
  EyeIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { formatCurrencySimple } from '../../utils/currency';

interface ShopSaleSummary {
  shopId: string;
  shopName: string;
  contact: string;
  address: string;
  latestSale: Sale;
  totalSales: number;
  totalAmount: number;
  totalPaid: number;
  pendingAmount: number;
  paymentStatus: string;
}

interface ShopSaleDetail {
  saleId: string;
  date: string;
  time: string;
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
    freeQuantity?: number;
  }>;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod?: string;
  totalPaid: number;
  pendingAmount: number;
  isEdited?: boolean;
  isReversed?: boolean;
}

export const SalespersonSalesView = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedShopId, setExpandedShopId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [selectedSaleForReverse, setSelectedSaleForReverse] = useState<Sale | null>(null);
  const [reversePassword, setReversePassword] = useState('');
  const [reverseReason, setReverseReason] = useState('');
  const [reversingSale, setReversingSale] = useState(false);

  useEffect(() => {
    loadSales();
  }, []);

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

  // Group sales by shop - get latest sale per shop
  const shopSummaries = useMemo(() => {
    const shopMap = new Map<string, ShopSaleSummary>();

    sales.forEach((sale) => {
      // Use buyerId if available, otherwise use customerName + address as composite key
      const shopId = sale.buyerId || `${sale.customerName || 'Unknown Shop'}_${(sale as any).address || sale.route || '-'}`;
      const shopName = sale.customerName || 'Unknown Shop';
      const contact = sale.contact || '-';
      const address = (sale as any).address || sale.route || '-';

      if (!shopMap.has(shopId)) {
        shopMap.set(shopId, {
          shopId,
          shopName,
          contact,
          address,
          latestSale: sale,
          totalSales: 0,
          totalAmount: 0,
          totalPaid: 0,
          pendingAmount: 0,
          paymentStatus: 'paid',
        });
      }

      const summary = shopMap.get(shopId)!;
      summary.totalSales += 1;
      summary.totalAmount += sale.totalAmount || 0;
      summary.totalPaid += sale.totalPaid || 0;
      summary.pendingAmount += sale.pendingAmount || 0;

      // Update latest sale if this one is more recent
      const saleDate = new Date(sale.date);
      const latestDate = new Date(summary.latestSale.date);
      if (saleDate > latestDate) {
        summary.latestSale = sale;
      }

      // Update payment status
      if (sale.paymentStatus === 'pending' || sale.paymentStatus === 'partial') {
        summary.paymentStatus = sale.paymentStatus;
      }
    });

    // Sort by latest sale date (most recent first)
    return Array.from(shopMap.values()).sort((a, b) => {
      const dateA = new Date(a.latestSale.date);
      const dateB = new Date(b.latestSale.date);
      return dateB.getTime() - dateA.getTime();
    });
  }, [sales]);

  // Get detailed sales for a specific shop, filtered by month
  const getShopDetails = (shopId: string): ShopSaleDetail[] => {
    const [year, month] = selectedMonth.split('-').map(Number);
    
    const shopSales = sales.filter((sale) => {
      const saleDate = new Date(sale.date);
      // Match by buyerId if available, otherwise match by customerName + address
      const saleShopId = sale.buyerId || `${sale.customerName || 'Unknown Shop'}_${(sale as any).address || sale.route || '-'}`;
      
      return (
        saleDate.getFullYear() === year &&
        saleDate.getMonth() + 1 === month &&
        saleShopId === shopId
      );
    });

    return shopSales.map((sale) => {
      const saleDate = new Date(sale.date);
      const timeStr = saleDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      return {
        saleId: sale.id,
        date: saleDate.toLocaleDateString('en-GB'),
        time: timeStr,
        items: (sale.items || []).map((item) => ({
          productName: item.productName || 'Unknown Product',
          quantity: item.quantity || 0,
          price: item.unitPrice || item.price || 0,
          freeQuantity: item.freeQuantity || 0,
        })),
        totalAmount: sale.totalAmount || 0,
        paymentStatus: sale.paymentStatus || 'pending',
        paymentMethod: sale.paymentMethod,
        totalPaid: sale.totalPaid || 0,
        pendingAmount: sale.pendingAmount || 0,
        isEdited: sale.isEdited || false,
        isReversed: sale.isReversed || false,
      };
    });
  };

  // Get unique products for column headers
  const getUniqueProducts = (shopId: string): string[] => {
    const details = getShopDetails(shopId);
    const products = new Set<string>();
    details.forEach((detail) => {
      detail.items.forEach((item) => {
        products.add(item.productName);
      });
    });
    return Array.from(products).sort();
  };

  const getStatusBadge = (status: string, method?: string) => {
    if (status === 'paid') {
      return { text: 'Paid', color: 'bg-green-100 text-green-700' };
    }
    if (status === 'partial' || method === 'ongoing') {
      return { text: 'Credit', color: 'bg-yellow-100 text-yellow-700' };
    }
    return { text: 'Pending', color: 'bg-red-100 text-red-700' };
  };

  const handleViewShop = (shopId: string) => {
    if (expandedShopId === shopId) {
      setExpandedShopId(null);
    } else {
      setExpandedShopId(shopId);
    }
  };

  const handleReverseSale = (sale: Sale) => {
    setSelectedSaleForReverse(sale);
    setShowReverseModal(true);
  };

  const confirmReverseSale = async () => {
    if (!selectedSaleForReverse) return;
    if (!reversePassword) {
      alert('Please enter the password');
      return;
    }

    try {
      setReversingSale(true);
      await salesAPI.reverse(
        selectedSaleForReverse.id,
        reversePassword,
        reverseReason || 'Wrong order - bill reversed'
      );
      alert('Bill reversed successfully! Inventory has been restored.');
      setShowReverseModal(false);
      setSelectedSaleForReverse(null);
      setReversePassword('');
      setReverseReason('');
      loadSales();
    } catch (error: any) {
      console.error('Failed to reverse sale:', error);
      const errorMessage = error.response?.data?.message || 'Failed to reverse bill';
      alert(errorMessage);
    } finally {
      setReversingSale(false);
    }
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading sales...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 px-2 md:px-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1">Latest transactions per shop</p>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Date
                </th>
                <th className="text-left px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Shop
                </th>
                <th className="text-left px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Contact
                </th>
                <th className="text-left px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Items
                </th>
                <th className="text-right px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Total
                </th>
                <th className="text-center px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-center px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shopSummaries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No sales found
                  </td>
                </tr>
              ) : (
                shopSummaries.map((summary) => {
                  const status = getStatusBadge(
                    summary.latestSale.paymentStatus || summary.paymentStatus,
                    summary.latestSale.paymentMethod
                  );
                  const isExpanded = expandedShopId === summary.shopId;
                  const itemCount = summary.latestSale.items?.length || 0;

                  return (
                    <>
                      <tr key={summary.shopId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {new Date(summary.latestSale.date).toLocaleDateString('en-GB')}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-900">
                              {summary.shopName}
                            </span>
                            <span className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                              <MapPinIcon className="w-3 h-3" />
                              {summary.address}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-700">{summary.contact}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-700">
                            {itemCount} item{itemCount !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrencySimple(summary.latestSale.totalAmount || 0)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.color}`}
                          >
                            {status.text}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => handleViewShop(summary.shopId)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUpIcon className="w-4 h-4" />
                                Hide
                              </>
                            ) : (
                              <>
                                <EyeIcon className="w-4 h-4" />
                                View
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                      {/* Expanded Shop Details */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="px-4 py-6 bg-gray-50">
                            <ShopDetailsView
                              shopId={summary.shopId}
                              shopName={summary.shopName}
                              selectedMonth={selectedMonth}
                              onMonthChange={setSelectedMonth}
                              onReverseSale={handleReverseSale}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {shopSummaries.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
            No sales found
          </div>
        ) : (
          shopSummaries.map((summary) => {
            const status = getStatusBadge(
              summary.latestSale.paymentStatus || summary.paymentStatus,
              summary.latestSale.paymentMethod
            );
            const isExpanded = expandedShopId === summary.shopId;
            const itemCount = summary.latestSale.items?.length || 0;

            return (
              <div key={summary.shopId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 space-y-3">
                  {/* Shop Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900">{summary.shopName}</h3>
                      <div className="flex items-center gap-1 mt-1">
                        <MapPinIcon className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{summary.address}</span>
                      </div>
                      <div className="mt-1">
                        <span className="text-xs text-gray-600">Contact: {summary.contact}</span>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.color}`}>
                      {status.text}
                    </span>
                  </div>

                  {/* Sale Details */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                    <div>
                      <span className="text-xs text-gray-500 block">Date</span>
                      <div className="flex items-center gap-1 mt-1">
                        <CalendarIcon className="w-3 h-3 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {new Date(summary.latestSale.date).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">Items</span>
                      <span className="text-sm font-medium text-gray-900 mt-1 block">
                        {itemCount} item{itemCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-gray-500 block">Total Amount</span>
                      <span className="text-lg font-bold text-gray-900 mt-1 block">
                        {formatCurrencySimple(summary.latestSale.totalAmount || 0)}
                      </span>
                    </div>
                  </div>

                  {/* View Button */}
                  <button
                    onClick={() => handleViewShop(summary.shopId)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUpIcon className="w-4 h-4" />
                        Hide Details
                      </>
                    ) : (
                      <>
                        <EyeIcon className="w-4 h-4" />
                        View Details
                      </>
                    )}
                  </button>
                </div>

                {/* Expanded Shop Details - Mobile */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4">
                    <ShopDetailsView
                      shopId={summary.shopId}
                      shopName={summary.shopName}
                      selectedMonth={selectedMonth}
                      onMonthChange={setSelectedMonth}
                      onReverseSale={handleReverseSale}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Reverse Payment Modal */}
      {showReverseModal && selectedSaleForReverse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 md:p-6 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <ExclamationTriangleIcon className="w-6 h-6 md:w-8 md:h-8 text-red-600 flex-shrink-0" />
              <h2 className="text-lg md:text-xl font-bold text-gray-800">Reverse Bill</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Are you sure you want to reverse this bill? This action will:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 mb-4 space-y-1">
              <li>Restore all inventory items to previous stage</li>
              <li>Delete all payment records</li>
              <li>Mark this sale as reversed</li>
            </ul>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason (Optional)
              </label>
              <textarea
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                placeholder="Enter reason for reversing this bill..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={3}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-red-600">*</span>
              </label>
              <input
                type="password"
                value={reversePassword}
                onChange={(e) => setReversePassword(e.target.value)}
                placeholder="Enter password: salesperson123"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setShowReverseModal(false);
                  setReversePassword('');
                  setReverseReason('');
                }}
                className="btn-secondary flex-1 py-2.5 text-sm md:text-base"
                disabled={reversingSale}
              >
                Cancel
              </button>
              <button
                onClick={confirmReverseSale}
                className="btn-primary flex-1 py-2.5 text-sm md:text-base bg-red-600 hover:bg-red-700 text-white"
                disabled={reversingSale || !reversePassword}
              >
                {reversingSale ? 'Reversing...' : 'Reverse Bill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Shop Details Component
interface ShopDetailsViewProps {
  shopId: string;
  shopName: string;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onReverseSale: (sale: Sale) => void;
}

const ShopDetailsView = ({
  shopId,
  shopName,
  selectedMonth,
  onMonthChange,
  onReverseSale,
}: ShopDetailsViewProps) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShopSales();
  }, [shopId, selectedMonth]);

  const loadShopSales = async () => {
    try {
      setLoading(true);
      const data = await salesAPI.getAll();
      const salesArray = Array.isArray(data) ? data : [];
      setSales(salesArray);
    } catch (error) {
      console.error('Failed to load shop sales:', error);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const getShopDetails = (): ShopSaleDetail[] => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const shopSales = sales.filter((sale) => {
      const saleDate = new Date(sale.date);
      // Match by buyerId if available, otherwise match by customerName + address
      const saleShopId = sale.buyerId || `${sale.customerName || 'Unknown Shop'}_${(sale as any).address || sale.route || '-'}`;
      
      return (
        saleDate.getFullYear() === year &&
        saleDate.getMonth() + 1 === month &&
        saleShopId === shopId
      );
    });

    return shopSales.map((sale) => {
      const saleDate = new Date(sale.date);
      const timeStr = saleDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      return {
        saleId: sale.id,
        date: saleDate.toLocaleDateString('en-GB'),
        time: timeStr,
        items: (sale.items || []).map((item) => ({
          productName: item.productName || 'Unknown Product',
          quantity: item.quantity || 0,
          price: item.unitPrice || item.price || 0,
          freeQuantity: item.freeQuantity || 0,
        })),
        totalAmount: sale.totalAmount || 0,
        paymentStatus: sale.paymentStatus || 'pending',
        paymentMethod: sale.paymentMethod,
        totalPaid: sale.totalPaid || 0,
        pendingAmount: sale.pendingAmount || 0,
        isEdited: sale.isEdited || false,
        isReversed: sale.isReversed || false,
      };
    });
  };

  const getUniqueProducts = (): string[] => {
    const details = getShopDetails();
    const products = new Set<string>();
    details.forEach((detail) => {
      detail.items.forEach((item) => {
        products.add(item.productName);
      });
    });
    return Array.from(products).sort();
  };

  const getStatusBadge = (status: string, method?: string) => {
    if (status === 'paid') {
      return { text: 'Paid', color: 'bg-green-100 text-green-700' };
    }
    if (status === 'partial' || method === 'ongoing') {
      return { text: 'Credit', color: 'bg-yellow-100 text-yellow-700' };
    }
    return { text: 'Pending', color: 'bg-red-100 text-red-700' };
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const details = getShopDetails();
  const products = getUniqueProducts();

  // Get current and previous month options
  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  };

  if (loading) {
    return <div className="text-center text-gray-500 py-4">Loading...</div>;
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
        <div>
          <h3 className="text-base md:text-lg font-bold text-gray-900">Shop: {shopName}</h3>
          <p className="text-xs md:text-sm text-gray-600">Month: {formatMonth(selectedMonth)}</p>
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-medium text-gray-700 mb-1">Select Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {getMonthOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Desktop Table View */}
      {details.length === 0 ? (
        <div className="text-center text-gray-500 py-8 text-sm md:text-base">
          No sales found for {formatMonth(selectedMonth)}
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                <th className="text-left px-3 py-2 font-semibold text-gray-700">Date</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-700">Time</th>
                <th className="text-center px-3 py-2 font-semibold text-gray-700">Items Sold</th>
                {products.map((product) => (
                  <th key={product} className="text-center px-3 py-2 font-semibold text-gray-700">
                    {product}
                  </th>
                ))}
                <th className="text-right px-3 py-2 font-semibold text-gray-700">Total</th>
                <th className="text-center px-3 py-2 font-semibold text-gray-700">Status</th>
                <th className="text-center px-3 py-2 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {details.map((detail) => {
                const status = getStatusBadge(detail.paymentStatus, detail.paymentMethod);
                const itemMap = new Map<string, number>();
                detail.items.forEach((item) => {
                  itemMap.set(item.productName, item.quantity);
                });

                return (
                  <tr key={detail.saleId} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-900">{detail.date}</td>
                    <td className="px-3 py-2 text-gray-600">{detail.time}</td>
                    <td className="px-3 py-2 text-center text-gray-700">
                      {detail.items.length}
                    </td>
                    {products.map((product) => (
                      <td key={product} className="px-3 py-2 text-center text-gray-700">
                        {itemMap.get(product) || 0}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-semibold text-gray-900">
                      {formatCurrencySimple(detail.totalAmount)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${status.color}`}
                      >
                        {status.text}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {detail.paymentStatus === 'paid' && !detail.isReversed && (
                        <button
                          onClick={() => {
                            const sale = sales.find((s) => s.id === detail.saleId);
                            if (sale) onReverseSale(sale);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors"
                        >
                          <ArrowPathIcon className="w-3 h-3" />
                          Reverse
                        </button>
                      )}
                      {detail.isReversed && (
                        <span className="text-xs text-gray-500 italic">Reversed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {details.map((detail) => {
              const status = getStatusBadge(detail.paymentStatus, detail.paymentMethod);
              const itemMap = new Map<string, number>();
              detail.items.forEach((item) => {
                itemMap.set(item.productName, item.quantity);
              });

              return (
                <div key={detail.saleId} className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                  {/* Sale Header */}
                  <div className="flex items-start justify-between border-b pb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-semibold text-gray-900">{detail.date}</span>
                      </div>
                      <span className="text-xs text-gray-500 mt-1 block">{detail.time}</span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${status.color}`}>
                      {status.text}
                    </span>
                  </div>

                  {/* Items */}
                  <div>
                    <span className="text-xs text-gray-500 block mb-2">Items Sold: {detail.items.length}</span>
                    <div className="space-y-1">
                      {products.map((product) => {
                        const qty = itemMap.get(product) || 0;
                        if (qty === 0) return null;
                        return (
                          <div key={product} className="flex justify-between text-sm">
                            <span className="text-gray-700">{product}</span>
                            <span className="font-medium text-gray-900">{qty}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-700">Total Amount</span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrencySimple(detail.totalAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-gray-100">
                    {detail.paymentStatus === 'paid' && !detail.isReversed && (
                      <button
                        onClick={() => {
                          const sale = sales.find((s) => s.id === detail.saleId);
                          if (sale) onReverseSale(sale);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors"
                      >
                        <ArrowPathIcon className="w-4 h-4" />
                        Reverse Payment
                      </button>
                    )}
                    {detail.isReversed && (
                      <span className="text-xs text-gray-500 italic text-center block">This sale has been reversed</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

