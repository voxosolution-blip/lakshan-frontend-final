import { useState, useEffect } from 'react';
import { buyerAPI } from '../../services/buyerAPI';
import { salesAPI, type CreateSaleData, type Sale } from '../../services/salesAPI';
import { returnsAPI } from '../../services/returnsAPI';
import { productionAPI } from '../../services/productionAPI';
import type { Buyer, CreateBuyerData } from '../../types';
import { dashboardAPI } from '../../services/dashboardAPI';
import { paymentsAPI, type CreatePaymentData } from '../../services/paymentsAPI';
import { Plus, MapPin, X, Store, Search, Edit, Trash2, Minus, Save, CreditCard, Clock, DollarSign, ChevronLeft, ChevronRight, ArrowLeft, AlertTriangle, Printer, Navigation } from 'lucide-react';
import { ShopDetailsPage } from './ShopDetailsPage';
import logoImage from '../../assets/Logo.png';
import { ShopMapView } from '../../components/maps/ShopMapView';
import { formatCurrencySimple } from '../../utils/currency';

interface ShopItem {
  productId: string;
  productName: string;
  quantity: number;
  maxQuantity: number;
  pricePerUnit: number;
  inventoryPrice: number; // Original inventory price
  totalPrice: number;
  returns: number;
  freeItems: number;
}

type ViewType = 'dashboard' | 'shop-details';

// Open Google Maps directions
const openGoogleMapsDirections = (
  fromLat: number, 
  fromLng: number, 
  toLat: number, 
  toLng: number,
  shopName?: string
) => {
  const url = `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&travelmode=driving`;
  window.open(url, '_blank');
};

// Calculate distance between two coordinates using Haversine formula (in kilometers)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};


