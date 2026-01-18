import { useState, useEffect } from 'react';
import { buyerAPI } from '../../services/buyerAPI';
import { salesAPI } from '../../services/salesAPI';
import { returnsAPI } from '../../services/returnsAPI';
import type { Buyer, CreateBuyerData } from '../../types';
import { Plus, Edit, Trash2, Store, Phone, MapPin, X } from 'lucide-react';
import { formatCurrencySimple } from '../../utils/currency';

interface ShopItem {
  productId: string;
  productName: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  returns: number;
  freeItems: number;
}

export const Buyers = () => {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showShopDetailsModal, setShowShopDetailsModal] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Buyer | null>(null);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [loadingShopDetails, setLoadingShopDetails] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState<Buyer | null>(null);
  const [formData, setFormData] = useState<CreateBuyerData>({
    shopName: '',
    contact: '',
    address: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadBuyers();
    // Refresh data when window gains focus (for synchronization)
    const handleFocus = () => {
      loadBuyers();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const loadBuyers = async () => {
    try {
      setLoading(true);
      const data = await buyerAPI.getAll();
      setBuyers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load buyers:', error);
      setBuyers([]);
      alert('Failed to load buyers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBuyer) {
        await buyerAPI.update(editingBuyer.id, formData);
        alert('Shop updated successfully!');
      } else {
        await buyerAPI.create(formData);
        alert('Shop created successfully!');
      }
      setShowModal(false);
      setEditingBuyer(null);
      setFormData({ shopName: '', contact: '', address: '' });
      loadBuyers();
    } catch (error: any) {
      console.error('Failed to save buyer:', error);
      alert(error.response?.data?.message || 'Failed to save shop');
    }
  };

  const handleEdit = (buyer: Buyer) => {
    setEditingBuyer(buyer);
    setFormData({
      shopName: buyer.shopName || '',
      contact: buyer.contact || '',
      address: buyer.address || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string, shopName: string) => {
    if (!confirm(`Are you sure you want to delete "${shopName}"? This action cannot be undone.`)) return;
    try {
      await buyerAPI.delete(id);
      alert('Shop deleted successfully!');
      loadBuyers();
    } catch (error: any) {
      console.error('Failed to delete buyer:', error);
      alert(error.response?.data?.message || 'Failed to delete shop');
    }
  };

  const handleShopClick = async (buyer: Buyer, e: React.MouseEvent) => {
    // Don't trigger if clicking on action buttons
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    
    setSelectedShop(buyer);
    setShowShopDetailsModal(true);
    await loadShopDetails(buyer.id);
  };

  const loadShopDetails = async (buyerId: string) => {
    setLoadingShopDetails(true);
    try {
      // Fetch all sales for this buyer
      const sales = await salesAPI.getAll({ buyerId });
      
      // Fetch all returns to calculate returns per product
      const allReturns = await returnsAPI.getAll();
      
      // Get sale IDs for this buyer
      const saleIds = sales.map(sale => sale.id);
      
      // Filter returns for this buyer's sales
      const buyerReturns = allReturns.filter(ret => 
        ret.originalSaleId && saleIds.includes(ret.originalSaleId)
      );
      
      // Aggregate items by product
      const itemsMap = new Map<string, ShopItem>();
      
      // Process sales items
      sales.forEach(sale => {
        sale.items?.forEach(item => {
          const productId = item.productId || '';
          const productName = item.productName || 'Unknown Product';
          const quantity = item.quantity || 0;
          const price = item.price || item.unitPrice || 0;
          const totalPrice = quantity * price;
          
          if (!itemsMap.has(productId)) {
            itemsMap.set(productId, {
              productId,
              productName,
              quantity: 0,
              pricePerUnit: price,
              totalPrice: 0,
              returns: 0,
              freeItems: 0
            });
          }
          
          const existingItem = itemsMap.get(productId)!;
          existingItem.quantity += quantity;
          existingItem.totalPrice += totalPrice;
          // Update price per unit if different (take average or latest)
          if (price > 0) {
            existingItem.pricePerUnit = price;
          }
        });
      });
      
      // Process returns
      buyerReturns.forEach(ret => {
        ret.items?.forEach(returnItem => {
          const productId = returnItem.inventoryItemId || '';
          const returnQuantity = returnItem.quantity || 0;
          
          if (itemsMap.has(productId)) {
            const existingItem = itemsMap.get(productId)!;
            existingItem.returns += returnQuantity;
          }
        });
      });
      
      setShopItems(Array.from(itemsMap.values()));
    } catch (error) {
      console.error('Failed to load shop details:', error);
      alert('Failed to load shop details');
      setShopItems([]);
    } finally {
      setLoadingShopDetails(false);
    }
  };

  const calculateSubtotal = () => {
    return shopItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const filteredBuyers = buyers.filter(buyer =>
    buyer.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (buyer.address && buyer.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (buyer.contact && buyer.contact.includes(searchTerm))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading shops...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Shops Management</h1>
        <button
          onClick={() => {
            setEditingBuyer(null);
            setFormData({ shopName: '', contact: '', address: '' });
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Shop
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search shops by name, address, or contact..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <Store className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        </div>
      </div>

      {/* Buyers List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredBuyers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Shop Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBuyers.map((buyer) => (
                  <tr 
                    key={buyer.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={(e) => handleShopClick(buyer, e)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Store className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">{buyer.shopName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {buyer.contact ? (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="w-4 h-4 mr-2" />
                          {buyer.contact}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {buyer.address ? (
                        <div className="flex items-start text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="break-words">{buyer.address}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        buyer.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {buyer.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(buyer)}
                          className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(buyer.id, buyer.shopName)}
                          className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {searchTerm ? 'No shops found matching your search' : 'No shops added yet'}
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
              setEditingBuyer(null);
              setFormData({ shopName: '', contact: '', address: '' });
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingBuyer ? 'Edit Shop' : 'Add New Shop'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shop Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.shopName}
                  onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter shop name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Number
                </label>
                <input
                  type="text"
                  value={formData.contact || ''}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter contact number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter address"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingBuyer(null);
                    setFormData({ shopName: '', contact: '', address: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  {editingBuyer ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shop Details Modal */}
      {showShopDetailsModal && selectedShop && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowShopDetailsModal(false);
              setSelectedShop(null);
              setShopItems([]);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{selectedShop.shopName}</h2>
                {selectedShop.address && (
                  <p className="text-sm text-gray-600 mt-1">{selectedShop.address}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowShopDetailsModal(false);
                  setSelectedShop(null);
                  setShopItems([]);
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              {loadingShopDetails ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">Loading shop details...</div>
                </div>
              ) : shopItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Item Name</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Quantity</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Price per Unit</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Price</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Returns</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Free Item Issue</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {shopItems.map((item) => (
                        <tr key={item.productId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{item.productName}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrencySimple(item.pricePerUnit)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrencySimple(item.totalPrice)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{item.returns || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{item.freeItems || '-'}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-semibold">
                        <td colSpan={3} className="px-4 py-3 text-sm text-gray-900">Subtotal</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrencySimple(calculateSubtotal())}</td>
                        <td colSpan={2} className="px-4 py-3"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No items found for this shop</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

