import { useState, useEffect, useMemo } from 'react';
import { salesAPI, type Sale } from '../../services/salesAPI';
import { authAPI } from '../../services/api';
import {
  CalendarIcon,
  MapPinIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserIcon,
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
  salespersonName?: string;
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
  salespersonName?: string;
}

interface SalesReportViewProps {
  startDate: string;
  endDate: string;
}

export const SalesReportView = ({ startDate, endDate }: SalesReportViewProps) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedShopId, setExpandedShopId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [salespersonMap, setSalespersonMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    loadSales();
    loadSalespersons();
  }, [startDate, endDate]);

  const loadSales = async () => {
    try {
      setLoading(true);
      const data = await salesAPI.getAll({ startDate, endDate });
      setSales(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load sales:', error);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSalespersons = async () => {
    try {
      const response = await authAPI.getSalespersons();
      if (response.data.success) {
        const users = response.data.data || [];
        const map = new Map<string, string>();
        users.forEach((user: any) => {
          if (user.id) {
            map.set(user.id, user.name || user.username || 'Unknown');
          }
        });
        setSalespersonMap(map);
      }
    } catch (error) {
      console.error('Failed to load salespersons:', error);
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
      // Use salespersonName from sale data if available, otherwise lookup from map
      const salespersonName = sale.salespersonName || (sale.createdBy ? salespersonMap.get(sale.createdBy) || 'Unknown' : 'Unknown');

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
          salespersonName,
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
        summary.salespersonName = salespersonName;
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
  }, [sales, salespersonMap]);

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
      // Use salespersonName from sale data if available, otherwise lookup from map
      const salespersonName = sale.salespersonName || (sale.createdBy ? salespersonMap.get(sale.createdBy) || 'Unknown' : 'Unknown');

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
        salespersonName,
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

  // Calculate summary totals
  const summaryTotals = useMemo(() => {
    return {
      totalShops: shopSummaries.length,
      totalSales: shopSummaries.reduce((sum, s) => sum + s.totalSales, 0),
      totalAmount: shopSummaries.reduce((sum, s) => sum + s.totalAmount, 0),
      totalPaid: shopSummaries.reduce((sum, s) => sum + s.totalPaid, 0),
      totalPending: shopSummaries.reduce((sum, s) => sum + s.pendingAmount, 0),
    };
  }, [shopSummaries]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading sales report...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Total Shops</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{summaryTotals.totalShops}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Total Sales</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{summaryTotals.totalSales}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Total Amount</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{formatCurrencySimple(summaryTotals.totalAmount)}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Total Paid</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{formatCurrencySimple(summaryTotals.totalPaid)}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Total Pending</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{formatCurrencySimple(summaryTotals.totalPending)}</div>
        </div>
      </div>

      {/* Compact Sales List - Default View */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Shop-wise Sales Report</h3>
          <p className="text-sm text-gray-600 mt-1">
            Period: {new Date(startDate).toLocaleDateString('en-GB')} to {new Date(endDate).toLocaleDateString('en-GB')}
          </p>
        </div>
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
                  Salesperson
                </th>
                <th className="text-left px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Items
                </th>
                <th className="text-right px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Total
                </th>
                <th className="text-right px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Paid
                </th>
                <th className="text-right px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Pending
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
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    No sales found for the selected period
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
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900">
                                {summary.shopName}
                              </span>
                              {summary.latestSale.isEdited && (
                                <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                                  (edited)
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                              <MapPinIcon className="w-3 h-3" />
                              {summary.address}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-700">{summary.contact}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <UserIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-700">{summary.salespersonName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-700">
                            {itemCount} item{itemCount !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrencySimple(summary.totalAmount)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right whitespace-nowrap">
                          <span className="text-sm font-semibold text-green-600">
                            {formatCurrencySimple(summary.totalPaid)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right whitespace-nowrap">
                          <span className="text-sm font-semibold text-red-600">
                            {formatCurrencySimple(summary.pendingAmount)}
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
                          <td colSpan={10} className="px-4 py-6 bg-gray-50">
                            <ReportShopDetailsView
                              shopId={summary.shopId}
                              shopName={summary.shopName}
                              selectedMonth={selectedMonth}
                              onMonthChange={setSelectedMonth}
                              sales={sales}
                              salespersonMap={salespersonMap}
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
    </div>
  );
};

// Report Shop Details Component
interface ReportShopDetailsViewProps {
  shopId: string;
  shopName: string;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  sales: Sale[];
  salespersonMap: Map<string, string>;
}

const ReportShopDetailsView = ({
  shopId,
  shopName,
  selectedMonth,
  onMonthChange,
  sales,
  salespersonMap,
}: ReportShopDetailsViewProps) => {
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
      // Use salespersonName from sale data if available, otherwise lookup from map
      const salespersonName = sale.salespersonName || (sale.createdBy ? salespersonMap.get(sale.createdBy) || 'Unknown' : 'Unknown');

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
        salespersonName,
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

  // Get month options based on date range of sales
  const getMonthOptions = () => {
    const options = [];
    const months = new Set<string>();
    
    sales.forEach((sale) => {
      const saleDate = new Date(sale.date);
      const value = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
      months.add(value);
    });
    
    const sortedMonths = Array.from(months).sort((a, b) => b.localeCompare(a));
    
    sortedMonths.forEach((value) => {
      const [year, month] = value.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    });
    
    return options;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Shop: {shopName}</h3>
          <p className="text-sm text-gray-600">Month: {formatMonth(selectedMonth)}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Select Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {getMonthOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Detailed Table */}
      {details.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No sales found for {formatMonth(selectedMonth)}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                <th className="text-left px-3 py-2 font-semibold text-gray-700">Date</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-700">Time</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-700">Salesperson</th>
                <th className="text-center px-3 py-2 font-semibold text-gray-700">Items Sold</th>
                {products.map((product) => (
                  <th key={product} className="text-center px-3 py-2 font-semibold text-gray-700">
                    {product}
                  </th>
                ))}
                <th className="text-right px-3 py-2 font-semibold text-gray-700">Total</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-700">Paid</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-700">Pending</th>
                <th className="text-center px-3 py-2 font-semibold text-gray-700">Status</th>
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
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <UserIcon className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-700">{detail.salespersonName}</span>
                        {detail.isEdited && (
                          <span className="text-xs text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">
                            (edited)
                          </span>
                        )}
                      </div>
                    </td>
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
                    <td className="px-3 py-2 text-right font-semibold text-green-600">
                      {formatCurrencySimple(detail.totalPaid)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-red-600">
                      {formatCurrencySimple(detail.pendingAmount)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${status.color}`}
                      >
                        {status.text}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};





