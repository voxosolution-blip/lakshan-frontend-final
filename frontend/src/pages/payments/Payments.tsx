import { useState, useEffect } from 'react';
import { paymentsAPI, type Payment, type CreatePaymentData } from '../../services/paymentsAPI';
import { salesAPI, type Sale } from '../../services/salesAPI';
import { Plus, Edit, Trash2, DollarSign, Calendar, Store, ChevronDown, ChevronUp } from 'lucide-react';

interface ShopWisePayment {
  shopId: string;
  shopName: string;
  contact: string;
  address: string;
  paymentStatus: string;
  totalPendingCash: number;
  totalPendingCheque: number;
  sales: Array<{
    saleId: string;
    saleDate: string;
    totalAmount: number;
    paymentStatus: string;
    paidCash: number;
    paidChequeCleared: number;
    pendingCash: number;
    pendingCheque: number;
    remainingAmount: number;
    payments: Array<{
      paymentId: string;
      paymentDate: string;
      cashAmount: number;
      chequeAmount: number;
      totalAmount: number;
      chequeNumber?: string;
      chequeBank?: string;
      chequeStatus?: string;
      chequeExpiryDate?: string;
      notes?: string;
      createdAt: string;
    }>;
  }>;
}

export const Payments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [shopWisePayments, setShopWisePayments] = useState<ShopWisePayment[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'shop-wise'>('shop-wise');
  const [expandedShops, setExpandedShops] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [formData, setFormData] = useState<CreatePaymentData>({
    saleId: '',
    amount: 0,
    paymentMethod: 'cash',
    cashAmount: 0,
    chequeAmount: 0
  });

  useEffect(() => {
    loadPayments();
    loadShopWisePayments();
    loadSales();
    
    // Refresh data when window gains focus (for synchronization when cheque status is updated)
    const handleFocus = () => {
      loadPayments();
      loadShopWisePayments();
      loadSales();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const loadShopWisePayments = async () => {
    try {
      const data = await paymentsAPI.getShopWisePaymentHistory();
      setShopWisePayments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load shop-wise payments:', error);
      setShopWisePayments([]);
    }
  };

  const toggleShopExpansion = (shopId: string) => {
    const newExpanded = new Set(expandedShops);
    if (newExpanded.has(shopId)) {
      newExpanded.delete(shopId);
    } else {
      newExpanded.add(shopId);
    }
    setExpandedShops(newExpanded);
  };

  const loadPayments = async () => {
    try {
      setLoading(true);
      const data = await paymentsAPI.getAll();
      setPayments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load payments:', error);
      setPayments([]);
      alert('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const loadSales = async () => {
    try {
      const data = await salesAPI.getAll();
      setSales(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load sales:', error);
      setSales([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.saleId) {
      alert('Please select a sale');
      return;
    }

    // Validate based on payment method
    if (formData.paymentMethod === 'cash') {
      if (!formData.amount || formData.amount <= 0) {
        alert('Please enter a valid cash amount');
        return;
      }
    } else if (formData.paymentMethod === 'cheque') {
      if (!formData.amount || formData.amount <= 0) {
        alert('Please enter a valid cheque amount');
        return;
      }
      if (!formData.chequeNumber) {
        alert('Please enter cheque number');
        return;
      }
    } else if (formData.paymentMethod === 'split') {
      const cash = formData.cashAmount || 0;
      const cheque = formData.chequeAmount || 0;
      if (cash <= 0 && cheque <= 0) {
        alert('Please enter at least one payment amount (cash or cheque)');
        return;
      }
      if (cheque > 0 && !formData.chequeNumber) {
        alert('Please enter cheque number for cheque payment');
        return;
      }
    } else if (formData.paymentMethod === 'ongoing') {
      // Ongoing payments can be 0, so no validation needed for amount
      // But validate that amount is not negative
      const paymentAmt = parseFloat(String(formData.amount || 0)) || parseFloat(String(formData.cashAmount || 0)) || 0;
      if (paymentAmt < 0) {
        alert('Payment amount cannot be negative');
        return;
      }
    }

    try {
      // Prepare data to send based on payment method
      const dataToSend: CreatePaymentData = {
        saleId: formData.saleId,
        paymentMethod: formData.paymentMethod,
        cashAmount: formData.cashAmount,
        chequeAmount: formData.chequeAmount,
        amount: formData.amount,
        chequeNumber: formData.chequeNumber,
        chequeBank: formData.chequeBank,
        expiryDate: formData.expiryDate || formData.returnDate,
        chequeStatus: formData.chequeStatus,
        shopName: formData.shopName,
        notes: formData.notes
      };

      if (selectedPayment) {
        await paymentsAPI.update(selectedPayment.id, dataToSend);
      } else {
        await paymentsAPI.create(dataToSend);
      }
      setShowModal(false);
      setSelectedPayment(null);
      setFormData({ saleId: '', amount: 0, paymentMethod: 'cash', cashAmount: 0, chequeAmount: 0 });
      loadPayments();
      loadShopWisePayments();
    } catch (error: any) {
      console.error('Failed to save payment:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save payment';
      alert(errorMessage);
    }
  };

  const handleEdit = (payment: Payment) => {
    setSelectedPayment(payment);
    setFormData({
      saleId: payment.saleId,
      amount: payment.amount,
      cashAmount: payment.cashAmount || 0,
      chequeAmount: payment.chequeAmount || 0,
      paymentMethod: payment.paymentMethod,
      chequeNumber: payment.chequeNumber,
      chequeBank: payment.chequeBank,
      shopName: payment.shopName,
      returnDate: payment.returnDate,
      expiryDate: payment.expiryDate || payment.returnDate,
      chequeStatus: payment.chequeStatus,
      notes: payment.notes
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;
    try {
      await paymentsAPI.delete(id);
      loadPayments();
      loadShopWisePayments();
    } catch (error: any) {
      console.error('Failed to delete payment:', error);
      alert(error.response?.data?.message || 'Failed to delete payment');
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'paid': 'bg-green-100 text-green-800',
      'cash': 'bg-yellow-100 text-yellow-800',
      'cheque': 'bg-orange-100 text-orange-800',
      'cash + cheque': 'bg-red-100 text-red-800',
      'pending': 'bg-gray-100 text-gray-800',
      'partial': 'bg-blue-100 text-blue-800'
    };

    const statusLabels: Record<string, string> = {
      'paid': 'Paid',
      'cash': 'Pending Cash',
      'cheque': 'Pending Cheque',
      'cash + cheque': 'Pending Both',
      'pending': 'Pending',
      'partial': 'Partial'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[status] || statusColors.pending}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading payments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('shop-wise')}
            className={`px-4 py-2 font-medium text-sm rounded-md transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'shop-wise'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Store className="w-4 h-4" />
            Pending Payments
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 font-medium text-sm rounded-md transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            All Payments
          </button>
        </div>

        <button
          onClick={() => {
            setSelectedPayment(null);
            setFormData({ saleId: '', amount: 0, paymentMethod: 'cash', cashAmount: 0, chequeAmount: 0 });
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2 shadow-sm hover:shadow-md transition-shadow"
        >
          <Plus className="w-4 h-4" />
          New Payment
        </button>
      </div>

      {/* Shop-Wise Payments View */}
      {activeTab === 'shop-wise' && (
        <div className="space-y-3">
          {shopWisePayments.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 text-center py-16">
              <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">No pending payments</p>
              <p className="text-gray-400 text-sm mt-1">All shops are up to date</p>
            </div>
          ) : (
            shopWisePayments
              .filter(shop => shop.totalPendingCash > 0 || shop.totalPendingCheque > 0)
              .map((shop) => {
                const totalPending = shop.totalPendingCash + shop.totalPendingCheque;
                return (
                  <div 
                    key={shop.shopId} 
                    className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden"
                  >
                    <div
                      className="p-5 cursor-pointer"
                      onClick={() => toggleShopExpansion(shop.shopId)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <Store className="w-5 h-5 text-blue-600 flex-shrink-0" />
                            <h3 className="text-lg font-bold text-gray-900 truncate">{shop.shopName}</h3>
                            {getPaymentStatusBadge(shop.paymentStatus)}
                          </div>
                          
                          {(shop.contact || shop.address) && (
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mb-3">
                              {shop.contact && <span>{shop.contact}</span>}
                              {shop.address && <span className="truncate">{shop.address}</span>}
                            </div>
                          )}

                          <div className="flex items-center gap-4">
                            {shop.totalPendingCash > 0 && (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                <span className="text-sm text-gray-600">Cash:</span>
                                <span className="text-sm font-bold text-yellow-600">
                                  Rs. {shop.totalPendingCash.toFixed(2)}
                                </span>
                              </div>
                            )}
                            {shop.totalPendingCheque > 0 && (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                <span className="text-sm text-gray-600">Cheque:</span>
                                <span className="text-sm font-bold text-orange-600">
                                  Rs. {shop.totalPendingCheque.toFixed(2)}
                                </span>
                              </div>
                            )}
                            <div className="ml-auto flex items-center gap-1">
                              <span className="text-base font-bold text-gray-900">
                                Rs. {totalPending.toFixed(2)}
                              </span>
                              <span className="text-xs text-gray-500">total pending</span>
                            </div>
                          </div>
                        </div>
                        
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
                          {expandedShops.has(shop.shopId) ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    {expandedShops.has(shop.shopId) && (
                      <div className="border-t border-gray-200 bg-gray-50">
                        <div className="p-5 space-y-3">
                          {shop.sales && shop.sales.length > 0 ? (
                            shop.sales
                              .filter(sale => sale.pendingCash > 0 || sale.pendingCheque > 0)
                              .map((sale) => {
                                const salePending = sale.pendingCash + sale.pendingCheque;
                                return (
                                  <div key={sale.saleId} className="bg-white rounded-lg p-4 border border-gray-200">
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-xs font-medium text-gray-500">
                                            Sale #{sale.saleId.slice(0, 8)}
                                          </span>
                                          <span className="text-xs text-gray-400">•</span>
                                          <span className="text-xs text-gray-500">
                                            {new Date(sale.saleDate).toLocaleDateString()}
                                          </span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                          <span className="text-sm text-gray-600">Total:</span>
                                          <span className="text-base font-bold text-gray-900">
                                            Rs. {sale.totalAmount.toFixed(2)}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        {salePending > 0 && (
                                          <div className="text-right">
                                            <span className="text-xs text-gray-500 block">Pending</span>
                                            <span className="text-sm font-bold text-red-600">
                                              Rs. {salePending.toFixed(2)}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                                      <div>
                                        <div className="text-xs text-gray-500 mb-1">Paid</div>
                                        <div className="text-sm font-semibold text-green-600">
                                          Rs. {(sale.paidCash + sale.paidChequeCleared).toFixed(2)}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-xs text-gray-500 mb-1">Status</div>
                                        {getPaymentStatusBadge(sale.paymentStatus)}
                                      </div>
                                    </div>

                                    {sale.payments && sale.payments.length > 0 && (
                                      <details className="mt-3">
                                        <summary className="text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-900">
                                          View {sale.payments.length} payment{sale.payments.length > 1 ? 's' : ''}
                                        </summary>
                                        <div className="mt-2 space-y-2 pl-2 border-l-2 border-gray-200">
                                          {sale.payments.map((payment) => (
                                            <div key={payment.paymentId} className="pt-2">
                                              <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                  <div className="text-xs text-gray-500">
                                                    {new Date(payment.paymentDate || payment.createdAt).toLocaleDateString()}
                                                  </div>
                                                  <div className="text-sm font-semibold text-gray-900 mt-0.5">
                                                    Rs. {payment.totalAmount.toFixed(2)}
                                                  </div>
                                                  <div className="flex gap-2 mt-1">
                                                    {payment.cashAmount > 0 && (
                                                      <span className="text-xs text-gray-600">
                                                        Cash: Rs. {payment.cashAmount.toFixed(2)}
                                                      </span>
                                                    )}
                                                    {payment.chequeAmount > 0 && (
                                                      <span className="text-xs text-gray-600">
                                                        Cheque: Rs. {payment.chequeAmount.toFixed(2)}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </details>
                                    )}
                                  </div>
                                );
                              })
                          ) : (
                            <div className="text-center py-6 text-gray-500 text-sm">
                              No pending sales for this shop
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* All Payments View */}
      {activeTab === 'all' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="text-left p-4 font-semibold text-gray-700">Date</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Sale</th>
                  <th className="text-right p-4 font-semibold text-gray-700">Amount</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Method</th>
                  <th className="text-center p-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(payments) && payments.map((payment) => {
                  const isGrouped = payment.id?.startsWith('ongoing-') || false;
                  const paymentCount = (payment as any).paymentCount || 1;
                  
                  return (
                    <tr key={payment.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{payment.sale?.customerName || payment.saleId}</div>
                          {payment.sale && (
                            <div className="text-xs text-gray-500 mt-1">
                              {payment.sale.paymentStatus === 'paid' ? (
                                <span className="text-green-600">✓ Fully Paid</span>
                              ) : payment.sale.paymentStatus === 'partial' ? (
                                <span className="text-yellow-600">
                                  ⚠ Rs. {payment.sale.remainingBalance?.toFixed(2) || '0.00'} remaining
                                </span>
                              ) : (
                                <span className="text-red-600">
                                  ⏳ Rs. {payment.sale.totalAmount?.toFixed(2) || '0.00'} pending
                                </span>
                              )}
                            </div>
                          )}
                          {isGrouped && paymentCount > 1 && (
                            <div className="text-xs text-gray-400 mt-1">
                              ({paymentCount} ongoing payments combined)
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right font-semibold">
                        Rs. {payment.amount.toFixed(2)}
                        {isGrouped && paymentCount > 1 && (
                          <div className="text-xs text-gray-500 font-normal mt-1">
                            Total of {paymentCount} payments
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {payment.paymentMethod === 'split' ? 'Split' : payment.paymentMethod}
                          </span>
                          {payment.paymentMethod === 'split' && (
                            <div className="text-xs text-gray-600">
                              <div>Cash: Rs. {(payment.cashAmount || 0).toFixed(2)}</div>
                              <div>Cheque: Rs. {(payment.chequeAmount || 0).toFixed(2)}</div>
                            </div>
                          )}
                          {payment.paymentMethod === 'ongoing' && (payment.cashAmount || 0) > 0 && (
                            <div className="text-xs text-gray-600">
                              Cash: Rs. {(payment.cashAmount || 0).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          {isGrouped ? (
                            <span className="text-xs text-gray-400 italic">Grouped</span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(payment)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(payment.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {(!Array.isArray(payments) || payments.length === 0) && (
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No payments found</p>
                <p className="text-gray-400 text-sm mt-2">Record your first payment</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <PaymentModal
          formData={formData}
          setFormData={setFormData}
          sales={sales}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowModal(false);
            setSelectedPayment(null);
            setFormData({ saleId: '', amount: 0, paymentMethod: 'cash', cashAmount: 0, chequeAmount: 0 });
          }}
          editing={!!selectedPayment}
        />
      )}
    </div>
  );
};

// Payment Modal Component
const PaymentModal = ({
  formData,
  setFormData,
  sales,
  onSubmit,
  onClose,
  editing
}: {
  formData: CreatePaymentData;
  setFormData: (data: CreatePaymentData) => void;
  sales: Sale[];
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  editing: boolean;
}) => {
  const safeSales = Array.isArray(sales) ? sales : [];
  const selectedSale = safeSales.find(s => s.id === formData.saleId);
  
  // Calculate remaining balance for selected sale
  const remainingAmount = selectedSale ? (() => {
    // Try to get payments for this sale if available
    // For now, we'll show the total amount and the user can check remaining balance
    return selectedSale.totalAmount;
  })() : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-xl">
        <h2 className="text-2xl font-bold mb-6">{editing ? 'Edit' : 'New'} Payment</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Sale *</label>
            <select
              required
              value={formData.saleId}
              onChange={(e) => setFormData({ ...formData, saleId: e.target.value })}
              className="w-full input"
            >
              <option value="">Select Sale</option>
              {safeSales.map((sale) => (
                <option key={sale.id} value={sale.id}>
                  {sale.id} - {sale.customerName || 'N/A'} - Rs. {sale.totalAmount.toFixed(2)}
                </option>
              ))}
            </select>
            {selectedSale && (
              <div className="text-sm text-gray-600 mt-1 space-y-1">
                <p>Total Sale: Rs. {selectedSale.totalAmount.toFixed(2)}</p>
                <p className="text-red-600 font-medium">
                  Status: {selectedSale.paymentStatus === 'paid' ? '✓ Fully Paid' : 
                          selectedSale.paymentStatus === 'partial' ? '⚠ Partially Paid' : 
                          '⏳ Pending'}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Payment Method *</label>
            <select
              required
              value={formData.paymentMethod}
              onChange={(e) => {
                const method = e.target.value;
                setFormData({ 
                  ...formData, 
                  paymentMethod: method,
                  amount: method === 'split' ? 0 : formData.amount,
                  cashAmount: method === 'split' ? formData.cashAmount || 0 : 0,
                  chequeAmount: method === 'split' ? formData.chequeAmount || 0 : 0
                });
              }}
              className="w-full input"
            >
              <option value="cash">Full Payment - Cash</option>
              <option value="cheque">Full Payment - Cheque</option>
              <option value="split">Split Payment - Cash + Cheque</option>
              <option value="ongoing">Ongoing Payment (Can be 0 or partial)</option>
            </select>
          </div>

          {formData.paymentMethod === 'cash' && (
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Cash Amount *</label>
              <input
                type="number"
                step="0.01"
                required
                min="0"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full input"
                placeholder="0.00"
              />
              {remainingAmount > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Remaining balance: Rs. {remainingAmount.toFixed(2)}
                </p>
              )}
            </div>
          )}

          {formData.paymentMethod === 'cheque' && (
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Cheque Amount *</label>
              <input
                type="number"
                step="0.01"
                required
                min="0"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full input"
                placeholder="0.00"
              />
              {remainingAmount > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Remaining balance: Rs. {remainingAmount.toFixed(2)}
                </p>
              )}
            </div>
          )}

          {formData.paymentMethod === 'split' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Cash Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cashAmount || ''}
                    onChange={(e) => setFormData({ ...formData, cashAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full input"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Cheque Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.chequeAmount || ''}
                    onChange={(e) => setFormData({ ...formData, chequeAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full input"
                    placeholder="0.00"
                  />
                </div>
                {(formData.cashAmount || 0) + (formData.chequeAmount || 0) > 0 && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">
                      Total Payment: Rs. {((formData.cashAmount || 0) + (formData.chequeAmount || 0)).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>

              {/* Cheque Details for Split Payment */}
              {(formData.chequeAmount || 0) > 0 && (
                <>
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium text-gray-700 mb-3">Cheque Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">Cheque Number *</label>
                        <input
                          type="text"
                          required
                          value={formData.chequeNumber || ''}
                          onChange={(e) => setFormData({ ...formData, chequeNumber: e.target.value })}
                          className="w-full input"
                          placeholder="Cheque number"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">Bank</label>
                        <input
                          type="text"
                          value={formData.chequeBank || ''}
                          onChange={(e) => setFormData({ ...formData, chequeBank: e.target.value })}
                          className="w-full input"
                          placeholder="Bank name"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">Shop Name</label>
                        <input
                          type="text"
                          value={formData.shopName || ''}
                          onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                          className="w-full input"
                          placeholder="Shop name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">Cheque Expiry Date *</label>
                        <input
                          type="date"
                          required
                          value={formData.expiryDate || formData.returnDate || ''}
                          onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value, returnDate: e.target.value })}
                          className="w-full input"
                        />
                        <p className="text-xs text-gray-500 mt-1">Alert will be shown 2 days before expiry</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium mb-2 text-gray-700">Cheque Status</label>
                      <select
                        value={formData.chequeStatus || 'pending'}
                        onChange={(e) => setFormData({ ...formData, chequeStatus: e.target.value })}
                        className="w-full input"
                      >
                        <option value="pending">Pending</option>
                        <option value="cleared">Collected/Cleared</option>
                        <option value="bounced">Bounced</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {formData.paymentMethod === 'ongoing' && (
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Cash Amount (Can be 0)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount || formData.cashAmount || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  amount: parseFloat(e.target.value) || 0,
                  cashAmount: parseFloat(e.target.value) || 0
                })}
                className="w-full input"
                placeholder="0.00 (Enter 0 for no payment now)"
              />
              {remainingAmount > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Remaining balance: Rs. {remainingAmount.toFixed(2)}
                </p>
              )}
              <p className="text-xs text-blue-600 mt-1">
                💡 Tip: Enter 0 to mark as ongoing payment without any payment now. Buyer can settle later.
              </p>
            </div>
          )}

          {formData.paymentMethod === 'cheque' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Cheque Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.chequeNumber || ''}
                    onChange={(e) => setFormData({ ...formData, chequeNumber: e.target.value })}
                    className="w-full input"
                    placeholder="Cheque number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Bank</label>
                  <input
                    type="text"
                    value={formData.chequeBank || ''}
                    onChange={(e) => setFormData({ ...formData, chequeBank: e.target.value })}
                    className="w-full input"
                    placeholder="Bank name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Shop Name</label>
                  <input
                    type="text"
                    value={formData.shopName || ''}
                    onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                    className="w-full input"
                    placeholder="Shop name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Cheque Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.expiryDate || formData.returnDate || ''}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value, returnDate: e.target.value })}
                    className="w-full input"
                  />
                  <p className="text-xs text-gray-500 mt-1">Alert will be shown 2 days before expiry</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Cheque Status</label>
                <select
                  value={formData.chequeStatus || 'pending'}
                  onChange={(e) => setFormData({ ...formData, chequeStatus: e.target.value })}
                  className="w-full input"
                >
                  <option value="pending">Pending</option>
                  <option value="cleared">Collected/Cleared</option>
                  <option value="bounced">Bounced</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </>
          )}

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
