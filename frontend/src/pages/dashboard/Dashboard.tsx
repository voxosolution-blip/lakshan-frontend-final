import { useState, useEffect } from 'react';
import {
  UsersIcon,
  BeakerIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  MapPinIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { formatCurrencySimple } from '../../utils/currency';
import { farmerAPI } from '../../services/farmerAPI';
import { salesAPI } from '../../services/salesAPI';
import { paymentsAPI, type ChequeAlert } from '../../services/paymentsAPI';
import { inventoryAPI } from '../../services/inventoryAPI';
import { returnsAPI } from '../../services/returnsAPI';
import { useAuth } from '../../context/AuthContext';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { dashboardAPI, type SalespersonLocation } from '../../services/dashboardAPI';
import { setupHourlyRefresh } from '../../utils/hourlyRefresh';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  change?: string;
  changeType?: 'positive' | 'negative';
  color: string;
  gradient?: string;
}

const StatCard = ({ title, value, icon: Icon, change, changeType, color, gradient }: StatCardProps) => {
  return (
    <div className="group relative bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 overflow-hidden">
      <div className="relative p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 truncate">{title}</p>
            <p className="text-lg font-bold text-gray-900 leading-snug truncate">{value}</p>
            {change && (
              <div className={`flex items-center mt-1.5 text-[10px] font-medium ${changeType === 'positive' ? 'text-emerald-600' : 'text-red-600'}`}>
                <ArrowTrendingUpIcon className={`w-2.5 h-2.5 mr-0.5 ${changeType === 'negative' ? 'rotate-180' : ''}`} />
                {change}
              </div>
            )}
          </div>
          <div className={`w-12 h-12 ${color} ${gradient || ''} rounded-lg flex items-center justify-center shadow-sm flex-shrink-0 transform group-hover:scale-105 transition-transform duration-200`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
};

interface ProductStockCardProps {
  title: string;
  value: number;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

const ProductStockCard = ({ title, value, bgColor, textColor, borderColor }: ProductStockCardProps) => {
  return (
    <div className={`${bgColor} rounded-xl p-6 border-2 ${borderColor} hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}>
      <h3 className={`text-sm font-bold ${textColor} mb-3 uppercase tracking-wide`}>{title}</h3>
      <p className={`text-4xl font-extrabold ${textColor} mb-2`}>{value}</p>
      <p className={`text-xs font-medium ${textColor} opacity-75`}>pieces in stock</p>
    </div>
  );
};

interface TodaySalesReturnsCardProps {
  productName: string;
  soldToday: number;
  returnedToday: number;
  index: number;
}

const TodaySalesReturnsCard = ({ productName, soldToday, returnedToday, index }: TodaySalesReturnsCardProps) => {
  const colors = [
    { bg: 'bg-gradient-to-br from-blue-50 to-blue-100', text: 'text-blue-900', border: 'border-blue-300', soldIcon: 'text-blue-600', returnIcon: 'text-blue-400' },
    { bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100', text: 'text-emerald-900', border: 'border-emerald-300', soldIcon: 'text-emerald-600', returnIcon: 'text-emerald-400' },
    { bg: 'bg-gradient-to-br from-purple-50 to-purple-100', text: 'text-purple-900', border: 'border-purple-300', soldIcon: 'text-purple-600', returnIcon: 'text-purple-400' },
    { bg: 'bg-gradient-to-br from-amber-50 to-amber-100', text: 'text-amber-900', border: 'border-amber-300', soldIcon: 'text-amber-600', returnIcon: 'text-amber-400' },
    { bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100', text: 'text-indigo-900', border: 'border-indigo-300', soldIcon: 'text-indigo-600', returnIcon: 'text-indigo-400' },
    { bg: 'bg-gradient-to-br from-pink-50 to-pink-100', text: 'text-pink-900', border: 'border-pink-300', soldIcon: 'text-pink-600', returnIcon: 'text-pink-400' },
  ];
  const color = colors[index % colors.length];

  return (
    <div className={`${color.bg} rounded-xl p-5 border-2 ${color.border} hover:shadow-lg transition-all duration-300`}>
      <h3 className={`text-sm font-bold ${color.text} mb-4 uppercase tracking-wide`}>{productName}</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCartIcon className={`w-5 h-5 ${color.soldIcon}`} />
            <span className={`text-xs font-medium ${color.text} opacity-80`}>Sold Today</span>
          </div>
          <p className={`text-2xl font-extrabold ${color.text}`}>{Math.round(soldToday)}</p>
        </div>
        {returnedToday > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-opacity-30" style={{ borderColor: color.border }}>
            <div className="flex items-center gap-2">
              <ArrowPathIcon className={`w-5 h-5 ${color.returnIcon}`} />
              <span className={`text-xs font-medium ${color.text} opacity-80`}>Returned Today</span>
            </div>
            <p className={`text-2xl font-extrabold ${color.returnIcon}`}>{Math.round(returnedToday)}</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
}

const SectionHeader = ({ title, subtitle, icon: Icon, action }: SectionHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          {Icon && <Icon className="w-7 h-7 text-primary-600" />}
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1.5 font-medium">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

import { SalespersonDashboard } from './SalespersonDashboard';

export const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    totalCollectors: 0,
    todayMilk: 0,
    todaySales: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    activeProducts: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [salespersonLocations, setSalespersonLocations] = useState<SalespersonLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [chequeAlerts, setChequeAlerts] = useState<ChequeAlert[]>([]);
  const [milkChartData, setMilkChartData] = useState<{ date: string; collection: number; usage: number }[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [productSalesData, setProductSalesData] = useState<{ productId: string; productName: string; amount: number; quantity: number; count: number; percentage: number }[]>([]);
  const [productSalesLoading, setProductSalesLoading] = useState(false);
  const [shopWiseSalesData, setShopWiseSalesData] = useState<Array<{ shopId: string; shopName: string; totalAmount: number; saleCount: number }>>([]);
  const [shopWiseSalesLoading, setShopWiseSalesLoading] = useState(false);
  const [finishedGoodsChartData, setFinishedGoodsChartData] = useState<{ chartData: Array<any>; products: string[]; currentInventory: Array<{ productName: string; currentStock: number }> }>({ chartData: [], products: [], currentInventory: [] });
  const [finishedGoodsChartLoading, setFinishedGoodsChartLoading] = useState(false);
  const [financialStats, setFinancialStats] = useState({
    netProfit: 0,
    grossProfit: 0,
    totalSales: 0,
    allocatedStock: 0,
    totalReturnCount: 0
  });
  const [productCounts, setProductCounts] = useState({
    yogurtDrinks: 0,
    icePackets: 0
  });
  const [todaySalesAndReturns, setTodaySalesAndReturns] = useState<Array<{ productId: string; productName: string; soldToday: number; returnedToday: number }>>([]);
  const [salespersonStockLoading, setSalespersonStockLoading] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(true);
  
  const isSalesperson = user?.role === 'SALESPERSON';
  const isAdmin = user?.role === 'ADMIN';

  // Show salesperson dashboard for salespeople
  if (isSalesperson) {
    return <SalespersonDashboard />;
  }

  useEffect(() => {
      loadDashboardData();
      loadChequeAlerts();
      if (isAdmin) {
        loadMilkChartData();
        loadProductSalesData();
        loadShopWiseSalesData();
        loadFinishedGoodsChartData();
        loadSalespersonStock();
      }
    // Refresh once per hour at the top of the hour (12:00, 1:00 PM, etc.)
    const cleanup = setupHourlyRefresh(() => {
      loadDashboardData();
      loadChequeAlerts();
      if (isAdmin) {
        loadMilkChartData();
        loadProductSalesData();
        loadShopWiseSalesData();
        loadFinishedGoodsChartData();
        loadSalespersonStock();
        loadTodaySalesAndReturns();
      }
    });
    return cleanup;
  }, [isAdmin]);

  // Load today's sales and returns (refreshed hourly via setupHourlyRefresh)
  useEffect(() => {
    if (!isAdmin) return;
    loadTodaySalesAndReturns();
  }, [isAdmin]);

  const loadChequeAlerts = async () => {
    try {
      const alerts = await paymentsAPI.getChequeAlerts();
      setChequeAlerts(alerts);
    } catch (error) {
      console.error('Failed to load cheque alerts:', error);
      setChequeAlerts([]);
    }
  };

  const loadMilkChartData = async () => {
    try {
      setChartLoading(true);
      // Get data from January 1st of current year to today (backend handles this automatically)
      const data = await dashboardAPI.getDailyMilkChartData();
      setMilkChartData(data);
    } catch (error) {
      console.error('Failed to load milk chart data:', error);
      setMilkChartData([]);
    } finally {
      setChartLoading(false);
    }
  };

  const loadProductSalesData = async () => {
    try {
      setProductSalesLoading(true);
      const data = await dashboardAPI.getProductSalesData();
      setProductSalesData(data);
    } catch (error) {
      console.error('Failed to load product sales data:', error);
      setProductSalesData([]);
    } finally {
      setProductSalesLoading(false);
    }
  };

  const loadShopWiseSalesData = async () => {
    try {
      setShopWiseSalesLoading(true);
      const data = await dashboardAPI.getShopWiseSalesData();
      setShopWiseSalesData(data);
    } catch (error) {
      console.error('Failed to load shop-wise sales data:', error);
      setShopWiseSalesData([]);
    } finally {
      setShopWiseSalesLoading(false);
    }
  };

  const loadFinishedGoodsChartData = async () => {
    try {
      setFinishedGoodsChartLoading(true);
      const data = await dashboardAPI.getFinishedGoodsChartData();
      setFinishedGoodsChartData(data);
    } catch (error) {
      console.error('Failed to load finished goods chart data:', error);
      setFinishedGoodsChartData({ chartData: [], products: [], currentInventory: [] });
    } finally {
      setFinishedGoodsChartLoading(false);
    }
  };

  const loadSalespersonStock = async () => {
    try {
      setSalespersonStockLoading(true);
      const data = await dashboardAPI.getSalespersonStock();
      
      // Find Yogurt Drinks and Ice Packets
      const yogurtDrinks = data.find((item) => 
        item.productName.toLowerCase().includes('yogurt') && 
        item.productName.toLowerCase().includes('drink')
      )?.remainingStock || 0;
      
      const icePackets = data.find((item) => 
        item.productName.toLowerCase().includes('ice') && 
        item.productName.toLowerCase().includes('packet')
      )?.remainingStock || 0;

      setProductCounts({
        yogurtDrinks: Math.round(yogurtDrinks),
        icePackets: Math.round(icePackets)
      });
    } catch (error) {
      console.error('Failed to load salesperson stock:', error);
      setProductCounts({ yogurtDrinks: 0, icePackets: 0 });
    } finally {
      setSalespersonStockLoading(false);
    }
  };

  const loadTodaySalesAndReturns = async () => {
    try {
      const data = await dashboardAPI.getTodaySalesAndReturns();
      setTodaySalesAndReturns(data);
    } catch (error) {
      console.error('Failed to load today\'s sales and returns:', error);
      setTodaySalesAndReturns([]);
    }
  };

  // Send salesperson location to backend
  const sendLocationToBackend = (latitude: number, longitude: number, accuracy?: number) => {
    dashboardAPI.updateLocation(latitude, longitude, accuracy)
      .then(() => {
        console.log('Location updated successfully');
      })
      .catch((error) => {
        console.error('Failed to update location:', error);
      });
  };

  // Get current location and send to backend (for salesperson)
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        sendLocationToBackend(latitude, longitude, accuracy || undefined);
        setLocationError(null);
      },
      (error) => {
        console.error('Error getting location:', error);
        setLocationError('Unable to retrieve your location. Please enable location permissions.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Track salesperson location and send to backend
  useEffect(() => {
    if (isSalesperson) {
      getCurrentLocation();
      // Update location every 30 seconds
      const locationInterval = setInterval(getCurrentLocation, 30000);
      return () => clearInterval(locationInterval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSalesperson]);

  // Load all salesperson locations (for admin)
  const loadSalespersonLocations = async () => {
    if (!isAdmin) return;
    
    try {
      setLocationsLoading(true);
      const locations = await dashboardAPI.getAllSalespersonLocations();
      setSalespersonLocations(locations);
    } catch (error) {
      console.error('Failed to load salesperson locations:', error);
    } finally {
      setLocationsLoading(false);
    }
  };

  // Load salesperson locations for admin
  useEffect(() => {
    if (isAdmin) {
      loadSalespersonLocations();
      // Refresh locations once per hour at the top of the hour (12:00, 1:00 PM, etc.)
      const cleanup = setupHourlyRefresh(loadSalespersonLocations);
      return cleanup;
    }
  }, [isAdmin]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [
        farmers,
        milkData,
        sales,
        payments,
        inventory,
        returns
      ] = await Promise.all([
        farmerAPI.getAll().catch(() => []),
        farmerAPI.getTotalMilkInventory().catch(() => null),
        salesAPI.getAll().catch(() => []),
        paymentsAPI.getAll().catch(() => []),
        inventoryAPI.getAll().catch(() => ({ data: { data: [] } })),
        returnsAPI.getAll().catch(() => [])
      ]);

      // Ensure all data is in correct format
      const safeSales = Array.isArray(sales) ? sales : [];
      const safeCollectors = Array.isArray(farmers) ? farmers : [];
      const safePayments = Array.isArray(payments) ? payments : [];
      const safeInventory = inventory?.data?.data || [];
      const safeReturns = Array.isArray(returns) ? returns : [];

      // Calculate today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calculate stats
      const todaySales = safeSales.filter((sale: any) => {
        const saleDate = new Date(sale.date);
        saleDate.setHours(0, 0, 0, 0);
        return saleDate.getTime() === today.getTime();
      });

      const todaySalesTotal = todaySales.reduce((sum: number, sale: any) => sum + (sale.totalAmount || 0), 0);
      const totalRevenue = safeSales.reduce((sum: number, sale: any) => sum + (sale.totalAmount || 0), 0);
      
      // Calculate pending payments (sales that are not fully paid)
      const pendingSales = safeSales.filter((sale: any) => sale.paymentStatus !== 'paid');
      const pendingPaymentsTotal = pendingSales.reduce((sum: number, sale: any) => {
        const paidAmount = safePayments
          .filter((p: any) => p.saleId === sale.id)
          .reduce((paid: number, p: any) => paid + (p.amount || 0), 0);
        return sum + ((sale.totalAmount || 0) - paidAmount);
      }, 0);

      // Get today's milk collection (approximate from current stock)
      const todayMilk = milkData?.currentStock || 0;

      // Active products (inventory items)
      const activeProducts = safeInventory.filter((item: any) => (item.currentStock || 0) > 0).length || 0;

      // Calculate financial stats
      // Gross Profit = Total Revenue - Cost of Goods Sold (simplified: assume 30% margin)
      const grossProfit = totalRevenue * 0.7; // Assuming 30% COGS
      // Net Profit = Gross Profit - Operating Expenses (simplified: assume 20% of revenue as expenses)
      const netProfit = grossProfit - (totalRevenue * 0.2);

      // Calculate allocated stock (from salesperson allocations)
      const allocatedStock = safeInventory.reduce((sum: number, item: any) => {
        // This is a simplified calculation - in real scenario, we'd query salesperson_allocations
        return sum + (item.allocatedStock || 0);
      }, 0);

      // Calculate total return count
      const totalReturnCount = safeReturns.length;

      setStats({
        totalCollectors: safeCollectors.length,
        todayMilk: todayMilk,
        todaySales: todaySalesTotal,
        totalRevenue: totalRevenue,
        pendingPayments: pendingPaymentsTotal,
        activeProducts: activeProducts
      });

      setFinancialStats({
        netProfit: netProfit,
        grossProfit: grossProfit,
        totalSales: totalRevenue,
        allocatedStock: allocatedStock,
        totalReturnCount: totalReturnCount
      });

      // Recent activity
      const activities: any[] = [];
      
      // Recent sales
      const recentSales = safeSales.slice(0, 3).map((sale: any) => ({
        type: 'sale',
        title: 'New Sale',
        description: `Sale #${sale.id.substring(0, 8)} - ${formatCurrencySimple(sale.totalAmount)}`,
        time: new Date(sale.date).toLocaleDateString(),
        icon: ShoppingCartIcon,
        color: 'bg-blue-100 text-blue-600'
      }));

      // Recent milk collections (if available)
      if (milkData && milkData.currentStock > 0) {
        activities.push({
          type: 'milk',
          title: 'Milk Collection',
          description: `${milkData.currentStock.toFixed(2)} L in stock`,
          time: 'Today',
          icon: BeakerIcon,
          color: 'bg-green-100 text-green-600'
        });
      }

      // Recent collectors
      const recentCollectors = safeCollectors.slice(0, 2).map((collector: any) => ({
        type: 'collector',
        title: 'New Dairy Collector',
        description: `Collector #${collector.id.substring(0, 8)} added`,
        time: new Date(collector.createdAt).toLocaleDateString(),
        icon: UsersIcon,
        color: 'bg-yellow-100 text-yellow-600'
      }));

      setRecentActivity([...recentSales, ...activities, ...recentCollectors].slice(0, 5));

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Financial & Stock Stats Cards - Top of Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          title="Net Profit"
          value={formatCurrencySimple(financialStats.netProfit)}
          icon={CurrencyDollarIcon}
          color="bg-gradient-to-br from-emerald-500 to-emerald-600"
        />
        <StatCard
          title="Gross Profit"
          value={formatCurrencySimple(financialStats.grossProfit)}
          icon={CurrencyDollarIcon}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          title="Today Sales"
          value={formatCurrencySimple(stats.todaySales)}
          icon={ShoppingCartIcon}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
        />
        <StatCard
          title="Allocated"
          value={financialStats.allocatedStock.toString()}
          icon={UsersIcon}
          color="bg-gradient-to-br from-amber-500 to-amber-600"
        />
        <StatCard
          title="Total Return Count"
          value={financialStats.totalReturnCount.toString()}
          icon={ArrowPathIcon}
          color="bg-gradient-to-br from-indigo-500 to-indigo-600"
        />
      </div>

      {/* Location Map - Below Stats - Admin Only */}
      {isAdmin && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <SectionHeader
            title="Salesperson Locations"
            subtitle="Real-time location tracking of sales team"
            icon={MapPinIcon}
            action={
              <div className="flex gap-2">
                <button
                  onClick={loadSalespersonLocations}
                  className="px-4 py-2 text-sm font-semibold text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors duration-200 disabled:opacity-50"
                  disabled={locationsLoading}
                >
                  {locationsLoading ? 'Loading...' : 'Refresh'}
                </button>
                <button
                  onClick={() => setMapExpanded(!mapExpanded)}
                  className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors duration-200"
                >
                  {mapExpanded ? 'Reduce View' : 'Current View'}
                </button>
              </div>
            }
          />
          {salespersonLocations.length > 0 ? (
            <div className={`${mapExpanded ? 'h-[28rem]' : 'h-[14rem]'} w-full rounded-xl overflow-hidden border-2 border-gray-200 shadow-inner transition-all duration-300`}>
              <MapContainer
                center={[salespersonLocations[0].location.latitude, salespersonLocations[0].location.longitude]}
                zoom={mapExpanded ? 12 : 13}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
                key={`${mapExpanded}-${salespersonLocations[0]?.location.latitude}-${salespersonLocations[0]?.location.longitude}`}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {salespersonLocations.map((sp) => (
                  <Marker
                    key={sp.userId}
                    position={[sp.location.latitude, sp.location.longitude]}
                  >
                    <Popup>
                      <div className="text-center">
                        <p className="font-semibold text-base">{sp.name}</p>
                        <p className="text-sm text-gray-600 mt-1">{sp.username}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {sp.location.latitude.toFixed(6)}, {sp.location.longitude.toFixed(6)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Updated: {new Date(sp.lastUpdated).toLocaleTimeString()}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          ) : (
            <div className={`${mapExpanded ? 'h-[28rem]' : 'h-[14rem]'} flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 transition-all duration-300`}>
              <div className="text-center">
                <MapPinIcon className="w-16 h-16 text-gray-400 mx-auto mb-4 opacity-50" />
                <p className="text-gray-600 font-medium text-lg">
                  {locationsLoading ? 'Loading locations...' : 'No salesperson locations available'}
                </p>
                {locationError && (
                  <p className="text-sm text-red-600 mt-3 font-medium">{locationError}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Today's Sales & Returns */}
      {isAdmin && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <SectionHeader
            title="Today's Sales & Returns"
            subtitle="Real-time salesperson sales and returns summary for today"
          />
          {todaySalesAndReturns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {todaySalesAndReturns.map((item, index) => (
                  <TodaySalesReturnsCard
                    key={item.productId}
                    productName={item.productName}
                    soldToday={item.soldToday}
                    returnedToday={item.returnedToday}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <ShoppingCartIcon className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
                  <p className="text-gray-600 font-medium">No sales or returns today</p>
                  <p className="text-sm text-gray-500 mt-1">Sales and returns will appear here in real-time</p>
                </div>
              </div>
            )}
        </div>
      )}

      {/* Combined Charts - Daily Milk Collection & Product Sales - Admin Only */}
      {isAdmin && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <SectionHeader
            title="Daily Milk Collection & Usage & Product Sales Distribution"
            subtitle={`Milk data from January 1st to today • Product sales for ${new Date().getFullYear()}`}
            icon={BeakerIcon}
            action={
              <button
                onClick={() => {
                  loadMilkChartData();
                  loadProductSalesData();
                }}
                className="px-4 py-2 text-sm font-semibold text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors duration-200 disabled:opacity-50"
                disabled={chartLoading || productSalesLoading}
              >
                {(chartLoading || productSalesLoading) ? 'Loading...' : 'Refresh'}
              </button>
            }
          />
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            {/* Daily Milk Collection & Usage - 70% width (7 columns) */}
            <div className="lg:col-span-7">
              {chartLoading ? (
                <div className="h-96 flex items-center justify-center bg-gray-50 rounded-xl">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent mb-3"></div>
                    <p className="text-gray-600 font-medium">Loading milk chart data...</p>
                  </div>
                </div>
              ) : milkChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={milkChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorCollection" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                      </linearGradient>
                      <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#bfdbfe" strokeOpacity={0.5} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#6b7280"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getDate()}/${date.getMonth() + 1}`;
                      }}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Liters', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                    />
                     <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      labelFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                      }}
                      formatter={(value: number | undefined, name: string | undefined) => {
                        const numValue = value || 0;
                        return [`${numValue.toFixed(2)} L`, name || ''];
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="collection" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      fill="url(#colorCollection)"
                      fillOpacity={1}
                      dot={{ fill: '#3b82f6', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Milk Collection"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="usage" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      fill="url(#colorUsage)"
                      fillOpacity={1}
                      dot={{ fill: '#ef4444', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Milk Usage"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-96 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <BeakerIcon className="w-16 h-16 text-gray-400 mx-auto mb-4 opacity-50" />
                    <p className="text-gray-600 font-medium text-lg">No milk data available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Product Sales Distribution - 30% width (3 columns) */}
            <div className="lg:col-span-3">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Product Overview</h3>
              {productSalesLoading ? (
                <div className="h-96 flex items-center justify-center bg-gray-50 rounded-xl">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent mb-3"></div>
                    <p className="text-gray-600 font-medium">Loading sales data...</p>
                  </div>
                </div>
              ) : productSalesData.length > 0 ? (
                <div className="flex flex-col h-full">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={productSalesData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="amount"
                      >
                        {productSalesData.map((_entry, index) => {
                          const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#a855f7'];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number | undefined, _name: string | undefined, props: any) => {
                          const numValue = value || 0;
                          return [
                            `${formatCurrencySimple(numValue)} (${props.payload.percentage}%)`,
                            props.payload.productName
                          ];
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }}
                        iconType="circle"
                        formatter={(_value: string, entry: any) => {
                          return `${entry.payload.productName}: ${entry.payload.percentage}%`;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-96 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <ShoppingCartIcon className="w-16 h-16 text-gray-400 mx-auto mb-4 opacity-50" />
                    <p className="text-gray-600 font-medium">No sales data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Finished Goods Charts - Separate Production and Sales - Admin Only */}
      {isAdmin && (
        <div className="space-y-6">
          {/* Current Inventory Summary */}
          {finishedGoodsChartData.currentInventory.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <SectionHeader
                title="Current Finished Goods Inventory"
                subtitle="Current stock levels for all finished goods products"
                icon={BeakerIcon}
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {finishedGoodsChartData.currentInventory.map((item) => (
                  <div key={item.productName} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-xs text-gray-600 mb-1 font-medium">{item.productName}</p>
                    <p className="text-2xl font-bold text-gray-900">{Math.round(item.currentStock)}</p>
                    <p className="text-xs text-gray-500 mt-1">units in stock</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Finished Goods Charts in One Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Finished Goods Production Chart */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <SectionHeader
                title="Finished Goods Production"
                subtitle={`Daily production data from January 1st to today for ${new Date().getFullYear()}`}
                icon={BeakerIcon}
                action={
                  <button
                    onClick={loadFinishedGoodsChartData}
                    className="px-4 py-2 text-sm font-semibold text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors duration-200 disabled:opacity-50"
                    disabled={finishedGoodsChartLoading}
                  >
                    {finishedGoodsChartLoading ? 'Loading...' : 'Refresh'}
                  </button>
                }
              />
              {finishedGoodsChartLoading ? (
                <div className="h-80 flex items-center justify-center bg-gray-50 rounded-xl">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent mb-3"></div>
                    <p className="text-gray-600 font-medium">Loading production data...</p>
                  </div>
                </div>
              ) : finishedGoodsChartData.chartData.length > 0 && finishedGoodsChartData.products.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                <AreaChart 
                  data={finishedGoodsChartData.chartData} 
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <defs>
                    {finishedGoodsChartData.products.map((product, index) => {
                      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
                      const color = colors[index % colors.length];
                      const safeId = product.replace(/[^a-zA-Z0-9]/g, '');
                      return (
                        <linearGradient key={`gradient-${product}-produced`} id={`color${safeId}Produced`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={color} stopOpacity={0.05}/>
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#bfdbfe" strokeOpacity={0.5} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getDate()}/${date.getMonth() + 1}`;
                    }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Quantity Produced', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                    }}
                    formatter={(value: number | undefined, name: string | undefined) => {
                      const numValue = value || 0;
                      return [`${numValue.toFixed(2)}`, name || ''];
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }}
                    iconType="line"
                  />
                  {finishedGoodsChartData.products.map((product, index) => {
                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
                    const color = colors[index % colors.length];
                    const safeId = product.replace(/[^a-zA-Z0-9]/g, '');
                    return (
                      <Area
                        key={`${product}-produced`}
                        type="monotone"
                        dataKey={`${product}_produced`}
                        stroke={color}
                        strokeWidth={2}
                        fill={`url(#color${safeId}Produced)`}
                        fillOpacity={1}
                        dot={{ fill: color, r: 3 }}
                        activeDot={{ r: 5 }}
                        name={product}
                      />
                    );
                  })}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <BeakerIcon className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
                    <p className="text-gray-600 font-medium">No production data available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Finished Goods Sales Chart */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <SectionHeader
                title="Finished Goods Sales"
                subtitle={`Daily sales data from January 1st to today for ${new Date().getFullYear()}`}
                icon={ShoppingCartIcon}
                action={
                  <button
                    onClick={loadFinishedGoodsChartData}
                    className="px-4 py-2 text-sm font-semibold text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors duration-200 disabled:opacity-50"
                    disabled={finishedGoodsChartLoading}
                  >
                    {finishedGoodsChartLoading ? 'Loading...' : 'Refresh'}
                  </button>
                }
              />
              {finishedGoodsChartLoading ? (
                <div className="h-80 flex items-center justify-center bg-gray-50 rounded-xl">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent mb-3"></div>
                    <p className="text-gray-600 font-medium">Loading sales data...</p>
                  </div>
                </div>
              ) : finishedGoodsChartData.chartData.length > 0 && finishedGoodsChartData.products.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                <AreaChart 
                  data={finishedGoodsChartData.chartData} 
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <defs>
                    {finishedGoodsChartData.products.map((product, index) => {
                      const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#8b5cf6'];
                      const color = colors[index % colors.length];
                      const safeId = product.replace(/[^a-zA-Z0-9]/g, '');
                      return (
                        <linearGradient key={`gradient-${product}-sold`} id={`color${safeId}Sold`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={color} stopOpacity={0.05}/>
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#bfdbfe" strokeOpacity={0.5} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getDate()}/${date.getMonth() + 1}`;
                    }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Quantity Sold', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                    }}
                    formatter={(value: number | undefined, name: string | undefined) => {
                      const numValue = value || 0;
                      return [`${numValue.toFixed(2)}`, name || ''];
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }}
                    iconType="line"
                  />
                  {finishedGoodsChartData.products.map((product, index) => {
                    const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#8b5cf6'];
                    const color = colors[index % colors.length];
                    const safeId = product.replace(/[^a-zA-Z0-9]/g, '');
                    return (
                      <Area
                        key={`${product}-sold`}
                        type="monotone"
                        dataKey={`${product}_sold`}
                        stroke={color}
                        strokeWidth={2}
                        fill={`url(#color${safeId}Sold)`}
                        fillOpacity={1}
                        dot={{ fill: color, r: 3 }}
                        activeDot={{ r: 5 }}
                        name={product}
                      />
                    );
                  })}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <ShoppingCartIcon className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
                    <p className="text-gray-600 font-medium">No sales data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