export const SalespersonDashboard = () => {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [shops, setShops] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShopModal, setShowShopModal] = useState(false);
  const [editingShop, setEditingShop] = useState<Buyer | null>(null);
  const [newShop, setNewShop] = useState<CreateBuyerData>({
    shopName: '',
    contact: '',
    address: '',
    latitude: null,
    longitude: null
  });
  const [shopsWithPayments, setShopsWithPayments] = useState<any[]>([]);
  const [sortedShops, setSortedShops] = useState<Array<Buyer & { distance?: number }>>([]);
  const [shopSearchQuery, setShopSearchQuery] = useState<string>('');
  const [showShopDetailsModal, setShowShopDetailsModal] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Buyer | null>(null);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  // Store saved shop items per shop ID to persist across modal closes
  const [savedShopItems, setSavedShopItems] = useState<Map<string, ShopItem[]>>(new Map());
  const [loadingShopDetails, setLoadingShopDetails] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<Array<{ id: string; name: string; price: number }>>([]);
  const [saving, setSaving] = useState(false);
  const [createdSale, setCreatedSale] = useState<Sale | null>(null);
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'cheque' | 'split' | 'ongoing'>('cash');
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [chequeAmount, setChequeAmount] = useState<number>(0);
  const [chequeNumber, setChequeNumber] = useState<string>('');
  const [chequeBank, setChequeBank] = useState<string>('');
  const [chequeExpiryDate, setChequeExpiryDate] = useState<string>('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [ongoingPendingPayments, setOngoingPendingPayments] = useState<any[]>([]);
  const [loadingOngoingPayments, setLoadingOngoingPayments] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [currentPaymentIndex, setCurrentPaymentIndex] = useState<number>(0);
  const [showSettlePaymentModal, setShowSettlePaymentModal] = useState(false);
  const [selectedSaleForSettlement, setSelectedSaleForSettlement] = useState<Sale | null>(null);
  const [loadingSaleDetails, setLoadingSaleDetails] = useState(false);
  const [settlementRemainingAmount, setSettlementRemainingAmount] = useState<number>(0);
  const [settlementPaymentAmount, setSettlementPaymentAmount] = useState<number>(0);
  const [settlementPaymentData, setSettlementPaymentData] = useState<any>(null);
  const [processingSettlementPayment, setProcessingSettlementPayment] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [billLang, setBillLang] = useState<'EN' | 'SI'>('EN');
  const [billData, setBillData] = useState<{
    saleId?: string;
    shopName: string;
    shopAddress: string;
    shopContact: string;
    items: ShopItem[];
    subtotal: number;
    inventoryTotal: number;
    discount: number;
    paymentMethod: string;
    cashAmount: number;
    chequeAmount: number;
    chequeNumber: string;
    chequeBank: string;
    chequeExpiryDate: string;
    amountReceived: number;
    balanceReturn: number;
    pendingAmount: number;
    date: string;
    time: string;
    invoiceNumber: string;
  } | null>(null);
  const [showReversePasswordModal, setShowReversePasswordModal] = useState(false);
  const [reversePassword, setReversePassword] = useState('');
  const [reverseReason, setReverseReason] = useState('');
  const [reversingSale, setReversingSale] = useState(false);

  // Bill Labels for EN/SI
  const BILL_LABELS = {
    EN: {
      title: 'SALES INVOICE',
      billTo: 'Bill To',
      invoiceNo: 'Invoice No',
      date: 'Date',
      time: 'Time',
      item: 'Item',
      qty: 'Qty',
      mrp: 'MRP',
      price: 'Price',
      total: 'Total',
      subtotal: 'Sub Total',
      inventoryTotal: 'MRP Total',
      discount: 'Discount',
      paymentDetails: 'Payment Details',
      paymentMethod: 'Payment Method',
      cash: 'Cash',
      cheque: 'Cheque',
      ongoing: 'Ongoing',
      cashCheque: 'Cash + Cheque',
      cashPaid: 'Cash Paid',
      chequeAmount: 'Cheque Amount',
      chequeNo: 'Cheque No',
      bank: 'Bank',
      expiryDate: 'Expiry Date',
      chequePending: 'Cheque pending clearance',
      amountPaid: 'Amount Paid',
      balanceDue: 'Balance Due',
      partialPayment: 'Partial payment - Balance to be collected',
      totalReceived: 'Total Received',
      outstanding: 'Outstanding Balance',
      yourSavings: 'Your Savings',
      totalDiscount: 'Total Discount',
      thankYou: 'Thank you for your business!',
      goodsNote: 'Goods once sold cannot be returned. Please check items before leaving.',
      free: 'FREE',
      return: 'RTN',
      print: 'Print Bill',
      close: 'Close',
      language: 'සිංහල',
      poweredBy: 'Powered by',
      needSystem: 'Need a system like this for your business? Contact us!',
    },
    SI: {
      title: 'විකුණුම් ඉන්වොයිසිය',
      billTo: 'බිල් කරන්නේ',
      invoiceNo: 'ඉන්වොයිස් අංකය',
      date: 'දිනය',
      time: 'වේලාව',
      item: 'අයිතමය',
      qty: 'ප්‍රමාණය',
      mrp: 'MRP',
      price: 'මිල',
      total: 'එකතුව',
      subtotal: 'උප එකතුව',
      inventoryTotal: 'MRP එකතුව',
      discount: 'වට්ටම',
      paymentDetails: 'ගෙවීම් විස්තර',
      paymentMethod: 'ගෙවීම් ක්‍රමය',
      cash: 'මුදල්',
      cheque: 'චෙක්පත',
      ongoing: 'පවතින',
      cashCheque: 'මුදල් + චෙක්පත',
      cashPaid: 'මුදල් ගෙවීම',
      chequeAmount: 'චෙක්පත මුදල',
      chequeNo: 'චෙක්පත අංකය',
      bank: 'බැංකුව',
      expiryDate: 'කල් ඉකුත් දිනය',
      chequePending: 'චෙක්පත නිෂ්කාශනය බලාපොරොත්තුවෙන්',
      amountPaid: 'ගෙවූ මුදල',
      balanceDue: 'ඉතිරි මුදල',
      partialPayment: 'අර්ධ ගෙවීම - ඉතිරි මුදල එකතු කළ යුතුය',
      totalReceived: 'ලැබුණු මුදල',
      outstanding: 'ඉතිරි ශේෂය',
      yourSavings: 'ඔබේ ඉතිරිකිරීම්',
      totalDiscount: 'මුළු වට්ටම',
      thankYou: 'ඔබේ ව්‍යාපාරයට ස්තුතියි!',
      goodsNote: 'විකුණන ලද භාණ්ඩ ආපසු ගත නොහැක. පිටවීමට පෙර අයිතම පරීක්ෂා කරන්න.',
      free: 'නොමිලේ',
      return: 'ආපසු',
      print: 'බිල මුද්‍රණය',
      close: 'වසන්න',
      language: 'English',
      poweredBy: 'බලගැන්වූයේ',
      needSystem: 'ඔබේ ව්‍යාපාරයට මෙවැනි පද්ධතියක් අවශ්‍යද? අප අමතන්න!',
    }
  };

  // Load ongoing pending payments
  const loadOngoingPendingPayments = async () => {
    try {
      setLoadingOngoingPayments(true);
      const payments = await paymentsAPI.getOngoingPendingPayments();
      setOngoingPendingPayments(Array.isArray(payments) ? payments : []);
    } catch (error) {
      console.error('Failed to load ongoing pending payments:', error);
      setOngoingPendingPayments([]);
    } finally {
      setLoadingOngoingPayments(false);
    }
  };

  // Load shops with payment status
  const loadShopsWithPayments = async () => {
    try {
      const shops = await buyerAPI.getWithPaymentStatus();
      setShopsWithPayments(Array.isArray(shops) ? shops : []);
    } catch (error) {
      console.error('Failed to load shops with payments:', error);
      setShopsWithPayments([]);
    }
  };

  // Sort shops by distance from salesperson location
  useEffect(() => {
    if (location && shops.length > 0) {
      const shopsWithDistance = shops
        .filter(shop => shop.latitude && shop.longitude)
        .map(shop => ({
          ...shop,
          distance: calculateDistance(
            location.lat,
            location.lng,
            shop.latitude!,
            shop.longitude!
          )
        }))
        .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
      
      // Add shops without coordinates at the end
      const shopsWithoutCoords = shops.filter(shop => !shop.latitude || !shop.longitude);
      setSortedShops([...shopsWithDistance, ...shopsWithoutCoords]);
      
      // Set the nearest shop as selected by default (only if no shop is selected)
      if (shopsWithDistance.length > 0 && !selectedShopId) {
        setSelectedShopId(shopsWithDistance[0].id);
      }
    } else {
      // If no location, just use shops as-is
      setSortedShops(shops);
      if (shops.length > 0 && !selectedShopId) {
        setSelectedShopId(shops[0].id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, shops]);

  // Get current shop to display
  const currentShop = sortedShops.find(shop => shop.id === selectedShopId) || sortedShops[0] || null;

  // Request location permission on mount
  useEffect(() => {
    requestLocation();
    loadData();
    loadShopsWithPayments();
    loadOngoingPendingPayments();
    
    // Refresh data when window gains focus (for synchronization when admin edits/deletes shops)
    const handleFocus = () => {
      loadData();
      loadShopsWithPayments();
      loadOngoingPendingPayments();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Auto-set location in shop form when location becomes available and modal is open
  useEffect(() => {
    if (showShopModal && location && (!newShop.latitude || !newShop.longitude)) {
      setNewShop((prev: CreateBuyerData) => ({
        ...prev,
        latitude: location.lat,
        longitude: location.lng
      }));
    }
  }, [location, showShopModal]);



  const requestLocation = () => {
    console.log('Requesting location...');
    
    if (!navigator.geolocation) {
      const errorMsg = 'Geolocation is not supported by your browser';
      setLocationError(errorMsg);
      setLocationLoading(false);
      console.error(errorMsg);
      return;
    }

    // Clear any previous error and set loading state
    setLocationError(null);
    setLocationLoading(true);

    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Location obtained:', position.coords);
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        setLocationError(null);
        setLocationLoading(false);
        
        // Send location to backend
        dashboardAPI.updateLocation(latitude, longitude, position.coords.accuracy)
          .then(() => {
            console.log('Location updated successfully on server');
          })
          .catch(err => {
            console.error('Failed to update location on server:', err);
            // Don't show error to user if location was obtained successfully
          });

        // Clear any existing interval
        if ((window as any).locationUpdateInterval) {
          clearInterval((window as any).locationUpdateInterval);
        }

        // Update location every 30 seconds
        const locationUpdateInterval = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              dashboardAPI.updateLocation(
                pos.coords.latitude,
                pos.coords.longitude,
                pos.coords.accuracy
              ).catch(console.error);
            },
            (err) => {
              console.error('Background location update failed:', err);
              clearInterval(locationUpdateInterval);
            },
            geoOptions
          );
        }, 30000);

        // Store interval ID to clear later if needed
        (window as any).locationUpdateInterval = locationUpdateInterval;
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationLoading(false);
        let errorMessage = 'Please enable location permissions to use this feature';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please click the lock icon (🔒) in your browser address bar, go to Site settings, and allow Location access.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please check your device GPS settings.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage = 'An unknown error occurred while getting location.';
            break;
        }
        
        setLocationError(errorMessage);
      },
      geoOptions
    );
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const buyersResponse = await buyerAPI.getAll().catch((error) => {
        console.error('Error fetching buyers:', error);
          return [];
      });

      // Transform buyer data from snake_case to camelCase
      const transformedShops = Array.isArray(buyersResponse) ? buyersResponse.map((shop: any) => ({
        id: shop.id,
        shopName: shop.shop_name || shop.shopName,
        contact: shop.contact,
        address: shop.address,
        latitude: shop.latitude ? parseFloat(shop.latitude) : null,
        longitude: shop.longitude ? parseFloat(shop.longitude) : null,
        isActive: shop.is_active !== undefined ? shop.is_active : (shop.isActive !== undefined ? shop.isActive : true),
        createdAt: shop.created_at || shop.createdAt,
        updatedAt: shop.updated_at || shop.updatedAt
      })) : [];
      setShops(transformedShops);
      console.log('Loaded shops:', transformedShops.length);
    } catch (error) {
      console.error('Failed to load data:', error);
      setShops([]); // Ensure shops is set to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get values directly from form inputs as fallback (in case state hasn't updated)
    const form = e.currentTarget as HTMLFormElement;
    const shopNameInput = form.querySelector<HTMLInputElement>('#shop-name');
    const phoneInput = form.querySelector<HTMLInputElement>('#shop-phone');
    const addressInput = form.querySelector<HTMLTextAreaElement>('#shop-address');
    
    // Get shop name from input field first, then fallback to state
    const shopNameValue = (shopNameInput?.value || newShop.shopName || '').trim();
    const contactValue = (phoneInput?.value || newShop.contact || '').trim();
    const addressValue = (addressInput?.value || newShop.address || '').trim();
    
    // Validate shop name
    if (!shopNameValue || shopNameValue.length === 0) {
      alert('Shop name is required');
      if (shopNameInput) {
        shopNameInput.focus();
      }
      return;
    }
    
    // Prepare data with current values including GPS coordinates
    const shopData: CreateBuyerData = {
      shopName: shopNameValue,
      contact: contactValue || undefined,
      address: addressValue || undefined,
      latitude: newShop.latitude || (location?.lat ?? null),
      longitude: newShop.longitude || (location?.lng ?? null)
    };
    
    console.log('Creating shop with data:', shopData); // Debug log
    
    try {
      if (editingShop) {
        await buyerAPI.update(editingShop.id, shopData);
      } else {
        await buyerAPI.create(shopData);
      }
      // Reload shops list from API to ensure consistency (includes coordinates)
      const updatedShops = await buyerAPI.getAll();
      setShops(updatedShops);
      setShowShopModal(false);
      setEditingShop(null);
      setNewShop({ shopName: '', contact: '', address: '', latitude: null, longitude: null });
      loadShopsWithPayments(); // Refresh payment data
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || (editingShop ? 'Failed to update shop' : 'Failed to create shop');
      alert(errorMessage);
      console.error('Failed to save shop:', error);
      console.error('Shop data that was sent:', shopData);
    }
  };

  const handleEditShop = (shop: Buyer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingShop(shop);
    setNewShop({
      shopName: shop.shopName || '',
      contact: shop.contact || '',
      address: shop.address || '',
      latitude: shop.latitude || null,
      longitude: shop.longitude || null
    });
    setShowShopModal(true);
  };

  const handleDeleteShop = async (shop: Buyer, e: React.MouseEvent, forceDelete = false) => {
    e.stopPropagation();
    
    if (!forceDelete) {
      if (!confirm(`Are you sure you want to delete "${shop.shopName}"? This action cannot be undone.`)) {
        return;
      }
    }
    
    try {
      const url = forceDelete ? `${shop.id}?force=true` : shop.id;
      await buyerAPI.delete(url);
      // Reload shops using the same logic as initial load
      await loadData();
      loadShopsWithPayments(); // Refresh payment data
    } catch (error: any) {
      // Check if it's asking for confirmation due to associated sales
      if (error.response?.data?.hasAssociatedSales) {
        const salesCount = error.response.data.salesCount;
        if (confirm(`This shop has ${salesCount} sale(s) associated with it. The sales data will be preserved but unlinked from this shop.\n\nDo you want to delete anyway?`)) {
          // Retry with force delete
          handleDeleteShop(shop, e, true);
        }
      } else {
        const errorMessage = error.response?.data?.message || 'Failed to delete shop';
        alert(errorMessage);
        console.error('Failed to delete shop:', error);
      }
    }
  };

  const handleShopClick = async (shop: Buyer, e: React.MouseEvent) => {
    // Don't trigger if clicking on action buttons
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    
    setSelectedShop(shop);
    setShowShopDetailsModal(true);
    await loadShopDetails(shop.id);
  };

  const handleSaveShopItems = async () => {
    if (!selectedShop) return;
    
    // Filter items with quantity > 0
    const itemsToSave = shopItems.filter(item => item.quantity > 0);
    
    if (itemsToSave.length === 0) {
      alert('Please add at least one item with quantity greater than 0');
      return;
    }
    
    // Save shopItems to persist across modal closes
    setSavedShopItems(prev => {
      const newMap = new Map(prev);
      newMap.set(selectedShop.id, shopItems);
      return newMap;
    });
    
    // Just show payment section without creating sale
    // Sale will be created only when payment is processed
    setShowPaymentSection(true);
    // Reset payment fields
    setPaymentMethod('cash');
    const saleTotal = calculateSubtotal();
    setCashAmount(saleTotal);
    setChequeAmount(0);
    setChequeNumber('');
    setChequeBank('');
    setChequeExpiryDate('');
  };

  const loadShopDetails = async (buyerId: string) => {
    setLoadingShopDetails(true);
    try {
      // Check if there are saved items for this shop
      const savedItems = savedShopItems.get(buyerId);
      if (savedItems && savedItems.length > 0) {
        // Restore saved items
        setShopItems(savedItems);
        // Check if payment section was previously shown (if any item has quantity > 0)
        const hasItemsWithQuantity = savedItems.some(item => item.quantity > 0);
        if (hasItemsWithQuantity) {
          setShowPaymentSection(true);
          const saleTotal = savedItems.reduce((sum, item) => 
            sum + (item.quantity || 0) * (item.pricePerUnit || 0), 0);
          setCashAmount(saleTotal);
          setPaymentMethod('cash');
        }
        setLoadingShopDetails(false);
        return;
      }
      
      // Load all available inventory items
      const inventory = await productionAPI.getSalespersonInventory();
      setAvailableProducts(inventory.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price
      })));
      
      // Fetch all sales for this buyer to get existing quantities and prices
      const sales = await salesAPI.getAll({ buyerId });
      
      // Fetch all returns to calculate returns per product
      const allReturns = await returnsAPI.getAll();
      const saleIds = sales.map(sale => sale.id);
      const buyerReturns = allReturns.filter(ret => 
        ret.originalSaleId && saleIds.includes(ret.originalSaleId)
      );
      
      // Create a map of existing sales data
      const salesDataMap = new Map<string, { quantity: number; pricePerUnit: number; returns: number }>();
      
      // Process sales items
      sales.forEach(sale => {
        sale.items?.forEach(item => {
          const productId = item.productId || '';
          const quantity = item.quantity || 0;
          const price = item.price || item.unitPrice || 0;
          
          if (!salesDataMap.has(productId)) {
            salesDataMap.set(productId, {
              quantity: 0,
              pricePerUnit: price || 0,
              returns: 0
            });
          }
          
          const existing = salesDataMap.get(productId)!;
          existing.quantity += quantity;
          if (price > 0) {
            existing.pricePerUnit = price;
          }
        });
      });
      
      // Process returns
      buyerReturns.forEach(ret => {
        ret.items?.forEach(returnItem => {
          const productId = returnItem.inventoryItemId || '';
          const returnQuantity = returnItem.quantity || 0;
          
          if (salesDataMap.has(productId)) {
            salesDataMap.get(productId)!.returns += returnQuantity;
          }
        });
      });
      
      // Create shop items from all inventory items
      const items: ShopItem[] = inventory.map(item => {
        const existingData = salesDataMap.get(item.id);
        const maxQuantity = item.stock || 0; // Maximum available quantity
        const quantity = 0; // Default to 0, salesperson can enter manually
        const inventoryPrice = item.price || 0; // Original inventory price
        const pricePerUnit = existingData?.pricePerUnit || item.price || 0;
        
        return {
          productId: item.id,
          productName: item.name,
          quantity: quantity,
          maxQuantity: maxQuantity,
          pricePerUnit: pricePerUnit,
          inventoryPrice: inventoryPrice,
          totalPrice: quantity * pricePerUnit,
          returns: existingData?.returns || 0,
          freeItems: 0
        };
      });
      
      setShopItems(items);
    } catch (error) {
      console.error('Failed to load shop details:', error);
      alert('Failed to load shop details');
      setShopItems([]);
    } finally {
      setLoadingShopDetails(false);
    }
  };

  const calculateSubtotal = () => {
    return shopItems.reduce((sum, item) => {
      // Only charge for the quantity sold (free items are additional, not subtracted)
      const total = (item.quantity || 0) * (item.pricePerUnit || 0);
      return sum + total;
    }, 0);
  };

  const handleProcessPayment = async () => {
    if (!selectedShop) return;
    
    // Filter items with quantity > 0
    const itemsToSave = shopItems.filter(item => item.quantity > 0);
    
    if (itemsToSave.length === 0) {
      alert('Please add at least one item with quantity greater than 0');
      return;
    }
    
    const saleTotal = calculateSubtotal();
    
    // Determine final amounts based on payment method
    let finalCashAmt = 0;
    let finalChequeAmt = 0;
    
    if (paymentMethod === 'cash') {
      finalCashAmt = saleTotal;
    } else if (paymentMethod === 'cheque') {
      finalChequeAmt = chequeAmount > 0 ? chequeAmount : saleTotal;
      if (finalChequeAmt <= 0) {
        alert('Please enter cheque amount');
      return;
    }
      // Validate cheque details
      if (!chequeNumber || chequeNumber.trim() === '') {
        alert('Please enter cheque number');
      return;
    }
      if (!chequeExpiryDate || chequeExpiryDate.trim() === '') {
        alert('Please enter cheque expiry date');
        return;
      }
    } else if (paymentMethod === 'split') {
      finalCashAmt = cashAmount > 0 ? cashAmount : 0;
      finalChequeAmt = chequeAmount > 0 ? chequeAmount : 0;
      if (finalCashAmt <= 0 && finalChequeAmt <= 0) {
        alert('Please enter at least one payment amount (cash or cheque)');
        return;
      }
      // Validate cheque details if cheque amount > 0
      if (finalChequeAmt > 0) {
        if (!chequeNumber || chequeNumber.trim() === '') {
          alert('Please enter cheque number');
          return;
        }
        if (!chequeExpiryDate || chequeExpiryDate.trim() === '') {
          alert('Please enter cheque expiry date');
          return;
        }
      }
    } else if (paymentMethod === 'ongoing') {
      // Ongoing payments: cash only, amount can be 0 or greater
      finalCashAmt = cashAmount >= 0 ? cashAmount : 0;
      // For ongoing payments with 0 amount, sale will be created but no payment record
      // This validation happens before sale creation, so we just continue
    }
    
    const paymentAmount = finalCashAmt + finalChequeAmt;
    
    // Validate payment amount
    if (paymentMethod !== 'ongoing' && paymentAmount <= 0) {
      alert('Payment amount must be greater than 0');
      return;
    }

    try {
      setProcessingPayment(true);
      
      // Create sale first
      const saleData: CreateSaleData = {
        buyerId: selectedShop.id,
        date: new Date().toISOString().split('T')[0],
        paymentStatus: 'pending',
        items: itemsToSave.map(item => ({
          inventoryItemId: item.productId,
          quantity: item.quantity,
          unitPrice: item.pricePerUnit,
          freeQuantity: item.freeItems || 0
        }))
      };
      
      const newSale = await salesAPI.create(saleData);
      
      // Create return records for items with return quantities > 0
      const itemsWithReturns = shopItems.filter(item => (item.returns || 0) > 0);
      if (itemsWithReturns.length > 0) {
        try {
          await returnsAPI.create({
            originalSaleId: newSale.id,
            date: newSale.date,
            items: itemsWithReturns.map(item => ({
              inventoryItemId: item.productId,
              quantity: item.returns || 0
            }))
          });
        } catch (returnError: any) {
          console.error('Failed to create return records:', returnError);
          // Don't block the payment if return creation fails
        }
      }
      
      // For ongoing payments with 0 amount, no payment record is created
      if (paymentMethod === 'ongoing' && paymentAmount === 0) {
        alert('Sale saved as ongoing. Payment can be processed later.');
        setShowPaymentSection(false);
        // Clear saved items for this shop since payment is processed
        if (selectedShop) {
          setSavedShopItems(prev => {
            const newMap = new Map(prev);
            newMap.delete(selectedShop.id);
            return newMap;
          });
        }
        // Reset shop items and close modal for next sale
        setShopItems([]);
        setShowShopDetailsModal(false);
        setSelectedShop(null);
        // Reload ongoing pending payments
        loadOngoingPendingPayments();
        setCurrentPaymentIndex(0); // Reset to first payment
        return;
      }
      
      // Create payment record
      const paymentData: CreatePaymentData = {
        saleId: newSale.id,
        paymentMethod: paymentMethod,
        amount: paymentAmount,
        cashAmount: finalCashAmt,
        chequeAmount: finalChequeAmt,
        ...(finalChequeAmt > 0 && {
          chequeNumber: chequeNumber,
          chequeBank: chequeBank || undefined,
          expiryDate: chequeExpiryDate
        })
      };

      await paymentsAPI.create(paymentData);
      
      // Calculate inventory total (original prices)
      const inventoryTotal = itemsToSave.reduce((sum, item) => 
        sum + (item.quantity * (item.inventoryPrice || item.pricePerUnit)), 0);
      const subtotal = calculateSubtotal();
      const discount = inventoryTotal - subtotal; // Discount given to shop
      const totalPaid = finalCashAmt + finalChequeAmt;
      const pendingAmount = paymentMethod === 'ongoing' ? (subtotal - totalPaid) : 0;
      
      // Generate bill data before resetting
      const now = new Date();
      const billInfo = {
        saleId: newSale.id,
        shopName: selectedShop?.shopName || '',
        shopAddress: selectedShop?.address || '',
        shopContact: selectedShop?.contact || '',
        items: itemsToSave,
        subtotal: subtotal,
        inventoryTotal: inventoryTotal,
        discount: discount,
        paymentMethod: paymentMethod,
        cashAmount: finalCashAmt,
        chequeAmount: finalChequeAmt,
        chequeNumber: chequeNumber,
        chequeBank: chequeBank,
        chequeExpiryDate: chequeExpiryDate,
        amountReceived: totalPaid,
        balanceReturn: 0, // Can be updated if customer gives more
        pendingAmount: pendingAmount,
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}`
      };
      setBillData(billInfo);
      setShowBillModal(true);
      
      setShowPaymentSection(false);
      // Clear saved items for this shop since payment is processed
      if (selectedShop) {
        setSavedShopItems(prev => {
          const newMap = new Map(prev);
          newMap.delete(selectedShop.id);
          return newMap;
        });
      }
      // Reset shop items and close modal for next sale
      setShopItems([]);
      setShowShopDetailsModal(false);
      setSelectedShop(null);
      // Reload ongoing pending payments
      loadOngoingPendingPayments();
      setCurrentPaymentIndex(0); // Reset to first payment
    } catch (error: any) {
      console.error('Failed to process payment:', error);
      const errorMessage = error.response?.data?.message || 'Failed to process payment';
      alert(errorMessage);
    } finally {
      setProcessingPayment(false);
    }
  };

  const updateItemQuantity = (productId: string, delta: number) => {
    setShopItems(items => {
      const updatedItems = items.map(item => {
        if (item.productId === productId) {
          const currentQuantity = item.quantity || 0;
          const maxQuantity = item.maxQuantity || 0;
          // When increasing (delta > 0), don't exceed maxQuantity
          // When decreasing (delta < 0), don't go below 0
          const newQuantity = delta > 0 
            ? Math.min(maxQuantity, currentQuantity + delta)
            : Math.max(0, currentQuantity + delta);
          return {
            ...item,
            quantity: newQuantity,
            totalPrice: newQuantity * (item.pricePerUnit || 0)
          };
        }
        return item;
      });
      // Also update savedShopItems if a shop is selected
      if (selectedShop) {
        setSavedShopItems(prev => {
          const newMap = new Map(prev);
          newMap.set(selectedShop.id, updatedItems);
          return newMap;
        });
      }
      return updatedItems;
    });
  };

  const updateItemQuantityDirect = (productId: string, newQuantity: number) => {
    setShopItems(items => {
      const updatedItems = items.map(item => {
        if (item.productId === productId) {
          const maxQuantity = item.maxQuantity || 0;
          // Ensure quantity is between 0 and maxQuantity
          const validatedQuantity = Math.max(0, Math.min(maxQuantity, newQuantity));
          return {
            ...item,
            quantity: validatedQuantity,
            totalPrice: validatedQuantity * (item.pricePerUnit || 0)
          };
        }
        return item;
      });
      // Also update savedShopItems if a shop is selected
      if (selectedShop) {
        setSavedShopItems(prev => {
          const newMap = new Map(prev);
          newMap.set(selectedShop.id, updatedItems);
          return newMap;
        });
      }
      return updatedItems;
    });
  };

  const updateItemPrice = (productId: string, newPrice: number) => {
    setShopItems(items => {
      const updatedItems = items.map(item => {
        if (item.productId === productId) {
          const price = Math.max(0, newPrice);
          return {
            ...item,
            pricePerUnit: price,
            totalPrice: (item.quantity || 0) * price
          };
        }
        return item;
      });
      // Also update savedShopItems if a shop is selected
      if (selectedShop) {
        setSavedShopItems(prev => {
          const newMap = new Map(prev);
          newMap.set(selectedShop.id, updatedItems);
          return newMap;
        });
      }
      return updatedItems;
    });
  };

  const updateItemReturn = (productId: string, returnQuantity: number) => {
    setShopItems(items => {
      const updatedItems = items.map(item => {
        if (item.productId === productId) {
          return {
            ...item,
            returns: Math.max(0, returnQuantity)
          };
        }
        return item;
      });
      // Also update savedShopItems if a shop is selected
      if (selectedShop) {
        setSavedShopItems(prev => {
          const newMap = new Map(prev);
          newMap.set(selectedShop.id, updatedItems);
          return newMap;
        });
      }
      return updatedItems;
    });
  };

  const handleReverseSale = async () => {
    if (!billData?.saleId) {
      alert('Sale ID not found');
      return;
    }

    if (!reversePassword) {
      alert('Please enter the password');
      return;
    }

    try {
      setReversingSale(true);
      await salesAPI.reverse(billData.saleId, reversePassword, reverseReason || 'Wrong order - bill reversed');
      alert('Bill reversed successfully! Inventory has been restored.');
      
      // Close modals and reset
      setShowReversePasswordModal(false);
      setShowBillModal(false);
      setBillData(null);
      setReversePassword('');
      setReverseReason('');
      
      // Reload data
      loadOngoingPendingPayments();
    } catch (error: any) {
      console.error('Failed to reverse sale:', error);
      const errorMessage = error.response?.data?.message || 'Failed to reverse bill';
      alert(errorMessage);
    } finally {
      setReversingSale(false);
    }
  };

  const updateItemFreeQuantity = (productId: string, freeQuantity: number) => {
    setShopItems(items => {
      const updatedItems = items.map(item => {
        if (item.productId === productId) {
          // Free items are additional rewards, limited by available stock
          const maxFree = (item.maxQuantity || 0) - (item.quantity || 0);
          const validatedFree = Math.max(0, Math.min(maxFree, freeQuantity));
          return {
            ...item,
            freeItems: validatedFree
          };
        }
        return item;
      });
      // Also update savedShopItems if a shop is selected
      if (selectedShop) {
        setSavedShopItems(prev => {
          const newMap = new Map(prev);
          newMap.set(selectedShop.id, updatedItems);
          return newMap;
        });
      }
      return updatedItems;
    });
  };

  const addNewItem = (productId?: string) => {
    if (availableProducts.length === 0) return;
    
    const existingProductIds = shopItems.map(item => item.productId);
    let productToAdd;
    
    if (productId) {
      // Add specific product if provided
      productToAdd = availableProducts.find(p => p.id === productId && !existingProductIds.includes(p.id));
    } else {
      // Add first available product that's not already in the list
      productToAdd = availableProducts.find(p => !existingProductIds.includes(p.id));
    }
    
    if (productToAdd) {
      setShopItems([...shopItems, {
        productId: productToAdd.id,
        productName: productToAdd.name,
        quantity: 0,
        maxQuantity: 999,
        pricePerUnit: productToAdd.price,
        inventoryPrice: productToAdd.price,
        totalPrice: 0,
        returns: 0,
        freeItems: 0
      }]);
    }
  };

  const loadAvailableProducts = async () => {
    try {
      const inventory = await productionAPI.getSalespersonInventory();
      setAvailableProducts(inventory.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price
      })));
    } catch (error) {
      console.error('Failed to load available products:', error);
    }
  };



  // Show Shop Details Page if a shop is selected
  if (currentView === 'shop-details' && selectedShopId) {
    return (
      <ShopDetailsPage 
        shopId={selectedShopId} 
        onBack={() => {
          setCurrentView('dashboard');
          setSelectedShopId(null);
        }} 
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // Get payment status for shop cards with daily tracking
  const getShopPaymentStatus = (shopId: string): 'paid' | 'pending' | 'ongoing' => {
    const shopWithPayment = shopsWithPayments.find(s => s.id === shopId);
    if (!shopWithPayment) return 'pending';
    
    // Check if fully paid (no pending cash or cheque)
    if (shopWithPayment.paymentStatus === 'paid' || 
        ((shopWithPayment.pendingCashAmount || 0) === 0 && (shopWithPayment.pendingChequeAmount || 0) === 0)) {
      return 'paid';
    }
    
    // Check if there's any pending payment (ongoing)
    if ((shopWithPayment.pendingCashAmount || 0) > 0 || (shopWithPayment.pendingChequeAmount || 0) > 0) {
      return 'ongoing';
    }
    
    return 'pending';
  };

  // Get pending amount display for shop
  const getShopPendingAmount = (shopId: string): string => {
    const shopWithPayment = shopsWithPayments.find(s => s.id === shopId);
    if (!shopWithPayment) return '';
    
    const pendingCash = shopWithPayment.pendingCashAmount || 0;
    const pendingCheque = shopWithPayment.pendingChequeAmount || 0;
    const totalPending = pendingCash + pendingCheque;
    
    if (totalPending === 0) return '';
    
    let statusText = '';
    if (pendingCash > 0 && pendingCheque > 0) {
      statusText = `Cash + Cheque: ${totalPending.toFixed(2)}`;
    } else if (pendingCash > 0) {
      statusText = `Cash: ${pendingCash.toFixed(2)}`;
    } else if (pendingCheque > 0) {
      statusText = `Cheque: ${pendingCheque.toFixed(2)}`;
    }
    
    return statusText;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 overflow-y-auto pb-4">
        {/* Map Section */}
        <div className="px-2 sm:px-4 pt-4 pb-2">
          {/* Header */}
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2 mb-3 sm:mb-4">
            <div className="p-2 bg-primary-100 rounded-lg">
              <MapPin className="w-5 h-5 text-primary-600" />
            </div>
            Shop Locations
          </h2>

          {/* Map Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden relative z-0">
            {location ? (
              <div className="h-[300px] sm:h-[350px]">
                <ShopMapView
                  shops={sortedShops.map(shop => ({
                    ...shop,
                    latitude: shop.latitude ?? null,
                    longitude: shop.longitude ?? null,
                    paymentStatus: getShopPaymentStatus(shop.id)
                  }))}
                  userLocation={location}
                  selectedShopId={selectedShop?.id}
                  onShopSelect={(shop) => {
                    const fullShop = shops.find(s => s.id === shop.id);
                    if (fullShop) {
                      setSelectedShop(fullShop);
                    }
                  }}
                  showDirectionsInMap={true}
                />
              </div>
            ) : (
              <div className="h-[300px] sm:h-[350px] flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="text-center px-6">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-8 h-8 text-primary-500" />
                  </div>
                  {locationLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-200 border-t-primary-600 mx-auto mb-3"></div>
                      <p className="text-gray-600 font-medium">Getting your location...</p>
                      <p className="text-gray-400 text-sm mt-1">Please wait</p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Location Required</h3>
                      <p className="text-gray-500 text-sm mb-4 max-w-xs mx-auto">
                        {locationError || 'Enable location services to view nearby shops and get directions'}
                      </p>
                      <button
                        onClick={requestLocation}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95"
                      >
                        Enable Location
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Add Shop Button - Below Map */}
          <div className="flex justify-end mt-3">
            <button
              onClick={() => {
                setNewShop({ 
                  shopName: '', 
                  contact: '', 
                  address: '',
                  latitude: location?.lat || null,
                  longitude: location?.lng || null
                });
                setShowShopModal(true);
              }}
              className="bg-primary-600 hover:bg-primary-700 text-white rounded-xl px-4 sm:px-5 py-2 sm:py-2.5 flex items-center gap-2 text-xs sm:text-sm font-semibold transition-all shadow-lg hover:shadow-xl active:scale-95"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Add Shop</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Pending Payments Section */}
        {ongoingPendingPayments.length > 0 && (() => {
          // Extract cities from addresses (simple extraction - city is usually the last part after comma or space)
          const extractCities = (payments: any[]): string[] => {
            const cities = new Set<string>();
            payments.forEach(payment => {
              if (payment.address) {
                // Try to extract city - common patterns: "..., City" or "City, ..." or just "City"
                const parts = payment.address.split(',').map((p: string) => p.trim());
                if (parts.length > 0) {
                  // Usually city is the last part
                  const city = parts[parts.length - 1];
                  if (city) cities.add(city);
                }
              }
            });
            return Array.from(cities).sort();
          };

          const cities = extractCities(ongoingPendingPayments);
          
          // Filter payments by selected city
          const filteredPayments = selectedCity
            ? ongoingPendingPayments.filter(payment => {
                if (!payment.address) return false;
                const addressLower = payment.address.toLowerCase();
                const cityLower = selectedCity.toLowerCase();
                return addressLower.includes(cityLower);
              })
            : ongoingPendingPayments;

          // Get current payment
          const currentPayment = filteredPayments[currentPaymentIndex] || null;
          const hasPrev = currentPaymentIndex > 0;
          const hasNext = currentPaymentIndex < filteredPayments.length - 1;

          return (
            <div className="p-2 sm:p-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                    Ongoing Pending Payments
                  </h2>
                  {cities.length > 0 && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Filter by City:</label>
                <select
                        value={selectedCity}
                        onChange={(e) => {
                          setSelectedCity(e.target.value);
                          setCurrentPaymentIndex(0); // Reset to first payment when city changes
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                >
                        <option value="">All Cities</option>
                        {cities.map(city => (
                          <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                  </div>
                )}
                </div>

                {currentPayment ? (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex flex-col gap-4">
                      {/* Shop Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Store className="w-5 h-5 text-orange-600" />
                          <h3 className="text-lg font-semibold text-gray-900">
                            {currentPayment.shopName || 'Unknown Shop'}
                          </h3>
                        </div>
                        {currentPayment.address && (
                          <p className="text-sm text-gray-600 mb-3">{currentPayment.address}</p>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">Date:</span>
                            <div className="font-medium text-gray-900">
                              {new Date(currentPayment.saleDate).toLocaleDateString()}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Total:</span>
                            <div className="font-semibold text-gray-900">
                              {formatCurrencySimple(currentPayment.totalAmount)}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Paid:</span>
                            <div className="font-semibold text-gray-900">
                              {formatCurrencySimple(currentPayment.totalPaid)}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Remaining:</span>
                            <div className="font-semibold text-orange-600">
                              {formatCurrencySimple(currentPayment.remainingBalance)}
                            </div>
                          </div>
              </div>
            </div>

                      {/* Navigation and Action Buttons */}
                      <div className="flex items-center justify-between gap-4 pt-3 border-t border-orange-200">
                        {/* Navigation Arrows */}
                        <div className="flex items-center gap-2">
                  <button
                            onClick={() => setCurrentPaymentIndex(prev => Math.max(0, prev - 1))}
                            disabled={!hasPrev}
                            className={`p-2 rounded-lg transition-colors ${
                              hasPrev
                                ? 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                  >
                            <ChevronLeft className="w-5 h-5" />
                  </button>
                          <span className="text-sm text-gray-600 min-w-[80px] text-center">
                            {currentPaymentIndex + 1} / {filteredPayments.length}
                          </span>
                          <button
                            onClick={() => setCurrentPaymentIndex(prev => Math.min(filteredPayments.length - 1, prev + 1))}
                            disabled={!hasNext}
                            className={`p-2 rounded-lg transition-colors ${
                              hasNext
                                ? 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                          </div>

                        {/* Settle Payment Button */}
                            <button
                          onClick={async () => {
                            try {
                              setLoadingSaleDetails(true);
                              // Fetch the sale details including items
                              const sale = await salesAPI.getById(currentPayment.saleId);
                              setSelectedSaleForSettlement(sale);
                              setSettlementRemainingAmount(currentPayment.remainingBalance);
                              setSettlementPaymentAmount(currentPayment.remainingBalance); // Default to full amount, but user can change
                              setSettlementPaymentData(currentPayment);
                              setShowSettlePaymentModal(true);
                            } catch (error) {
                              console.error('Failed to load sale details:', error);
                              alert('Failed to load sale details');
                            } finally {
                              setLoadingSaleDetails(false);
                            }
                          }}
                          disabled={loadingSaleDetails}
                          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                          <DollarSign className="w-4 h-4" />
                          {loadingSaleDetails ? 'Loading...' : 'Settle Payment'}
                            </button>
                          </div>
                        </div>
                        </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No payments found for selected city
                      </div>
                )}
                </div>
            </div>
          );
        })()}

        {/* Shop List Section */}
        <div className="p-2 sm:p-4 space-y-3 sm:space-y-4">
          {/* Shop Search */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={shopSearchQuery}
                onChange={(e) => setShopSearchQuery(e.target.value)}
                placeholder="Search shops by name or city..."
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base sm:text-sm touch-manipulation"
              />
                    </div>
                  </div>

          {/* Shop List */}
          {sortedShops.length > 0 ? (
            <div className="space-y-3">
              {sortedShops
                .filter((shop) => {
                  if (!shopSearchQuery.trim()) return true;
                  const query = shopSearchQuery.toLowerCase();
                  const shopName = (shop.shopName || '').toLowerCase();
                  const address = (shop.address || '').toLowerCase();
                  return shopName.includes(query) || address.includes(query);
                })
                .map((shop) => {
                  const hasPendingPayment = getShopPendingAmount(shop.id) !== '';
                  return (
                    <div
                      key={shop.id}
                      onClick={(e) => handleShopClick(shop, e)}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 active:bg-gray-50 cursor-pointer touch-manipulation hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between gap-2 sm:gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                            {shop.shopName}
                          </h3>
                          {shop.address && (
                            <p className="text-sm text-gray-600 mt-1">
                              {shop.address}
                            </p>
                          )}
                          {hasPendingPayment && (
                            <p className="text-sm font-medium text-orange-600 mt-1">
                              ⚠️ {getShopPendingAmount(shop.id)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <button
                            onClick={(e) => handleEditShop(shop, e)}
                            className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors touch-manipulation"
                            title="Edit Shop"
                    >
                            <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button
                            onClick={(e) => handleDeleteShop(shop, e)}
                            className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors touch-manipulation"
                            title="Delete Shop"
                    >
                            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
              </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No shops added yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Shop Modal */}
      {showShopModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowShopModal(false);
              setEditingShop(null);
              setNewShop({ shopName: '', contact: '', address: '', latitude: null, longitude: null });
            }
          }}
        >
          <div 
            className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Store className="w-5 h-5 text-primary-600" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">{editingShop ? 'Edit Shop' : 'Add New Shop'}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowShopModal(false);
                  setEditingShop(null);
                  setNewShop({ shopName: '', contact: '', address: '', latitude: null, longitude: null });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateShop} className="space-y-4">
              {/* Shop Name */}
              <div>
                <label htmlFor="shop-name" className="block text-sm font-medium mb-2 text-gray-700">Shop Name *</label>
                <input
                  id="shop-name"
                  name="shopName"
                  type="text"
                  autoComplete="off"
                  autoFocus
                  value={newShop.shopName || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewShop((prev: CreateBuyerData) => ({ ...prev, shopName: value }));
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter shop name"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="shop-phone" className="block text-sm font-medium mb-2 text-gray-700">Phone Number</label>
                <input
                  id="shop-phone"
                  name="contact"
                  type="tel"
                  autoComplete="off"
                  value={newShop.contact || ''}
                  onChange={(e) => {
                    setNewShop((prev: CreateBuyerData) => ({ ...prev, contact: e.target.value }));
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter phone number"
                />
              </div>

              {/* Address */}
              <div>
                <label htmlFor="shop-address" className="block text-sm font-medium mb-2 text-gray-700">Address</label>
                <textarea
                  id="shop-address"
                  name="address"
                  autoComplete="off"
                  value={newShop.address || ''}
                  onChange={(e) => {
                    setNewShop((prev: CreateBuyerData) => ({ ...prev, address: e.target.value }));
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={2}
                  placeholder="Enter shop address"
                />
              </div>

              {/* GPS Location Section */}
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-primary-800 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Shop Location (GPS)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (location) {
                        // Use existing location immediately
                        setNewShop((prev: CreateBuyerData) => ({
                          ...prev,
                          latitude: location.lat,
                          longitude: location.lng
                        }));
                      } else {
                        // Request location if not available
                        if (locationLoading) {
                          alert('Location is being retrieved, please wait...');
                          return;
                        }
                        // Request location - it will be auto-set by useEffect when available
                        requestLocation();
                        alert('Requesting location... It will be set automatically when available.');
                      }
                    }}
                    disabled={locationLoading}
                    className="text-xs bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Navigation className="w-3 h-3" />
                    {locationLoading ? 'Getting Location...' : location ? 'Use My Location' : 'Get & Use Location'}
                  </button>
                </div>
                
                {newShop.latitude && newShop.longitude ? (
                  <div className="bg-white rounded-lg p-2 border border-primary-200">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-600">
                        <span className="font-medium text-green-600">✓ Location Set</span>
                        <br />
                        <span className="text-gray-500">
                          {newShop.latitude.toFixed(6)}, {newShop.longitude.toFixed(6)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setNewShop((prev: CreateBuyerData) => ({
                            ...prev,
                            latitude: null,
                            longitude: null
                          }));
                        }}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-primary-600">
                    📍 Click "Use My Location" to set the shop's GPS coordinates, or enter an address to auto-detect.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowShopModal(false);
                    setEditingShop(null);
                    setNewShop({ shopName: '', contact: '', address: '', latitude: null, longitude: null });
                  }}
                  className="btn-secondary flex-1 min-h-[44px] touch-manipulation text-base sm:text-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1 min-h-[44px] touch-manipulation text-base sm:text-sm flex items-center justify-center gap-2">
                  <Store className="w-4 h-4" />
                  {editingShop ? 'Update Shop' : 'Create Shop'}
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
              setShowPaymentSection(false);
              // Don't clear shopItems - they're saved in savedShopItems
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-2 sm:mx-0">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0 pr-2">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 break-words">{selectedShop.shopName}</h2>
                  {selectedShop.address && (
                    <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">{selectedShop.address}</p>
      )}
    </div>
                <button
                  onClick={() => {
                    setShowShopDetailsModal(false);
                    setShowPaymentSection(false);
                    // Don't clear shopItems - they're saved in savedShopItems
                  }}
                  className="text-gray-400 hover:text-gray-600 p-2 -mt-2 -mr-2 touch-manipulation flex-shrink-0"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6">
              {loadingShopDetails ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">Loading shop details...</div>
                </div>
              ) : showPaymentSection ? (
                <div className="overflow-x-auto">
                  <div className="flex items-center gap-2 sm:gap-3 mb-4">
                    <button
                      onClick={() => setShowPaymentSection(false)}
                      className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation min-h-[44px] sm:min-h-0"
                      title="Back to sales entry"
                    >
                      <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-sm sm:text-base">Back</span>
                    </button>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">Payment Section</h3>
                  </div>
                  
                  {/* Returns Alert - show if any items have returns */}
                  {(() => {
                    const itemsWithReturns = shopItems.filter(item => (item.returns || 0) > 0);
                    if (itemsWithReturns.length > 0) {
                      return (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm">Previous Returns from this Shop</span>
                          </div>
                          <div className="space-y-1">
                            {itemsWithReturns.map(item => (
                              <div key={item.productId} className="text-xs text-red-600 flex items-center gap-2">
                                <span className="font-medium">{item.productName}</span>
                                <span>×{item.returns} returned</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  {/* Payment Method Selector */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method:</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'cheque' | 'split' | 'ongoing')}
                      className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="cash">Cash</option>
                      <option value="cheque">Cheque</option>
                      <option value="split">Cash + Cheque</option>
                      <option value="ongoing">Ongoing</option>
                    </select>
                  </div>
                  
                  {/* Payment Details Fields */}
                  <div className="mb-6 space-y-4">
                    {(paymentMethod === 'cash' || paymentMethod === 'split' || paymentMethod === 'ongoing') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cash Amount {paymentMethod === 'ongoing' ? '(can be 0)' : '*'}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={cashAmount || ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            if (!isNaN(val) && val >= 0) {
                              setCashAmount(val);
                            }
                          }}
                          onFocus={(e) => e.target.select()}
                          className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base sm:text-sm touch-manipulation"
                          placeholder={paymentMethod === 'ongoing' ? "Enter cash amount (0 or more)" : "Enter cash amount"}
                        />
                        {paymentMethod === 'ongoing' && (
                          <p className="text-xs text-gray-500 mt-1">Ongoing payments are always cash. Enter 0 to mark as ongoing with no payment, or enter an amount for partial settlement.</p>
                        )}
                      </div>
                    )}
                    
                    {(paymentMethod === 'cheque' || paymentMethod === 'split') && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Cheque Amount *</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={chequeAmount || ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                              if (!isNaN(val) && val >= 0) {
                                setChequeAmount(val);
                              }
                            }}
                            onFocus={(e) => e.target.select()}
                            className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base sm:text-sm touch-manipulation"
                            placeholder="Enter cheque amount"
                          />
                        </div>
                        {chequeAmount > 0 && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Cheque Number *</label>
                              <input
                                type="text"
                                value={chequeNumber}
                                onChange={(e) => setChequeNumber(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base sm:text-sm touch-manipulation"
                                placeholder="Enter cheque number"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                              <input
                                type="text"
                                value={chequeBank}
                                onChange={(e) => setChequeBank(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base sm:text-sm touch-manipulation"
                                placeholder="Enter bank name (optional)"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Cheque Expiry Date *</label>
                              <input
                                type="date"
                                value={chequeExpiryDate}
                                onChange={(e) => setChequeExpiryDate(e.target.value)}
                                className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base sm:text-sm touch-manipulation"
                              />
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                  
                  <table className="w-full min-w-[640px] sm:min-w-0">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Item Name</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Quantity</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Price/Unit</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Price</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Payment Method</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {shopItems.filter(item => item.quantity > 0).map((item) => (
                        <tr key={item.productId} className="hover:bg-gray-50">
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{item.productName}</td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span>{item.quantity}</span>
                              {(item.freeItems || 0) > 0 && (
                                <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Free-{item.freeItems}</span>
                              )}
                              {(item.returns || 0) > 0 && (
                                <span className="text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Return-{item.returns}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 text-right hidden sm:table-cell">{formatCurrencySimple(item.pricePerUnit || 0)}</td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900 text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-xs text-gray-500 sm:hidden">
                                {formatCurrencySimple(item.pricePerUnit || 0)} × {item.quantity}
                              </span>
                              <span>{formatCurrencySimple((item.quantity || 0) * (item.pricePerUnit || 0))}</span>
                            </div>
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 hidden md:table-cell">
                            {paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'cheque' ? 'Cheque' : paymentMethod === 'split' ? 'Cash + Cheque' : 'Ongoing'}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-semibold">
                        <td colSpan={3} className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">Subtotal</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 text-right">{formatCurrencySimple(calculateSubtotal())}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 hidden md:table-cell"></td>
                      </tr>
                    </tbody>
                  </table>
                  
                  {/* Process Payment Button */}
                  <div className="mt-4 sm:mt-6 flex justify-end">
                    <button
                      onClick={handleProcessPayment}
                      disabled={processingPayment}
                      className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm sm:text-base touch-manipulation min-h-[44px] sm:min-h-0 w-full sm:w-auto justify-center sm:justify-start"
                    >
                      <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                      {processingPayment ? 'Processing...' : 'Process Payment'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {/* Returns Alert - show if any items have previous returns */}
                  {(() => {
                    const itemsWithReturns = shopItems.filter(item => (item.returns || 0) > 0);
                    if (itemsWithReturns.length > 0) {
                      return (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm">Previous Returns from this Shop</span>
                          </div>
                          <div className="space-y-1">
                            {itemsWithReturns.map(item => (
                              <div key={item.productId} className="text-xs text-red-600 flex items-center gap-2">
                                <span className="font-medium">{item.productName}</span>
                                <span>×{item.returns} returned</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  {/* Mobile Card View */}
                  <div className="sm:hidden space-y-3">
                    {shopItems.map((item) => (
                      <div key={item.productId} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900 text-sm">{item.productName}</h4>
                            <p className="text-xs text-gray-500">Stock: {item.maxQuantity || 0}</p>
                          </div>
                          <span className="text-sm font-bold text-primary-600">
                            {formatCurrencySimple((item.quantity || 0) * (item.pricePerUnit || 0))}
                          </span>
                        </div>
                        
                        {/* Quantity Row */}
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                          <span className="text-xs text-gray-600 font-medium">Quantity</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateItemQuantity(item.productId, -1)}
                              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center touch-manipulation active:bg-gray-200"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <input
                              type="number"
                              step="1"
                              min="0"
                              max={item.maxQuantity || 0}
                              value={item.quantity ?? 0}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                if (!isNaN(val) && val >= 0) {
                                  updateItemQuantityDirect(item.productId, val);
                                }
                              }}
                              onFocus={(e) => e.target.select()}
                              className="w-16 h-8 text-center border border-gray-300 rounded-lg text-sm font-medium touch-manipulation"
                              placeholder="0"
                            />
                            <button
                              onClick={() => updateItemQuantity(item.productId, 1)}
                              disabled={item.quantity >= (item.maxQuantity || 0)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center touch-manipulation ${
                                item.quantity >= (item.maxQuantity || 0)
                                  ? 'bg-gray-100 opacity-50'
                                  : 'bg-primary-100 text-primary-600 active:bg-primary-200'
                              }`}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Price Row */}
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                          <span className="text-xs text-gray-600 font-medium">Price/Unit</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.pricePerUnit || ''}
                            onChange={(e) => updateItemPrice(item.productId, parseFloat(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            className="w-24 h-8 text-right border border-gray-300 rounded-lg text-sm px-2 touch-manipulation"
                            placeholder="Price"
                          />
                        </div>
                        
                        {/* Returns & Free Issue Row */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-xs text-gray-600 font-medium block mb-1">Returns</span>
                            <input
                              type="number"
                              step="1"
                              min="0"
                              value={item.returns || ''}
                              onChange={(e) => updateItemReturn(item.productId, parseInt(e.target.value) || 0)}
                              onFocus={(e) => e.target.select()}
                              className="w-full h-8 text-center border border-gray-300 rounded-lg text-sm touch-manipulation"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <span className="text-xs text-gray-600 font-medium block mb-1">Free Issue</span>
                            <input
                              type="number"
                              step="1"
                              min="0"
                              max={Math.max(0, (item.maxQuantity || 0) - (item.quantity || 0))}
                              value={item.freeItems || ''}
                              onChange={(e) => updateItemFreeQuantity(item.productId, parseInt(e.target.value) || 0)}
                              onFocus={(e) => e.target.select()}
                              className="w-full h-8 text-center border border-gray-300 rounded-lg text-sm touch-manipulation"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Mobile Subtotal */}
                    <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 flex justify-between items-center">
                      <span className="font-semibold text-gray-900">Subtotal</span>
                      <span className="text-lg font-bold text-primary-600">{formatCurrencySimple(calculateSubtotal())}</span>
                    </div>
                  </div>
                  
                  {/* Desktop Table View */}
                  <table className="w-full hidden sm:table">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Item Name</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Quantity</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Price/Unit</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Price</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Returns</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Free Issue</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {shopItems.map((item) => (
                        <tr key={item.productId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{item.productName}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => updateItemQuantity(item.productId, -1)}
                                className="p-1 rounded hover:bg-gray-200 transition-colors touch-manipulation"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <input
                                type="number"
                                step="1"
                                min="0"
                                max={item.maxQuantity || 0}
                                value={item.quantity ?? 0}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                  if (!isNaN(val) && val >= 0) {
                                    updateItemQuantityDirect(item.productId, val);
                                  }
                                }}
                                onFocus={(e) => e.target.select()}
                                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-center focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                placeholder="0"
                              />
                              <button
                                onClick={() => updateItemQuantity(item.productId, 1)}
                                disabled={item.quantity >= (item.maxQuantity || 0)}
                                className={`p-1 rounded transition-colors ${
                                  item.quantity >= (item.maxQuantity || 0)
                                    ? 'opacity-50 cursor-not-allowed bg-gray-100'
                                    : 'hover:bg-gray-200'
                                }`}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.pricePerUnit || ''}
                              onChange={(e) => updateItemPrice(item.productId, parseFloat(e.target.value) || 0)}
                              onFocus={(e) => e.target.select()}
                              className="w-24 px-2 py-1 text-sm border border-gray-300 rounded text-right focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              placeholder="Price"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                            {formatCurrencySimple((item.quantity || 0) * (item.pricePerUnit || 0))}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">
                            <input
                              type="number"
                              step="1"
                              min="0"
                              value={item.returns || ''}
                              onChange={(e) => updateItemReturn(item.productId, parseInt(e.target.value) || 0)}
                              onFocus={(e) => e.target.select()}
                              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded text-right focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">
                            <input
                              type="number"
                              step="1"
                              min="0"
                              max={Math.max(0, (item.maxQuantity || 0) - (item.quantity || 0))}
                              value={item.freeItems || ''}
                              onChange={(e) => updateItemFreeQuantity(item.productId, parseInt(e.target.value) || 0)}
                              onFocus={(e) => e.target.select()}
                              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded text-right focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              placeholder="0"
                            />
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-semibold">
                        <td colSpan={3} className="px-4 py-3 text-sm text-gray-900">Subtotal</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrencySimple(calculateSubtotal())}</td>
                        <td colSpan={2} className="px-4 py-3"></td>
                      </tr>
                    </tbody>
                  </table>
                  
                  {/* Save Button */}
                  <div className="mt-4 sm:mt-6 flex justify-end">
                    <button
                      onClick={handleSaveShopItems}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm sm:text-base touch-manipulation min-h-[44px] sm:min-h-0"
                    >
                      <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settle Payment Modal */}
      {showSettlePaymentModal && selectedSaleForSettlement && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                  onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSettlePaymentModal(false);
              setSelectedSaleForSettlement(null);
              setSettlementPaymentData(null);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Settle Payment</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {settlementPaymentData?.shopName || 'Unknown Shop'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowSettlePaymentModal(false);
                    setSelectedSaleForSettlement(null);
                    setSettlementPaymentData(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Remaining Amount Display */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-sm sm:text-lg font-medium text-gray-700">Remaining Payment Amount:</span>
                  <span className="text-xl sm:text-2xl font-bold text-orange-600">
                    {formatCurrencySimple(settlementRemainingAmount)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="p-4 sm:p-6">
              {/* Sale Items Table */}
              <div className="mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Sale Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px] sm:min-w-0">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Item Name</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Quantity</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Price/Unit</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Price</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedSaleForSettlement.items && selectedSaleForSettlement.items.length > 0 ? (
                        selectedSaleForSettlement.items.map((item: any, index) => {
                          // Backend returns snake_case: product_name, product_id, price
                          // Handle both camelCase and snake_case for compatibility
                          const productName = item.productName || item.product_name || 'Unknown Item';
                          const quantity = item.quantity || 0;
                          const unitPrice = item.price || item.unitPrice || 0;
                          const totalPrice = quantity * unitPrice;
                          
                          return (
                            <tr key={item.id || index} className="hover:bg-gray-50">
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                                {productName}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 text-right">
                                {quantity}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 text-right hidden sm:table-cell">
                                {formatCurrencySimple(unitPrice)}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900 text-right">
                                <div className="flex flex-col items-end">
                                  <span className="text-xs text-gray-500 sm:hidden">{formatCurrencySimple(unitPrice)} × {quantity}</span>
                                  <span>{formatCurrencySimple(totalPrice)}</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-2 sm:px-4 py-6 sm:py-8 text-center text-gray-500 text-xs sm:text-sm">
                            No items found
                          </td>
                        </tr>
                      )}
                      <tr className="bg-gray-50 font-semibold">
                        <td colSpan={3} className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">Subtotal</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 text-right">
                          {formatCurrencySimple((selectedSaleForSettlement as any).totalAmount || (selectedSaleForSettlement as any).total_amount || 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Details */}
              <div className="border-t border-gray-200 pt-4 sm:pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                  <div>
                    <span className="text-xs sm:text-sm text-gray-600">Sale Date:</span>
                    <div className="font-medium text-gray-900 text-sm sm:text-base">
                      {new Date(selectedSaleForSettlement.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm text-gray-600">Total Amount:</span>
                    <div className="font-medium text-gray-900 text-sm sm:text-base">
                      {formatCurrencySimple(selectedSaleForSettlement.totalAmount || 0)}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm text-gray-600">Total Paid:</span>
                    <div className="font-medium text-green-600 text-sm sm:text-base">
                      {formatCurrencySimple((selectedSaleForSettlement.totalAmount || 0) - settlementRemainingAmount)}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm text-gray-600">Remaining:</span>
                    <div className="font-medium text-orange-600 text-sm sm:text-base">
                      {formatCurrencySimple(settlementRemainingAmount)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Amount Input */}
              <div className="border-t border-gray-200 pt-4 sm:pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rs.</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={settlementRemainingAmount}
                    value={settlementPaymentAmount || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      // Don't allow more than remaining balance
                      const maxAmount = Math.max(0, settlementRemainingAmount);
                      setSettlementPaymentAmount(Math.min(value, maxAmount));
                    }}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-base"
                    placeholder="Enter payment amount"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    Remaining after payment: <span className="font-semibold text-orange-600">
                      Rs. {(settlementRemainingAmount - (settlementPaymentAmount || 0)).toFixed(2)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSettlementPaymentAmount(settlementRemainingAmount)}
                    className="text-primary-600 hover:text-primary-800 font-medium text-xs"
                  >
                    Pay Full Amount
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowSettlePaymentModal(false);
                    setSelectedSaleForSettlement(null);
                    setSettlementPaymentData(null);
                    setSettlementPaymentAmount(0);
                  }}
                  className="btn-secondary flex-1 py-2.5 sm:py-2 touch-manipulation min-h-[44px] sm:min-h-0 text-sm sm:text-base"
                >
                  Close
                </button>
                <button
                  onClick={async () => {
                    if (!selectedSaleForSettlement || !settlementPaymentData) return;
                    
                    const paymentAmt = settlementPaymentAmount || 0;
                    
                    if (paymentAmt <= 0) {
                      alert('Please enter a payment amount greater than 0');
                      return;
                    }
                    
                    if (paymentAmt > settlementRemainingAmount) {
                      alert(`Payment amount cannot exceed remaining balance of Rs. ${settlementRemainingAmount.toFixed(2)}`);
                      return;
                    }
                    
                    try {
                      setProcessingSettlementPayment(true);
                      
                      // Process partial payment (ongoing payments are cash only)
                      const paymentData: CreatePaymentData = {
                        saleId: selectedSaleForSettlement.id,
                        paymentMethod: 'ongoing',
                        amount: paymentAmt,
                        cashAmount: paymentAmt,
                        chequeAmount: 0
                      };
                      
                      await paymentsAPI.create(paymentData);
                      
                      // Close modal and refresh pending payments list
                      setShowSettlePaymentModal(false);
                      setSelectedSaleForSettlement(null);
                      setSettlementPaymentData(null);
                      setSettlementRemainingAmount(0);
                      setSettlementPaymentAmount(0);
                      
                      // Refresh ongoing pending payments list
                      await loadOngoingPendingPayments();
                      setCurrentPaymentIndex(0);
                      
                      const remainingAfterPayment = settlementRemainingAmount - paymentAmt;
                      if (remainingAfterPayment > 0.01) {
                        alert(`Payment of Rs. ${paymentAmt.toFixed(2)} processed successfully! Remaining balance: Rs. ${remainingAfterPayment.toFixed(2)}`);
                      } else {
                        alert('Payment processed successfully! Sale is now fully paid.');
                      }
                    } catch (error: any) {
                      console.error('Failed to process settlement payment:', error);
                      const errorMessage = error.response?.data?.message || 'Failed to process payment';
                      alert(errorMessage);
                    } finally {
                      setProcessingSettlementPayment(false);
                    }
                  }}
                  disabled={processingSettlementPayment || (settlementPaymentAmount || 0) <= 0 || (settlementPaymentAmount || 0) > settlementRemainingAmount}
                  className="btn-primary flex-1 py-2.5 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {processingSettlementPayment ? 'Processing...' : `Pay Rs. ${(settlementPaymentAmount || 0).toFixed(2)}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bill/Invoice Modal - Optimized for Xprinter Q838L 80MM */}
      {showBillModal && billData && (() => {
        const t = BILL_LABELS[billLang];
        return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg w-full max-w-sm max-h-[95vh] overflow-y-auto shadow-xl">
            {/* Action Buttons - Top with system colors */}
            <div className="flex gap-2 p-3 border-b border-gray-200 bg-primary-50 print:hidden sticky top-0">
              <button
                onClick={() => setBillLang(billLang === 'EN' ? 'SI' : 'EN')}
                className="btn-secondary px-3 py-2 text-sm"
              >
                {t.language}
              </button>
              {billData.saleId && (
                <button
                  onClick={() => setShowReversePasswordModal(true)}
                  className="btn-secondary px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white"
                >
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Reverse
                </button>
              )}
              <button
                onClick={() => {
                  setShowBillModal(false);
                  setBillData(null);
                }}
                className="btn-secondary flex-1 py-2 text-sm"
              >
                {t.close}
              </button>
              <button
                onClick={() => {
                  const printContent = document.getElementById('printable-bill');
                  if (printContent) {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Invoice - ${billData.invoiceNumber}</title>
                            <style>
                              @page { margin: 2mm; size: 80mm auto; }
                              * { margin: 0; padding: 0; box-sizing: border-box; }
                              body { 
                                font-family: 'Noto Sans Sinhala', 'Segoe UI', Arial, sans-serif; 
                                width: 76mm; 
                                padding: 2mm;
                                font-size: 10px; 
                                line-height: 1.3;
                              }
                              .header { text-align: center; border-bottom: 1px dashed #0284c7; padding-bottom: 3mm; margin-bottom: 2mm; }
                              .logo { width: 40px; height: 40px; margin: 0 auto 2mm; }
                              .company-name { font-size: 14px; font-weight: bold; color: #075985; }
                              .company-info { font-size: 8px; color: #333; }
                              .invoice-title { text-align: center; background: #0284c7; color: white; padding: 2mm; margin-bottom: 2mm; font-weight: bold; }
                              .invoice-info { display: flex; justify-content: space-between; margin-bottom: 2mm; font-size: 9px; background: #e0f2fe; padding: 2mm; }
                              .customer-box { background: #f0f9ff; border-left: 3px solid #0284c7; padding: 2mm; margin-bottom: 2mm; }
                              .customer-name { font-weight: bold; font-size: 11px; color: #075985; }
                              table { width: 100%; border-collapse: collapse; margin-bottom: 2mm; }
                              th { background: #0284c7; color: #fff; padding: 1.5mm 1mm; font-size: 8px; text-align: left; }
                              td { padding: 1.5mm 1mm; border-bottom: 1px dotted #bae6fd; font-size: 9px; }
                              .text-right { text-align: right; }
                              .text-center { text-align: center; }
                              .totals { border-top: 1px dashed #0284c7; padding-top: 2mm; margin-top: 2mm; }
                              .total-row { display: flex; justify-content: space-between; margin-bottom: 1mm; font-size: 9px; }
                              .total-row.main { font-size: 12px; font-weight: bold; background: #0284c7; color: white; padding: 2mm; margin: 1mm -2mm; }
                              .payment-box { background: #f0f9ff; border: 1px solid #bae6fd; padding: 2mm; margin: 2mm 0; border-radius: 2px; }
                              .payment-title { font-weight: bold; font-size: 10px; margin-bottom: 1mm; color: #0284c7; }
                              .payment-row { display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 0.5mm; }
                              .savings-box { background: #dcfce7; border: 1px solid #86efac; padding: 2mm; margin: 2mm 0; border-radius: 2px; text-align: center; }
                              .footer { text-align: center; border-top: 1px dashed #0284c7; padding-top: 2mm; margin-top: 3mm; }
                              .thank-you { font-size: 10px; font-weight: bold; margin-bottom: 1mm; color: #075985; }
                              .note { font-size: 7px; color: #666; margin-bottom: 2mm; }
                              .voxo-box { background: #f0f9ff; border: 1px solid #0284c7; padding: 2mm; margin-top: 2mm; border-radius: 2px; }
                              .voxo-title { font-size: 9px; font-weight: bold; color: #0284c7; }
                              .voxo-contact { font-size: 8px; color: #666; }
                              .line-through { text-decoration: line-through; color: #999; }
                              .text-green { color: #16a34a; }
                              .text-red { color: #dc2626; }
                              .text-primary { color: #0284c7; }
                              .badge { display: inline-block; font-size: 7px; padding: 0.5mm 1mm; border-radius: 1px; margin-left: 1mm; }
                              .badge-green { background: #dcfce7; color: #166534; }
                              .badge-red { background: #fee2e2; color: #991b1b; }
                              @media print { body { width: 76mm; } }
                            </style>
                          </head>
                          <body>
                            ${printContent.innerHTML}
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.print();
                    }
                  }
                }}
                className="btn-primary flex-1 py-2 flex items-center justify-center gap-1 text-sm"
              >
                <Printer className="w-4 h-4" />
                {t.print}
              </button>
            </div>

            {/* Print-friendly bill content - 80mm optimized with system colors */}
            <div id="printable-bill" className={`p-3 bg-white ${billLang === 'SI' ? 'font-sinhala' : ''}`} style={{ maxWidth: '80mm' }}>
              {/* Header with Logo */}
              <div className="header text-center border-b-2 border-dashed border-primary-500 pb-3 mb-3">
                <img src={logoImage} alt="Logo" className="logo w-12 h-12 mx-auto mb-1" />
                <p className="company-name text-sm font-bold text-primary-800">Lakshan Dairy Products</p>
                <p className="company-info text-xs text-gray-600">17 Mile Post, wewmada, Bibile Rd, Bakinigahawela</p>
                <p className="company-info text-xs text-gray-500">Tel: 0779708725</p>
                <p className="company-info text-xs text-gray-500">milkfoodlakshan@gmail.com</p>
              </div>

              {/* Invoice Title */}
              <div className="invoice-title text-center bg-primary-600 text-white py-1.5 mb-2 rounded text-sm font-bold">
                {t.title}
              </div>

              {/* Invoice Info */}
              <div className="invoice-info flex justify-between text-xs mb-2 bg-primary-50 p-2 rounded border-l-4 border-primary-500">
                <div>
                  <p className="text-gray-600">{t.invoiceNo}:</p>
                  <p className="font-bold text-xs text-primary-700">{billData.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-600">{t.date}: {new Date(billData.date).toLocaleDateString('en-GB')}</p>
                  <p className="text-gray-600">{t.time}: {billData.time}</p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="customer-box bg-primary-50 border-l-4 border-primary-600 p-2 rounded mb-2">
                <p className="text-xs text-gray-600">{t.billTo}:</p>
                <p className="customer-name font-bold text-sm text-primary-800">{billData.shopName}</p>
                {billData.shopAddress && <p className="text-xs text-gray-600">{billData.shopAddress}</p>}
                {billData.shopContact && <p className="text-xs text-gray-600">Tel: {billData.shopContact}</p>}
              </div>

              {/* Items Table */}
              <table className="w-full text-xs mb-2">
                <thead>
                  <tr className="bg-primary-600 text-white">
                    <th className="py-1.5 px-1 text-left text-xs">{t.item}</th>
                    <th className="py-1.5 px-1 text-center text-xs">{t.qty}</th>
                    <th className="py-1.5 px-1 text-right text-xs">{t.mrp}</th>
                    <th className="py-1.5 px-1 text-right text-xs">{t.price}</th>
                    <th className="py-1.5 px-1 text-right text-xs">{t.total}</th>
                  </tr>
                </thead>
                <tbody>
                  {billData.items.filter(item => item.quantity > 0).map((item, index) => (
                    <tr key={index} className={`border-b border-dotted border-primary-200 ${index % 2 === 0 ? 'bg-white' : 'bg-primary-50'}`}>
                      <td className="py-1 px-1 text-xs">
                        <span>{item.productName}</span>
                        {(item.freeItems || 0) > 0 && (
                          <span className="inline-block text-xs ml-1 bg-green-100 text-green-700 px-1 rounded">+{item.freeItems} {t.free}</span>
                        )}
                        {(item.returns || 0) > 0 && (
                          <span className="inline-block text-xs ml-1 bg-red-100 text-red-700 px-1 rounded">-{item.returns} {t.return}</span>
                        )}
                      </td>
                      <td className="py-1 px-1 text-center text-xs">{item.quantity}</td>
                      <td className="py-1 px-1 text-right text-xs line-through text-gray-400">{(item.inventoryPrice || item.pricePerUnit).toFixed(0)}</td>
                      <td className="py-1 px-1 text-right text-xs text-green-700 font-medium">{item.pricePerUnit.toFixed(0)}</td>
                      <td className="py-1 px-1 text-right text-xs font-semibold">{(item.quantity * item.pricePerUnit).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="totals border-t-2 border-dashed border-primary-400 pt-2 mb-2">
                <div className="total-row flex justify-between text-xs">
                  <span className="text-gray-600">{t.inventoryTotal}:</span>
                  <span className="line-through text-gray-400">Rs. {billData.inventoryTotal.toFixed(2)}</span>
                </div>
                {billData.discount > 0 && (
                  <div className="total-row flex justify-between text-xs text-green-700">
                    <span>{t.discount}:</span>
                    <span className="font-medium">- Rs. {billData.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="total-row main flex justify-between text-sm font-bold bg-primary-600 text-white p-2 rounded mt-1">
                  <span>{t.subtotal}:</span>
                  <span>Rs. {billData.subtotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="payment-box bg-primary-50 border border-primary-200 p-2 rounded mb-2">
                <p className="payment-title font-bold text-xs mb-1 text-primary-700">{t.paymentDetails}</p>
                <div className="payment-row flex justify-between text-xs">
                  <span>{t.paymentMethod}:</span>
                  <span className="font-bold uppercase bg-primary-600 text-white px-2 py-0.5 rounded text-xs">
                    {billData.paymentMethod === 'split' ? t.cashCheque : 
                     billData.paymentMethod === 'ongoing' ? t.ongoing : 
                     billData.paymentMethod === 'cash' ? t.cash : t.cheque}
                  </span>
                </div>
                
                {billData.cashAmount > 0 && (
                  <div className="payment-row flex justify-between text-xs text-green-700 bg-green-50 p-1 rounded mt-1">
                    <span className="font-medium">{t.cashPaid}:</span>
                    <span className="font-bold">Rs. {billData.cashAmount.toFixed(2)}</span>
                  </div>
                )}
                
                {billData.chequeAmount > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 p-1.5 rounded mt-1">
                    <div className="payment-row flex justify-between text-xs">
                      <span className="font-medium text-yellow-700">{t.chequeAmount}:</span>
                      <span className="font-bold text-yellow-700">Rs. {billData.chequeAmount.toFixed(2)}</span>
                    </div>
                    <div className="payment-row flex justify-between text-xs mt-0.5">
                      <span className="text-gray-600">{t.chequeNo}:</span>
                      <span className="font-medium">{billData.chequeNumber}</span>
                    </div>
                    {billData.chequeBank && (
                      <div className="payment-row flex justify-between text-xs">
                        <span className="text-gray-600">{t.bank}:</span>
                        <span className="font-medium">{billData.chequeBank}</span>
                      </div>
                    )}
                    <div className="payment-row flex justify-between text-xs">
                      <span className="text-gray-600">{t.expiryDate}:</span>
                      <span className="font-medium">{billData.chequeExpiryDate ? new Date(billData.chequeExpiryDate).toLocaleDateString('en-GB') : '-'}</span>
                    </div>
                    <p className="text-xs text-orange-600 italic mt-1">* {t.chequePending}</p>
                  </div>
                )}
                
                {billData.paymentMethod === 'ongoing' && (
                  <div className="bg-orange-50 border border-orange-200 p-1.5 rounded mt-1">
                    <div className="payment-row flex justify-between text-xs">
                      <span className="font-medium text-orange-700">{t.amountPaid}:</span>
                      <span className="font-bold text-green-700">Rs. {billData.amountReceived.toFixed(2)}</span>
                    </div>
                    <div className="payment-row flex justify-between text-xs text-red-600">
                      <span className="font-medium">{t.balanceDue}:</span>
                      <span className="font-bold">Rs. {billData.pendingAmount.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-orange-600 italic mt-1">* {t.partialPayment}</p>
                  </div>
                )}
                
                <div className="border-t border-primary-200 pt-1 mt-1">
                  <div className="payment-row flex justify-between text-xs font-bold">
                    <span className="text-primary-700">{t.totalReceived}:</span>
                    <span className="text-green-700">Rs. {billData.amountReceived.toFixed(2)}</span>
                  </div>
                  {billData.pendingAmount > 0 && (
                    <div className="payment-row flex justify-between text-xs font-bold text-red-600">
                      <span>{t.outstanding}:</span>
                      <span>Rs. {billData.pendingAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Savings */}
              {billData.discount > 0 && (
                <div className="savings-box bg-green-50 border border-green-200 p-2 rounded mb-2 text-center">
                  <p className="text-xs text-green-700">{t.yourSavings}</p>
                  <p className="font-bold text-green-700 text-base">Rs. {billData.discount.toFixed(2)}</p>
                </div>
              )}

              {/* Footer */}
              <div className="footer border-t-2 border-dashed border-primary-400 pt-2 mt-2 text-center">
                <p className="thank-you text-xs font-bold text-primary-700">{t.thankYou}</p>
                <p className="note text-xs text-gray-500">{t.goodsNote}</p>
                
                {/* VOXO Solutions Footer */}
                <div className="voxo-box bg-primary-50 border border-primary-300 p-2 rounded mt-2">
                  <p className="text-xs text-gray-500 mb-0.5">{t.poweredBy}</p>
                  <p className="voxo-title font-bold text-primary-700 text-sm">VOXOsolution</p>
                  <p className="voxo-contact text-xs text-gray-600 mt-1">0710901871</p>
                  <p className="voxo-contact text-xs text-gray-600">voxosolution@gmail.com</p>
                  <p className="text-xs text-gray-400 mt-1">© 2026 VOXOsolution All rights reserved</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Reverse Password Modal */}
      {showReversePasswordModal && billData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <h2 className="text-xl font-bold text-gray-800">Reverse Bill</h2>
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
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && reversePassword) {
                    handleReverseSale();
                  }
                }}
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReversePasswordModal(false);
                  setReversePassword('');
                  setReverseReason('');
                }}
                className="btn-secondary flex-1 py-2"
                disabled={reversingSale}
              >
                Cancel
              </button>
              <button
                onClick={handleReverseSale}
                className="btn-primary flex-1 py-2 bg-red-600 hover:bg-red-700 text-white"
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
