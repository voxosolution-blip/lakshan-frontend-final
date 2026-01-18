import { useState, useEffect, useMemo } from 'react';
import { paymentsAPI, type ChequeRecord, type ChequeAlert } from '../../services/paymentsAPI';
import {
  CalendarIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  DevicePhoneMobileIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  BellAlertIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  subtitle?: string;
}

const StatCard = ({ title, value, icon: Icon, color, subtitle }: StatCardProps) => {
  return (
    <div className="group relative bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 overflow-hidden">
      <div className="relative p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 truncate">{title}</p>
            <p className="text-xl font-bold text-gray-900 leading-snug">{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center shadow-sm flex-shrink-0 transform group-hover:scale-105 transition-transform duration-200`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const Cheques = () => {
  const [cheques, setCheques] = useState<ChequeRecord[]>([]);
  const [chequeAlerts, setChequeAlerts] = useState<ChequeAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAlertsExpanded, setShowAlertsExpanded] = useState(true);

  useEffect(() => {
    loadCheques();
    loadChequeAlerts();
  }, [filterStatus]);

  const loadCheques = async () => {
    try {
      setLoading(true);
      const allCheques = await paymentsAPI.getAllCheques(filterStatus);
      setCheques(Array.isArray(allCheques) ? allCheques : []);
    } catch (error) {
      console.error('Failed to load cheques:', error);
      setCheques([]);
      alert('Failed to load cheques');
    } finally {
      setLoading(false);
    }
  };

  const loadChequeAlerts = async () => {
    try {
      const alerts = await paymentsAPI.getChequeAlerts();
      setChequeAlerts(Array.isArray(alerts) ? alerts : []);
    } catch (error) {
      console.error('Failed to load cheque alerts:', error);
      setChequeAlerts([]);
    }
  };

  const handleStatusUpdate = async (chequeId: string, status: string) => {
    try {
      await paymentsAPI.updateChequeStatus(chequeId, status);
      loadCheques();
      loadChequeAlerts();
    } catch (error) {
      console.error('Failed to update cheque status:', error);
      alert('Failed to update cheque status');
    }
  };

  const safeCheques = Array.isArray(cheques) ? cheques : [];

  // Calculate expiry status for each cheque
  const getExpiryStatus = (returnDate: string | null | undefined) => {
    if (!returnDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(returnDate);
    expiry.setHours(0, 0, 0, 0);
    
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { status: 'expired', days: Math.abs(diffDays), color: 'bg-red-100 text-red-700', textColor: 'text-red-600' };
    } else if (diffDays === 0) {
      return { status: 'today', days: 0, color: 'bg-red-100 text-red-700', textColor: 'text-red-600' };
    } else if (diffDays <= 2) {
      return { status: 'soon', days: diffDays, color: 'bg-amber-100 text-amber-700', textColor: 'text-amber-600' };
    } else if (diffDays <= 7) {
      return { status: 'upcoming', days: diffDays, color: 'bg-yellow-100 text-yellow-700', textColor: 'text-yellow-600' };
    }
    return { status: 'ok', days: diffDays, color: 'bg-green-100 text-green-700', textColor: 'text-green-600' };
  };

  // Filtered cheques
  const filteredCheques = useMemo(() => {
    let result = safeCheques;
    
    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter(c => c.chequeStatus === filterStatus);
    }
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.chequeNumber?.toLowerCase().includes(search) ||
        c.chequeBank?.toLowerCase().includes(search) ||
        c.shopName?.toLowerCase().includes(search) ||
        c.salespersonName?.toLowerCase().includes(search)
      );
    }
    
    return result;
  }, [safeCheques, filterStatus, searchTerm]);

  // Expired cheques
  const expiredCheques = useMemo(() => {
    return safeCheques.filter(c => {
      if (c.chequeStatus !== 'pending' || !c.returnDate) return false;
      const expiry = getExpiryStatus(c.returnDate);
      return expiry && (expiry.status === 'expired' || expiry.status === 'today');
    });
  }, [safeCheques]);

  // Expiring soon cheques
  const expiringSoonCheques = useMemo(() => {
    return safeCheques.filter(c => {
      if (c.chequeStatus !== 'pending' || !c.returnDate) return false;
      const expiry = getExpiryStatus(c.returnDate);
      return expiry && (expiry.status === 'soon' || expiry.status === 'upcoming');
    });
  }, [safeCheques]);

  // Calculate totals
  const totalPendingAmount = useMemo(() => {
    return safeCheques
      .filter(c => !c.chequeStatus || c.chequeStatus === 'pending')
      .reduce((sum, c) => sum + (c.amount || 0), 0);
  }, [safeCheques]);

  const totalClearedAmount = useMemo(() => {
    return safeCheques
      .filter(c => c.chequeStatus === 'cleared')
      .reduce((sum, c) => sum + (c.amount || 0), 0);
  }, [safeCheques]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600 font-medium">Loading cheques...</p>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'cleared':
        return <CheckCircleIcon className="w-4 h-4 text-green-600" />;
      case 'bounced':
        return <XCircleIcon className="w-4 h-4 text-red-600" />;
      case 'cancelled':
        return <XCircleIcon className="w-4 h-4 text-gray-600" />;
      default:
        return <ClockIcon className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'cleared':
        return 'bg-green-100 text-green-700';
      case 'bounced':
        return 'bg-red-100 text-red-700';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  const alertCount = expiredCheques.length + expiringSoonCheques.length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          title="Total Cheques"
          value={safeCheques.length}
          icon={DocumentTextIcon}
          color="bg-gradient-to-br from-primary-500 to-primary-600"
        />
        <StatCard
          title="Pending"
          value={safeCheques.filter(c => !c.chequeStatus || c.chequeStatus === 'pending').length}
          icon={ClockIcon}
          color="bg-gradient-to-br from-amber-500 to-amber-600"
          subtitle={`Rs. ${totalPendingAmount.toLocaleString()}`}
        />
        <StatCard
          title="Collected"
          value={safeCheques.filter(c => c.chequeStatus === 'cleared').length}
          icon={CheckCircleIcon}
          color="bg-gradient-to-br from-emerald-500 to-emerald-600"
          subtitle={`Rs. ${totalClearedAmount.toLocaleString()}`}
        />
        <StatCard
          title="Bounced"
          value={safeCheques.filter(c => c.chequeStatus === 'bounced').length}
          icon={XCircleIcon}
          color="bg-gradient-to-br from-red-500 to-red-600"
        />
        <StatCard
          title="Needs Attention"
          value={alertCount}
          icon={ExclamationTriangleIcon}
          color={alertCount > 0 ? "bg-gradient-to-br from-orange-500 to-red-500" : "bg-gradient-to-br from-gray-400 to-gray-500"}
        />
      </div>

      {/* Alerts Section */}
      {alertCount > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <button
            onClick={() => setShowAlertsExpanded(!showAlertsExpanded)}
            className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-red-50 to-amber-50 hover:from-red-100 hover:to-amber-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-full">
                <BellAlertIcon className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-gray-900">
                  {expiredCheques.length > 0 && `${expiredCheques.length} Expired`}
                  {expiredCheques.length > 0 && expiringSoonCheques.length > 0 && ' • '}
                  {expiringSoonCheques.length > 0 && `${expiringSoonCheques.length} Expiring Soon`}
                </h3>
                <p className="text-sm text-gray-600">Click to {showAlertsExpanded ? 'collapse' : 'expand'} alerts</p>
              </div>
            </div>
            <div className={`transform transition-transform ${showAlertsExpanded ? 'rotate-180' : ''}`}>
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          
          {showAlertsExpanded && (
            <div className="p-4 space-y-4">
              {/* Expired Cheques */}
              {expiredCheques.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    Expired Cheques - Immediate Action Required
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {expiredCheques.map((cheque) => {
                      const expiry = getExpiryStatus(cheque.returnDate);
                      return (
                        <div key={cheque.id} className="bg-red-50 rounded-lg p-4 border border-red-200">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-bold text-gray-900">{cheque.chequeNumber}</p>
                              <p className="text-sm text-gray-600">{cheque.shopName || 'Unknown'}</p>
                            </div>
                            <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded-full font-medium">
                              {expiry?.status === 'today' ? 'Today!' : `${expiry?.days}d overdue`}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-lg font-bold text-gray-900">Rs. {cheque.amount?.toLocaleString()}</span>
                            <span className="text-xs text-gray-500">{cheque.chequeBank}</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStatusUpdate(cheque.id, 'cleared')}
                              className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium"
                            >
                              Cleared
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(cheque.id, 'bounced')}
                              className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                              Bounced
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Expiring Soon */}
              {expiringSoonCheques.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
                    <ClockIcon className="w-4 h-4" />
                    Expiring Within 7 Days
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {expiringSoonCheques.map((cheque) => {
                      const expiry = getExpiryStatus(cheque.returnDate);
                      return (
                        <div key={cheque.id} className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-gray-900 text-sm">{cheque.chequeNumber}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${expiry?.color}`}>
                              {expiry?.days === 1 ? 'Tomorrow' : `${expiry?.days}d`}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mb-1">{cheque.shopName || 'Unknown'}</p>
                          <p className="font-bold text-gray-900">Rs. {cheque.amount?.toLocaleString()}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by cheque number, bank, shop, or salesperson..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="cleared">Collected</option>
              <option value="bounced">Bounced</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cheques Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Cheque Info</th>
                <th className="text-left px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Shop</th>
                <th className="text-left px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Return Date</th>
                <th className="text-right px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                <th className="text-center px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="text-center px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCheques.map((cheque) => {
                const expiry = getExpiryStatus(cheque.returnDate);
                const isExpired = cheque.chequeStatus === 'pending' && expiry && (expiry.status === 'expired' || expiry.status === 'today');
                const isExpiringSoon = cheque.chequeStatus === 'pending' && expiry && (expiry.status === 'soon' || expiry.status === 'upcoming');
                
                return (
                  <tr 
                    key={cheque.id} 
                    className={`hover:bg-gray-50 transition-colors ${isExpired ? 'bg-red-50/50' : isExpiringSoon ? 'bg-amber-50/50' : ''}`}
                  >
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{cheque.chequeNumber || '-'}</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <BuildingOffice2Icon className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs text-gray-500">{cheque.chequeBank || 'Unknown Bank'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {new Date(cheque.chequeDate || cheque.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{cheque.shopName || '-'}</span>
                        {cheque.salespersonName ? (
                          <div className="flex items-center gap-1.5 mt-1">
                            <DevicePhoneMobileIcon className="w-3.5 h-3.5 text-green-500" />
                            <span className="text-xs text-gray-500">{cheque.salespersonName}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 mt-1">
                            <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs text-gray-500">Admin</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {cheque.returnDate ? (
                        <div className="flex flex-col">
                          <span className={`font-medium ${isExpired || isExpiringSoon ? expiry?.textColor : 'text-gray-900'}`}>
                            {new Date(cheque.returnDate).toLocaleDateString()}
                          </span>
                          {cheque.chequeStatus === 'pending' && expiry && expiry.status !== 'ok' && (
                            <span className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block w-fit font-medium ${expiry.color}`}>
                              {expiry.status === 'expired' ? `${expiry.days}d overdue` : 
                               expiry.status === 'today' ? 'Due Today!' :
                               `${expiry.days}d left`}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-lg font-bold text-gray-900">
                        Rs. {cheque.amount?.toLocaleString() || '0'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusColor(cheque.chequeStatus)}`}>
                        {getStatusIcon(cheque.chequeStatus)}
                        {cheque.chequeStatus === 'cleared' ? 'Collected' : (cheque.chequeStatus || 'Pending')}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center gap-1">
                        {cheque.chequeStatus !== 'cleared' && (
                          <button
                            onClick={() => handleStatusUpdate(cheque.id, 'cleared')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Mark as Collected"
                          >
                            <CheckCircleIcon className="w-5 h-5" />
                          </button>
                        )}
                        {cheque.chequeStatus === 'cleared' && (
                          <button
                            onClick={() => handleStatusUpdate(cheque.id, 'pending')}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Mark as Pending"
                          >
                            <ClockIcon className="w-5 h-5" />
                          </button>
                        )}
                        {cheque.chequeStatus !== 'bounced' && (
                          <button
                            onClick={() => handleStatusUpdate(cheque.id, 'bounced')}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Mark as Bounced"
                          >
                            <XCircleIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredCheques.length === 0 && (
            <div className="text-center py-16">
              <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">No cheques found</p>
              <p className="text-gray-400 text-sm mt-2">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Cheques from sales will appear here'}
              </p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        {filteredCheques.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold">{filteredCheques.length}</span> of <span className="font-semibold">{safeCheques.length}</span> cheques
            </p>
            <p className="text-sm text-gray-600">
              Total: <span className="font-semibold">Rs. {filteredCheques.reduce((sum, c) => sum + (c.amount || 0), 0).toLocaleString()}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
