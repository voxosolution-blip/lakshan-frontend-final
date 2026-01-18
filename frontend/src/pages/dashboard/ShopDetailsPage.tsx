import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, CreditCard, Printer, X, RotateCcw, Search, CheckCircle } from 'lucide-react';
import { buyerAPI } from '../../services/buyerAPI';
import type { Buyer } from '../../types';
import { productionAPI } from '../../services/productionAPI';
import { salesAPI, type CreateSaleData, type Sale } from '../../services/salesAPI';
import { paymentsAPI, type CreatePaymentData } from '../../services/paymentsAPI';
import { returnsAPI, type CreateReturnData } from '../../services/returnsAPI';
import type { InventoryItem } from '../../services/inventoryAPI';

interface ShopDetailsPageProps {
  shopId: string;
  onBack: () => void;
}

interface SaleItem {
  inventoryItemId: string;
  quantity: number;
  unitPrice: number;
}

interface FreeItem {
  inventoryItemId: string;
  quantity: number;
}

interface AllocatedProduct {
  id: string;
  name: string;
  unit: string;
  stock: number;
  price: number;
}

export const ShopDetailsPage = ({ shopId, onBack }: ShopDetailsPageProps) => {
  const [shop, setShop] = useState<Buyer | null>(null);
  const [allocatedProducts, setAllocatedProducts] = useState<AllocatedProduct[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [shopSales, setShopSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'cheque' | 'split' | 'ongoing'>('cash');
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [chequeAmount, setChequeAmount] = useState<number>(0);
  const [chequeNumber, setChequeNumber] = useState<string>('');
  const [chequeBank, setChequeBank] = useState<string>('');
  const [chequeExpiryDate, setChequeExpiryDate] = useState<string>('');
  
  // Payment Window state
  const [showPaymentWindow, setShowPaymentWindow] = useState(false);
  const [selectedSaleForPayment, setSelectedSaleForPayment] = useState<Sale | null>(null);
  const [paymentWindowMethod, setPaymentWindowMethod] = useState<'cash' | 'cheque' | 'split' | 'ongoing'>('cash');
  const [paymentWindowCash, setPaymentWindowCash] = useState<number>(0);
  const [paymentWindowCheque, setPaymentWindowCheque] = useState<number>(0);
  const [paymentWindowChequeNumber, setPaymentWindowChequeNumber] = useState<string>('');
  const [paymentWindowChequeBank, setPaymentWindowChequeBank] = useState<string>('');
  const [paymentWindowChequeExpiry, setPaymentWindowChequeExpiry] = useState<string>('');
  const [hasPreviousPayments, setHasPreviousPayments] = useState<boolean>(false);
  const [paymentWindowFreeItems, setPaymentWindowFreeItems] = useState<FreeItem[]>([]);
  
  // Payment Success Modal state
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState<boolean>(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<{ payment: any; sale: Sale | null } | null>(null);
  
  // Returns state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<Sale | null>(null);
  const [returnItems, setReturnItems] = useState<Array<{ inventoryItemId: string; quantity: number; replacementItemId?: string; replacementQuantity?: number }>>([]);
  const [returnReason, setReturnReason] = useState<string>('');
  
  // Sales Entry Modal state
  const [showSalesEntryModal, setShowSalesEntryModal] = useState(false);
  
  // Search state
  const [salesSearchQuery, setSalesSearchQuery] = useState<string>('');

  useEffect(() => {
    loadShopDetails();
    loadAllocatedProducts();
    loadInventoryItems();
    loadShopSales();
  }, [shopId]);

  // Load allocated products (refreshed on component mount and when shopId changes)
  useEffect(() => {
    loadAllocatedProducts();
    loadInventoryItems();
    
    // Refresh when window gains focus (user switches back to tab)
    const handleFocus = () => {
      loadAllocatedProducts();
      loadInventoryItems();
    };
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const loadShopDetails = async () => {
    try {
      const shopData = await buyerAPI.getById(shopId);
      setShop(shopData);
    } catch (error) {
      console.error('Failed to load shop details:', error);
      alert('Failed to load shop details');
    } finally {
      setLoading(false);
    }
  };

  const loadAllocatedProducts = async () => {
    try {
      const data = await productionAPI.getSalespersonInventory();
      setAllocatedProducts(data.map((item: any) => ({
        id: item.id || item.product_id,
        name: item.name || item.product_name,
        unit: item.unit || 'piece',
        stock: item.currentStock || item.stock || 0,
        price: item.price || 0
      })));
    } catch (error) {
      console.error('Failed to load allocated products:', error);
      setAllocatedProducts([]);
    }
  };

  const loadInventoryItems = async () => {
    try {
      const data = await productionAPI.getSalespersonInventory();
      setInventoryItems(data.map((item: any) => ({
        id: item.id || item.product_id,
        name: item.name || item.product_name,
        category: 'Allocated Product',
        unit: item.unit || 'piece',
        currentStock: item.currentStock || item.stock || 0,
        price: item.price || 0,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString()
      })));
    } catch (error) {
      console.error('Failed to load inventory:', error);
      setInventoryItems([]);
    }
  };

  const loadShopSales = async () => {
    try {
      const sales = await salesAPI.getAll({ buyerId: shopId });
      setShopSales(sales);
    } catch (error) {
      console.error('Failed to load shop sales:', error);
      setShopSales([]);
    }
  };

  const getPaymentStatus = (sale: Sale): 'pending' | 'ongoing' | 'completed' => {
    if (!sale) return 'pending';
    const totalPaid = (sale as any).totalPaid || 0;
    const totalAmount = sale.totalAmount || 0;
    const pendingCash = (sale as any).pendingCash || 0;
    const pendingCheque = (sale as any).pendingCheque || 0;
    
    if (totalPaid >= totalAmount && pendingCash === 0 && pendingCheque === 0) {
      return 'completed';
    }
    if (totalPaid > 0 || pendingCash > 0 || pendingCheque > 0) {
      return 'ongoing';
    }
    return 'pending';
  };

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toFixed(2)}`;
  };

  const handleProcessPayment = async (sale: Sale) => {
    setSelectedSaleForPayment(sale);
    setPaymentWindowFreeItems([]);
    const pendingAmount = (sale.totalAmount || 0) - ((sale as any).totalPaid || 0);
    const pendingCheque = (sale as any).pendingCheque || 0;
    const pendingCash = (sale as any).pendingCash || 0;
    
    // Fetch previous payments for this sale to get cheque details
    try {
      const payments = await paymentsAPI.getAll({ saleId: sale.id });
      setHasPreviousPayments(payments.length > 0);
      
      // Find the most recent pending cheque payment (cheque status = pending)
      const pendingChequePayment = payments
        .filter(p => p.chequeAmount && p.chequeAmount > 0 && p.chequeStatus === 'pending')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      
      // Check if there's a pending cheque - if so, automatically select cheque payment method and fill details
      if (pendingCheque > 0 && pendingChequePayment) {
        setPaymentWindowMethod('cheque');
        setPaymentWindowCheque(pendingCheque);
        setPaymentWindowCash(0);
        // Auto-fill cheque details from previous payment
        setPaymentWindowChequeNumber(pendingChequePayment.chequeNumber || '');
        setPaymentWindowChequeBank(pendingChequePayment.chequeBank || '');
        
        // Convert expiry date to YYYY-MM-DD format for HTML date input
        const expiryDate = pendingChequePayment.expiryDate || pendingChequePayment.returnDate || '';
        if (expiryDate) {
          const date = new Date(expiryDate);
          if (!isNaN(date.getTime())) {
            const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
            setPaymentWindowChequeExpiry(formattedDate);
          } else {
            setPaymentWindowChequeExpiry(expiryDate); // If it's already in the correct format
          }
        } else {
          setPaymentWindowChequeExpiry('');
        }
      } else if (pendingCash > 0) {
        // Ongoing payment with cash pending - only allow cash
        setPaymentWindowMethod('cash');
        setPaymentWindowCash(pendingCash);
        setPaymentWindowCheque(0);
        setPaymentWindowChequeNumber('');
        setPaymentWindowChequeBank('');
        setPaymentWindowChequeExpiry('');
      } else {
        // No payment record (ongoing sale) - only allow cash
        setPaymentWindowMethod('cash');
        setPaymentWindowCash(pendingAmount);
        setPaymentWindowCheque(0);
        setPaymentWindowChequeNumber('');
        setPaymentWindowChequeBank('');
        setPaymentWindowChequeExpiry('');
      }
    } catch (error) {
      console.error('Failed to load payment details:', error);
      // Fallback to default behavior if fetching fails
      setHasPreviousPayments(false);
      if (pendingCheque > 0) {
        setPaymentWindowMethod('cheque');
        setPaymentWindowCheque(pendingCheque);
        setPaymentWindowCash(0);
      } else {
        setPaymentWindowMethod('cash');
        setPaymentWindowCash(pendingCash || pendingAmount);
        setPaymentWindowCheque(0);
      }
      setPaymentWindowChequeNumber('');
      setPaymentWindowChequeBank('');
      setPaymentWindowChequeExpiry('');
    }
    
    setShowPaymentWindow(true);
  };

  const handleCompletePayment = async () => {
    if (!selectedSaleForPayment) return;
    
    const saleTotal = selectedSaleForPayment.totalAmount || 0;
    const totalPaid = (selectedSaleForPayment as any).totalPaid || 0;
    const remainingBalance = saleTotal - totalPaid;
    
    // Read amounts from state - convert to numbers
    let cashAmt = 0;
    let chequeAmt = 0;
    
    // Handle cash amount
    if (typeof paymentWindowCash === 'number') {
      cashAmt = paymentWindowCash;
    } else if (typeof paymentWindowCash === 'string' && paymentWindowCash.trim() !== '') {
      const parsed = parseFloat(paymentWindowCash);
      cashAmt = isNaN(parsed) ? 0 : parsed;
    }
    
    // Handle cheque amount
    if (typeof paymentWindowCheque === 'number') {
      chequeAmt = paymentWindowCheque;
    } else if (typeof paymentWindowCheque === 'string' && paymentWindowCheque.trim() !== '') {
      const parsed = parseFloat(paymentWindowCheque);
      chequeAmt = isNaN(parsed) ? 0 : parsed;
    }
    
    // Ensure non-negative
    cashAmt = Math.max(0, cashAmt);
    chequeAmt = Math.max(0, chequeAmt);
    
    // Determine final amounts based on payment method
    let finalCashAmt = 0;
    let finalChequeAmt = 0;
    
    if (paymentWindowMethod === 'cash') {
      finalCashAmt = cashAmt;
      if (finalCashAmt <= 0) {
        alert('Payment amount must be greater than 0. Please enter a cash amount.');
        return;
      }
    } else if (paymentWindowMethod === 'cheque') {
      finalChequeAmt = chequeAmt;
      if (finalChequeAmt <= 0) {
        alert('Payment amount must be greater than 0. Please enter a cheque amount.');
        return;
      }
    } else if (paymentWindowMethod === 'split') {
      finalCashAmt = cashAmt;
      finalChequeAmt = chequeAmt;
      if (finalCashAmt <= 0 && finalChequeAmt <= 0) {
        alert('Payment amount must be greater than 0. Please enter at least one payment amount (cash or cheque).');
        return;
      }
    } else if (paymentWindowMethod === 'ongoing') {
      // Ongoing payments: cash only, amount can be 0 or greater
      finalCashAmt = cashAmt;
      if (finalCashAmt < 0) {
        alert('Payment amount cannot be negative.');
        return;
      }
      // Allow 0 for ongoing payments (partial settlement)
    }
    
    const paymentAmount = finalCashAmt + finalChequeAmt;
    
    // For ongoing payments, allow 0 amount (partial settlement)
    if (paymentWindowMethod !== 'ongoing' && paymentAmount <= 0) {
      alert('Payment amount must be greater than 0');
      return;
    }
    
    // For ongoing payments, if amount is 0, that's allowed (just marking as ongoing)
    if (paymentWindowMethod === 'ongoing' && paymentAmount === 0) {
      // This is allowed - it means the sale is marked as ongoing with no payment yet
    }
    if (paymentAmount > remainingBalance) {
      alert(`Payment amount (${formatCurrency(paymentAmount)}) exceeds remaining balance (${formatCurrency(remainingBalance)})`);
      return;
    }
    
    // Validate cheque details if cheque amount > 0
    if (finalChequeAmt > 0) {
      if (!paymentWindowChequeNumber || paymentWindowChequeNumber.trim() === '') {
        alert('Please enter cheque number');
        return;
      }
      if (!paymentWindowChequeExpiry || paymentWindowChequeExpiry.trim() === '') {
        alert('Please enter cheque expiry date');
        return;
      }
    }

    // Validate free items (optional)
    if (
      paymentWindowFreeItems.some((fi) => !fi.inventoryItemId || !(Number(fi.quantity) > 0))
    ) {
      alert('Please fill Free Items correctly (product + quantity > 0), or remove invalid rows.');
      return;
    }

    try {
      // Use the validated amounts
      const paymentData: CreatePaymentData = {
        saleId: selectedSaleForPayment.id,
        paymentMethod: paymentWindowMethod,
        amount: paymentAmount,
        cashAmount: finalCashAmt,
        chequeAmount: finalChequeAmt,
        ...(finalChequeAmt > 0 && {
          chequeNumber: paymentWindowChequeNumber,
          chequeBank: paymentWindowChequeBank || undefined,
          expiryDate: paymentWindowChequeExpiry
        }),
        ...(paymentWindowFreeItems.length > 0 && {
          freeItems: paymentWindowFreeItems
            .filter((fi) => fi.inventoryItemId && Number(fi.quantity) > 0)
            .map((fi) => ({ inventoryItemId: fi.inventoryItemId, quantity: Number(fi.quantity) }))
        })
      };

      console.log('Creating payment with data:', JSON.stringify(paymentData, null, 2)); // Debug log

      // For ongoing payments with 0 amount, don't create payment record
      // Just mark the sale as ongoing
      if (paymentWindowMethod === 'ongoing' && paymentAmount === 0) {
        // Sale remains in pending/ongoing state, no payment record created
        setShowPaymentWindow(false);
        setSelectedSaleForPayment(null);
        loadShopSales(); // Refresh sales to show updated payment status
        return;
      }
      
      const createdPayment = await paymentsAPI.create(paymentData);
      
      // Generate and print receipt (only if payment was created and not ongoing with 0 amount)
      if (paymentWindowMethod !== 'ongoing' || paymentAmount > 0) {
        generateReceipt(createdPayment, selectedSaleForPayment);
      }
      
      // Show success modal
      setPaymentSuccessData({
        payment: createdPayment || { paymentMethod: paymentWindowMethod, amount: paymentAmount },
        sale: selectedSaleForPayment
      });
      setShowPaymentSuccessModal(true);
      setShowPaymentWindow(false);
      
      // Reset payment window state
      setSelectedSaleForPayment(null);
      setPaymentWindowCash(0);
      setPaymentWindowCheque(0);
      setPaymentWindowChequeNumber('');
      setPaymentWindowChequeBank('');
      setPaymentWindowChequeExpiry('');
      
      loadShopSales(); // Refresh sales to show updated payment status
    } catch (error: any) {
      console.error('Payment creation error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to process payment';
      alert(errorMessage);
    }
  };

  const generateReceipt = (payment: any, sale: Sale) => {
    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) {
      alert('Please allow popups to generate receipt');
      return;
    }
    
    const freeItemsHtml =
      paymentWindowFreeItems.length > 0
        ? `
          <div class="section">
            <h3>Free Items Given</h3>
            ${paymentWindowFreeItems
              .filter((fi) => fi.inventoryItemId && Number(fi.quantity) > 0)
              .map((fi) => {
                const p = inventoryItems.find((x) => x.id === fi.inventoryItemId);
                const name = p?.name || 'Product';
                return `<div class="row"><span class="label">${name}:</span><span>${Number(fi.quantity).toFixed(2)}</span></div>`;
              })
              .join('')}
          </div>
        `
        : '';

    const receiptContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 5px 0; }
          .section { margin: 15px 0; }
          .section h3 { margin: 10px 0 5px 0; font-size: 16px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
          .row { display: flex; justify-content: space-between; margin: 5px 0; }
          .label { font-weight: bold; }
          .total { font-size: 18px; font-weight: bold; margin-top: 10px; padding-top: 10px; border-top: 2px solid #000; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PAYMENT RECEIPT</h1>
          <p>Yogurt ERP System</p>
          <p>${new Date().toLocaleString()}</p>
        </div>
        
        <div class="section">
          <div class="row">
            <span class="label">Shop Name:</span>
            <span>${shop?.shopName || 'N/A'}</span>
          </div>
          <div class="row">
            <span class="label">Sale ID:</span>
            <span>${sale.id.substring(0, 8)}...</span>
          </div>
          <div class="row">
            <span class="label">Date:</span>
            <span>${new Date(sale.date).toLocaleDateString()}</span>
          </div>
        </div>
        
        <div class="section">
          <h3>Payment Details</h3>
          <div class="row">
            <span class="label">Sale Amount:</span>
            <span>${formatCurrency(sale.totalAmount)}</span>
          </div>
          <div class="row">
            <span class="label">Payment Method:</span>
            <span>${paymentWindowMethod.toUpperCase()}</span>
          </div>
          ${paymentWindowCash > 0 ? `<div class="row"><span class="label">Cash:</span><span>${formatCurrency(paymentWindowCash)}</span></div>` : ''}
          ${paymentWindowCheque > 0 ? `
            <div class="row"><span class="label">Cheque:</span><span>${formatCurrency(paymentWindowCheque)}</span></div>
            <div class="row"><span class="label">Cheque Number:</span><span>${paymentWindowChequeNumber}</span></div>
            ${paymentWindowChequeBank ? `<div class="row"><span class="label">Bank:</span><span>${paymentWindowChequeBank}</span></div>` : ''}
            <div class="row"><span class="label">Expiry Date:</span><span>${new Date(paymentWindowChequeExpiry).toLocaleDateString()}</span></div>
          ` : ''}
          <div class="row total">
            <span>Total Paid:</span>
            <span>${formatCurrency(paymentWindowCash + paymentWindowCheque)}</span>
          </div>
        </div>

        ${freeItemsHtml}
        
        <div class="footer">
          <p>Thank you for your payment!</p>
          <button onclick="window.print()">Print Receipt</button>
        </div>
      </body>
      </html>
    `;
    
    receiptWindow.document.write(receiptContent);
    receiptWindow.document.close();
  };

  const handleShowReturn = (sale: Sale) => {
    setSelectedSaleForReturn(sale);
    setReturnItems([]);
    setReturnReason('');
    setShowReturnModal(true);
  };

  const handleCreateReturn = async () => {
    if (!selectedSaleForReturn || returnItems.length === 0) {
      alert('Please add items to return');
      return;
    }
    
    if (returnItems.some(item => !item.inventoryItemId || item.quantity <= 0)) {
      alert('Please fill all return item details correctly');
      return;
    }

    try {
      const returnData: CreateReturnData = {
        originalSaleId: selectedSaleForReturn.id,
        date: new Date().toISOString().split('T')[0],
        reason: returnReason || undefined,
        items: returnItems.map(item => ({
          inventoryItemId: item.inventoryItemId,
          quantity: item.quantity,
          replacementItemId: item.replacementItemId,
          replacementQuantity: item.replacementQuantity
        }))
      };

      await returnsAPI.create(returnData);
      alert('Return processed successfully!');
      setShowReturnModal(false);
      setSelectedSaleForReturn(null);
      setReturnItems([]);
      setReturnReason('');
      loadShopSales(); // Refresh sales
      loadAllocatedProducts(); // Refresh inventory
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to process return');
    }
  };

  const addSaleItem = () => {
    setSaleItems([...saleItems, { inventoryItemId: '', quantity: 0, unitPrice: 0 }]);
  };

  const updateSaleItem = (index: number, field: keyof SaleItem, value: any) => {
    const newItems = [...saleItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-fill price when item is selected
    if (field === 'inventoryItemId' && value) {
      const item = inventoryItems.find(i => i.id === value);
      if (item && !newItems[index].unitPrice) {
        newItems[index].unitPrice = item.price || 0;
      }
    }
    
    setSaleItems(newItems);
  };

  const removeSaleItem = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return saleItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);
  };

  const handleCreateSale = async () => {
    if (!shopId) {
      alert('Shop not selected');
      return;
    }
    if (saleItems.length === 0) {
      alert('Please add at least one product');
      return;
    }
    if (saleItems.some(item => !item.inventoryItemId || item.quantity <= 0)) {
      alert('Please fill all product details correctly');
      return;
    }

    try {
      const saleData: CreateSaleData = {
        buyerId: shopId,
        date: new Date().toISOString().split('T')[0],
        paymentStatus: 'pending',
        items: saleItems.map(item => ({
          inventoryItemId: item.inventoryItemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        }))
      };

      const createdSale = await salesAPI.create(saleData);
      
      // Create payment based on payment method
      // Cash payments: mark as paid immediately (not in pending)
      // Cheque payments: remain pending until cleared
      // Ongoing: no payment created, sale remains pending for partial payments
      const totalPaymentAmount = cashAmount + chequeAmount;
      const saleTotal = calculateTotal();
      
      if (paymentMethod === 'cash' && cashAmount > 0) {
        // Cash payment - mark as paid immediately
        await paymentsAPI.create({
          saleId: createdSale.id,
          paymentMethod: 'cash',
          amount: Math.min(cashAmount, saleTotal),
          cashAmount: Math.min(cashAmount, saleTotal),
          chequeAmount: 0
        });
      } else if (paymentMethod === 'cheque' && chequeAmount > 0) {
        // Cheque payment - remains pending until cleared
        if (!chequeNumber) {
          alert('Please enter cheque number');
          return;
        }
        if (!chequeExpiryDate) {
          alert('Please enter cheque expiry date');
          return;
        }
        await paymentsAPI.create({
          saleId: createdSale.id,
          paymentMethod: 'cheque',
          amount: Math.min(chequeAmount, saleTotal),
          cashAmount: 0,
          chequeAmount: Math.min(chequeAmount, saleTotal),
          chequeNumber: chequeNumber,
          chequeBank: chequeBank || undefined,
          expiryDate: chequeExpiryDate
        });
      } else if (paymentMethod === 'split' && (cashAmount > 0 || chequeAmount > 0)) {
        // Split payment: cash part paid immediately, cheque part pending
        if (chequeAmount > 0 && !chequeNumber) {
          alert('Please enter cheque number');
          return;
        }
        if (chequeAmount > 0 && !chequeExpiryDate) {
          alert('Please enter cheque expiry date');
          return;
        }
        await paymentsAPI.create({
          saleId: createdSale.id,
          paymentMethod: 'split',
          amount: Math.min(cashAmount + chequeAmount, saleTotal),
          cashAmount: Math.min(cashAmount, saleTotal),
          chequeAmount: Math.min(chequeAmount, saleTotal - Math.min(cashAmount, saleTotal)),
          chequeNumber: chequeAmount > 0 ? chequeNumber : undefined,
          chequeBank: chequeAmount > 0 ? (chequeBank || undefined) : undefined,
          expiryDate: chequeAmount > 0 ? chequeExpiryDate : undefined
        });
      }
      // For 'ongoing' payment method, no payment is created - sale remains pending
      
      alert('Sale created successfully!');
      setSaleItems([]);
      setPaymentMethod('cash');
      setCashAmount(0);
      setChequeAmount(0);
      setChequeNumber('');
      setChequeBank('');
      setChequeExpiryDate('');
      setShowSalesEntryModal(false);
      loadAllocatedProducts(); // Refresh allocated products
      loadShopSales(); // Refresh sales history to show the new sale
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create sale');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="p-4">
        <button onClick={onBack} className="mb-4 text-primary-600 flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <div className="text-center text-gray-500">Shop not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="p-4">
          <button 
            onClick={onBack} 
            className="mb-4 text-primary-600 flex items-center gap-2 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Shops
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{shop.shopName}</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Shop Information Section */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Shop Information</h2>
          <div className="space-y-2 text-sm">
            {shop.contact && (
              <div>
                <span className="font-medium text-gray-700">Phone: </span>
                <span className="text-gray-600">{shop.contact}</span>
              </div>
            )}
            {shop.address && (
              <div>
                <span className="font-medium text-gray-700">Address: </span>
                <span className="text-gray-600">{shop.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Allocated Products Section (Read-Only) - Cards in one row */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Daily Allocated Products</h2>
          {allocatedProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {allocatedProducts.map((product) => (
                <div 
                  key={product.id}
                  className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg border border-primary-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="text-center">
                    <h3 className="text-base font-semibold text-gray-900 mb-2">{product.name}</h3>
                    <p className="text-2xl font-bold text-primary-700">
                      {parseFloat(product.stock || 0).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{product.unit || 'piece'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              No products allocated for today
            </div>
          )}
        </div>

        {/* Pending Payments Section - Professional UI */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-primary-600" />
                Pending Payments & Cheques
              </h2>
              <p className="text-sm text-gray-500 mt-1.5">Manage and settle pending payments from shops</p>
            </div>
            <div className="relative w-full sm:w-auto sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={salesSearchQuery}
                onChange={(e) => setSalesSearchQuery(e.target.value)}
                placeholder="Search by shop, mobile, items..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm bg-white"
              />
            </div>
          </div>
          
          {(() => {
            // Filter only pending/ongoing sales (exclude completed)
            const pendingSales = shopSales.filter((sale) => {
              const status = getPaymentStatus(sale);
              return status === 'pending' || status === 'ongoing';
            });
            
            // Filter based on search query if provided
            const filteredSales = pendingSales.filter((sale) => {
              if (!salesSearchQuery.trim()) return true;
              
              const query = salesSearchQuery.toLowerCase().trim();
              const shopName = (sale.customerName || shop?.shopName || '').toLowerCase();
              const address = (sale.address || shop?.address || '').toLowerCase();
              const contact = (sale.contact || shop?.contact || '').toLowerCase();
              const items = (sale.items || []).map(item => item.productName || '').join(' ').toLowerCase();
              
              return (
                shopName.includes(query) ||
                address.includes(query) ||
                contact.includes(query) ||
                items.includes(query)
              );
            });
            
            return filteredSales.length > 0 ? (
              <div className="space-y-4">
                {filteredSales.map((sale) => {
                  const status = getPaymentStatus(sale);
                  const totalPaid = sale.totalPaid || 0;
                  const pendingAmount = sale.pendingAmount || ((sale.totalAmount || 0) - totalPaid);
                  const pendingCash = sale.pendingCash || 0;
                  const pendingCheque = sale.pendingCheque || 0;
                  const saleItems = sale.items || [];
                  const purchaseItems = saleItems.filter(item => !item.isReturn);
                  
                  return (
                    <div 
                      key={sale.id} 
                      className="bg-gradient-to-r from-gray-50 to-white rounded-xl border-2 border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all duration-200 overflow-hidden"
                    >
                      <div className="p-5">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          {/* Left: Shop Info, Items, Payment Details */}
                          <div className="flex-1 min-w-0 space-y-4">
                            {/* Shop Header with Status */}
                            <div className="flex items-start justify-between gap-4 pb-3 border-b border-gray-200">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-900 text-lg mb-2">
                                  {shop?.shopName || sale.customerName || 'N/A'}
                                </h3>
                                <div className="space-y-1.5">
                                  {(sale.address || shop?.address) && (
                                    <p className="text-sm text-gray-600 flex items-center gap-2">
                                      <span className="text-gray-400">📍</span>
                                      <span className="truncate">{sale.address || shop?.address}</span>
                                    </p>
                                  )}
                                  {(sale.contact || shop?.contact) && (
                                    <p className="text-sm text-gray-600 flex items-center gap-2">
                                      <span className="text-gray-400">📞</span>
                                      <span>{sale.contact || shop?.contact}</span>
                                    </p>
                                  )}
                                </div>
                              </div>
                              <span
                                className={`inline-flex items-center px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap shadow-sm ${
                                  status === 'ongoing'
                                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                    : 'bg-red-100 text-red-800 border border-red-300'
                                }`}
                              >
                                {status === 'ongoing' ? 'Ongoing' : 'Pending'}
                              </span>
                            </div>
                            
                            {/* Purchase Items - Better Layout */}
                            {purchaseItems.length > 0 && (
                              <div className="bg-white rounded-lg p-4 border border-gray-100">
                                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">Purchase Items</p>
                                <div className="space-y-2">
                                  {purchaseItems.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                                      <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-900">{item.productName || 'Unknown Product'}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <p className="text-xs text-gray-500">Qty: {item.quantity} × Rs. {(item.unitPrice || item.price || 0).toFixed(2)}</p>
                                          {(item.freeQuantity || 0) > 0 && (
                                            <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Free-{item.freeQuantity}</span>
                                          )}
                                          {item.isReturn && (
                                            <span className="text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Return-{item.quantity}</span>
                                          )}
                                        </div>
                                      </div>
                                      <p className="text-sm font-bold text-gray-900">
                                        Rs. {((item.unitPrice || item.price || 0) * item.quantity).toFixed(2)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Payment Summary - Professional Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Total</p>
                                <p className="text-base font-bold text-gray-900">{formatCurrency(sale.totalAmount)}</p>
                              </div>
                              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                <p className="text-xs font-semibold text-green-700 uppercase mb-1">Paid</p>
                                <p className="text-base font-bold text-green-700">{formatCurrency(totalPaid)}</p>
                              </div>
                              <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                                <p className="text-xs font-semibold text-red-700 uppercase mb-1">Pending</p>
                                <p className="text-base font-bold text-red-700">{formatCurrency(pendingAmount)}</p>
                              </div>
                              <div className={`rounded-lg p-3 border ${
                                pendingCash > 0 && pendingCheque > 0
                                  ? 'bg-orange-50 border-orange-200'
                                  : pendingCheque > 0
                                  ? 'bg-blue-50 border-blue-200'
                                  : pendingCash > 0
                                  ? 'bg-yellow-50 border-yellow-200'
                                  : 'bg-gray-50 border-gray-200'
                              }`}>
                                <p className={`text-xs font-semibold uppercase mb-1 ${
                                  pendingCash > 0 && pendingCheque > 0
                                    ? 'text-orange-700'
                                    : pendingCheque > 0
                                    ? 'text-blue-700'
                                    : pendingCash > 0
                                    ? 'text-yellow-700'
                                    : 'text-gray-700'
                                }`}>
                                  {pendingCash > 0 && pendingCheque > 0 ? 'Cash+Cheque' : pendingCheque > 0 ? 'Cheque' : pendingCash > 0 ? 'Cash' : 'Type'}
                                </p>
                                <p className={`text-base font-bold ${
                                  pendingCash > 0 && pendingCheque > 0
                                    ? 'text-orange-700'
                                    : pendingCheque > 0
                                    ? 'text-blue-700'
                                    : pendingCash > 0
                                    ? 'text-yellow-700'
                                    : 'text-gray-700'
                                }`}>
                                  {pendingCash > 0 && pendingCheque > 0
                                    ? `${formatCurrency(pendingCash + pendingCheque)}`
                                    : pendingCheque > 0
                                    ? formatCurrency(pendingCheque)
                                    : pendingCash > 0
                                    ? formatCurrency(pendingCash)
                                    : '-'}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Right: Action Button */}
                          <div className="flex-shrink-0 lg:ml-6 flex items-center lg:items-start">
                            {pendingAmount > 0 && (
                              <button
                                onClick={() => handleProcessPayment(sale)}
                                className="w-full lg:w-auto btn-primary flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold whitespace-nowrap shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
                                title="Settle Payment"
                              >
                                <CreditCard className="w-5 h-5" />
                                Settle Payment
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : shopSales.length > 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium mb-1">No pending payments found</p>
                <p className="text-sm text-gray-400">All payments have been settled</p>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium mb-1">No sales found for this shop</p>
                <p className="text-sm text-gray-400">Create a sale to get started</p>
              </div>
            );
          })()}
        </div>

        {/* Sales Entry Section - Button to Open Modal */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <button
            onClick={() => setShowSalesEntryModal(true)}
            className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-base font-medium"
          >
            <Plus className="w-5 h-5" />
            Sales Entry
          </button>
        </div>
      </div>

      {/* Sales Entry Modal */}
      {showSalesEntryModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSalesEntryModal(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Sales Entry</h2>
              <button
                onClick={() => setShowSalesEntryModal(false)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Add Item Button */}
              <div className="flex justify-end">
                <button
                  onClick={addSaleItem}
                  className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              {/* Sale Items */}
              {saleItems.length > 0 ? (
                <div className="space-y-3">
                  {saleItems.map((item, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1 text-gray-700">Item *</label>
                          <select
                            value={item.inventoryItemId}
                            onChange={(e) => updateSaleItem(index, 'inventoryItemId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                            required
                          >
                            <option value="">Select product...</option>
                            {inventoryItems.map((inv) => (
                              <option key={inv.id} value={inv.id}>
                                {inv.name} - Rs. {inv.price.toFixed(2)}/{inv.unit}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium mb-1 text-gray-700">Quantity *</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.quantity || ''}
                              onChange={(e) => updateSaleItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1 text-gray-700">Price per Unit *</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unitPrice || ''}
                              onChange={(e) => updateSaleItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                              required
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-gray-700">
                            Subtotal: <span className="text-primary-600">Rs. {((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}</span>
                          </div>
                          <button
                            onClick={() => removeSaleItem(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 text-sm">
                  No items added. Click "Add Item" to start.
                </div>
              )}

              {/* Total Amount */}
              {saleItems.length > 0 && (
                <>
                  <div className="p-4 bg-primary-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-semibold text-gray-900">Total Amount:</span>
                      <span className="text-xl font-bold text-primary-600">
                        Rs. {calculateTotal().toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Method Selection */}
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment Method (Optional)</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">Select Payment Method</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => {
                            const method = e.target.value as 'cash' | 'cheque' | 'split' | 'ongoing';
                            setPaymentMethod(method);
                            if (method === 'cash') {
                              setCashAmount(calculateTotal()); // Auto-fill with total for cash
                              setChequeAmount(0);
                              setChequeNumber('');
                              setChequeBank('');
                              setChequeExpiryDate('');
                            } else if (method === 'cheque') {
                              setCashAmount(0);
                              setChequeAmount(calculateTotal()); // Auto-fill with total for cheque
                              setChequeNumber('');
                              setChequeBank('');
                              setChequeExpiryDate('');
                            } else if (method === 'ongoing') {
                              setCashAmount(0);
                              setChequeAmount(0);
                              setChequeNumber('');
                              setChequeBank('');
                              setChequeExpiryDate('');
                            } else {
                              setCashAmount(0);
                              setChequeAmount(0);
                              setChequeNumber('');
                              setChequeBank('');
                              setChequeExpiryDate('');
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                        >
                          <option value="cash">Cash (Paid Immediately)</option>
                          <option value="cheque">Cheque (Pending until Cleared)</option>
                          <option value="split">Cash + Cheque</option>
                          <option value="ongoing">Ongoing (Partial Payment)</option>
                        </select>
                      </div>

                      {/* Cash Amount */}
                      {(paymentMethod === 'cash' || paymentMethod === 'split') && (
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700">
                            Cash Amount <span className="text-xs text-gray-500">(Max: Rs. {calculateTotal().toFixed(2)})</span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={calculateTotal()}
                            value={cashAmount || ''}
                            onChange={(e) => {
                              const amt = parseFloat(e.target.value) || 0;
                              const total = calculateTotal();
                              setCashAmount(Math.min(amt, total));
                              if (paymentMethod === 'split') {
                                setChequeAmount(Math.max(0, total - Math.min(amt, total)));
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                            placeholder="Enter cash amount (optional)"
                          />
                        </div>
                      )}

                      {/* Cheque Amount and Details */}
                      {(paymentMethod === 'cheque' || paymentMethod === 'split') && (
                        <>
                          <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700">
                              Cheque Amount <span className="text-xs text-gray-500">(Max: Rs. {calculateTotal().toFixed(2)})</span>
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max={calculateTotal()}
                              value={chequeAmount || ''}
                              onChange={(e) => {
                                const amt = parseFloat(e.target.value) || 0;
                                const total = calculateTotal();
                                setChequeAmount(Math.min(amt, total));
                                if (paymentMethod === 'split') {
                                  setCashAmount(Math.max(0, total - Math.min(amt, total)));
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                              placeholder="Enter cheque amount (optional)"
                            />
                          </div>
                          {chequeAmount > 0 && (
                            <>
                              <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">Cheque Number *</label>
                                <input
                                  type="text"
                                  value={chequeNumber}
                                  onChange={(e) => setChequeNumber(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                                  required={chequeAmount > 0}
                                  placeholder="Enter cheque number"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">Bank Name</label>
                                <input
                                  type="text"
                                  value={chequeBank}
                                  onChange={(e) => setChequeBank(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                                  placeholder="Enter bank name (optional)"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">Cheque Expiry Date *</label>
                                <input
                                  type="date"
                                  value={chequeExpiryDate}
                                  onChange={(e) => setChequeExpiryDate(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                                  required={chequeAmount > 0}
                                />
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        setSaleItems([]);
                        setPaymentMethod('cash');
                        setCashAmount(0);
                        setChequeAmount(0);
                        setChequeNumber('');
                        setChequeBank('');
                        setChequeExpiryDate('');
                      }}
                      className="btn-secondary flex-1 py-2.5 text-sm"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleCreateSale}
                      className="btn-primary flex-1 py-2.5 text-sm"
                    >
                      Create Sale
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Window Modal */}
      {showPaymentWindow && selectedSaleForPayment && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPaymentWindow(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Process Payment</h2>
              <button
                onClick={() => setShowPaymentWindow(false)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium">Shop Name:</span>
                    <span>{shop?.shopName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Sale Amount:</span>
                    <span>{formatCurrency(selectedSaleForPayment.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Total Paid:</span>
                    <span className="text-green-600">{formatCurrency((selectedSaleForPayment as any).totalPaid || 0)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                    <span>Remaining Balance:</span>
                    <span className="text-red-600">{formatCurrency((selectedSaleForPayment.totalAmount || 0) - ((selectedSaleForPayment as any).totalPaid || 0))}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Payment Method *</label>
                <select
                  value={paymentWindowMethod}
                  onChange={(e) => {
                    const method = e.target.value as 'cash' | 'cheque' | 'split' | 'ongoing';
                    setPaymentWindowMethod(method);
                    // Only reset fields if changing method (not if auto-filled)
                    if (method === 'cash') {
                      setPaymentWindowCheque(0);
                      setPaymentWindowChequeNumber('');
                      setPaymentWindowChequeBank('');
                      setPaymentWindowChequeExpiry('');
                    } else if (method === 'cheque') {
                      setPaymentWindowCash(0);
                    } else if (method === 'ongoing') {
                      setPaymentWindowCheque(0);
                      setPaymentWindowChequeNumber('');
                      setPaymentWindowChequeBank('');
                      setPaymentWindowChequeExpiry('');
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="split">Cash + Cheque</option>
                  <option value="ongoing">Ongoing</option>
                </select>
              </div>

              {(paymentWindowMethod === 'cash' || paymentWindowMethod === 'split' || paymentWindowMethod === 'ongoing') && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Cash Amount {paymentWindowMethod === 'ongoing' ? '(can be 0)' : '*'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentWindowCash || ''}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      const amt = inputValue === '' ? 0 : parseFloat(inputValue);
                      if (!isNaN(amt) && amt >= 0) {
                        const remaining = (selectedSaleForPayment.totalAmount || 0) - ((selectedSaleForPayment as any).totalPaid || 0);
                        setPaymentWindowCash(Math.min(amt, remaining));
                        if (paymentWindowMethod === 'split') {
                          setPaymentWindowCheque(Math.max(0, remaining - Math.min(amt, remaining)));
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder={paymentWindowMethod === 'ongoing' ? "Enter cash amount (0 or more)" : "Enter cash amount"}
                    required={paymentWindowMethod !== 'ongoing'}
                  />
                  {paymentWindowMethod === 'ongoing' && (
                    <p className="text-xs text-gray-500 mt-1">Ongoing payments can only use cash. Enter 0 to mark as ongoing with no payment, or enter an amount for partial settlement.</p>
                  )}
                </div>
              )}

              {(paymentWindowMethod === 'cheque' || paymentWindowMethod === 'split') && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Cheque Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentWindowCheque || ''}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        const amt = inputValue === '' ? 0 : parseFloat(inputValue);
                        if (!isNaN(amt) && amt >= 0) {
                          const remaining = (selectedSaleForPayment.totalAmount || 0) - ((selectedSaleForPayment as any).totalPaid || 0);
                          setPaymentWindowCheque(Math.min(amt, remaining));
                          if (paymentWindowMethod === 'split') {
                            setPaymentWindowCash(Math.max(0, remaining - Math.min(amt, remaining)));
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter cheque amount"
                      required
                    />
                  </div>
                  {paymentWindowCheque > 0 && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">Cheque Number *</label>
                        <input
                          type="text"
                          value={paymentWindowChequeNumber}
                          onChange={(e) => setPaymentWindowChequeNumber(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          required
                          placeholder="Enter cheque number"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">Bank Name</label>
                        <input
                          type="text"
                          value={paymentWindowChequeBank}
                          onChange={(e) => setPaymentWindowChequeBank(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Enter bank name (optional)"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">Cheque Expiry Date *</label>
                        <input
                          type="date"
                          value={paymentWindowChequeExpiry}
                          onChange={(e) => setPaymentWindowChequeExpiry(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Free Items (Optional) */}
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-gray-900">Free Items Given (Optional)</div>
                  <button
                    type="button"
                    onClick={() => setPaymentWindowFreeItems([...paymentWindowFreeItems, { inventoryItemId: '', quantity: 0 }])}
                    className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                  >
                    + Add
                  </button>
                </div>

                {paymentWindowFreeItems.length === 0 ? (
                  <div className="text-xs text-gray-500">No free items added.</div>
                ) : (
                  <div className="space-y-2">
                    {paymentWindowFreeItems.map((fi, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-7">
                          <select
                            value={fi.inventoryItemId}
                            onChange={(e) => {
                              const next = [...paymentWindowFreeItems];
                              next[idx] = { ...next[idx], inventoryItemId: e.target.value };
                              setPaymentWindowFreeItems(next);
                            }}
                            className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="">Select product</option>
                            {allocatedProducts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (Stock: {p.stock})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-4">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={fi.quantity || ''}
                            onChange={(e) => {
                              const qty = parseFloat(e.target.value) || 0;
                              const next = [...paymentWindowFreeItems];
                              next[idx] = { ...next[idx], quantity: qty };
                              setPaymentWindowFreeItems(next);
                            }}
                            className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="Qty"
                          />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setPaymentWindowFreeItems(paymentWindowFreeItems.filter((_, i) => i !== idx))}
                            className="text-gray-500 hover:text-red-600"
                            title="Remove"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 bg-primary-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Payment:</span>
                  <span className="text-xl font-bold text-primary-600">
                    {formatCurrency(paymentWindowCash + paymentWindowCheque)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowPaymentWindow(false)}
                  className="btn-secondary flex-1 py-2.5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCompletePayment}
                  className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Complete Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Success Modal */}
      {showPaymentSuccessModal && paymentSuccessData && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPaymentSuccessModal(false);
              setPaymentSuccessData(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Completed</h2>
              <p className="text-gray-600 mb-6">Payment has been processed successfully</p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Shop Name:</span>
                  <span className="text-gray-900">{shop?.shopName || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Payment Method:</span>
                  <span className="text-gray-900 capitalize">{paymentSuccessData.payment.paymentMethod || 'cash'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Amount:</span>
                  <span className="text-gray-900 font-semibold">{formatCurrency(paymentSuccessData.payment.amount || paymentSuccessData.payment.total_amount || 0)}</span>
                </div>
                {(paymentSuccessData.payment.paymentMethod || 'cash') === 'cash' && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-sm text-green-600 font-medium">✓ Payment marked as Paid</p>
                  </div>
                )}
                {(paymentSuccessData.payment.paymentMethod || 'cash') === 'cheque' && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-sm text-blue-600 font-medium">⏳ Payment marked as Pending (Cheque)</p>
                    <p className="text-xs text-gray-500 mt-1">Only admin can clear this cheque</p>
                  </div>
                )}
                {(paymentSuccessData.payment.paymentMethod || 'cash') === 'split' && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-sm text-green-600 font-medium">✓ Cash portion marked as Paid</p>
                    <p className="text-sm text-blue-600 font-medium mt-1">⏳ Cheque portion marked as Pending</p>
                  </div>
                )}
                {(paymentSuccessData.payment.paymentMethod || 'cash') === 'ongoing' && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-sm text-orange-600 font-medium">⏳ Payment marked as Ongoing</p>
                    <p className="text-xs text-gray-500 mt-1">You can settle the remaining balance later</p>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => {
                  setShowPaymentSuccessModal(false);
                  setPaymentSuccessData(null);
                }}
                className="w-full btn-primary py-3 text-base font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Returns Modal */}
      {showReturnModal && selectedSaleForReturn && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowReturnModal(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Process Return</h2>
              <button
                onClick={() => setShowReturnModal(false)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium">Shop Name:</span>
                    <span>{shop?.shopName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Sale Date:</span>
                    <span>{new Date(selectedSaleForReturn.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Sale Amount:</span>
                    <span>{formatCurrency(selectedSaleForReturn.totalAmount)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Reason for Return</label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  placeholder="Enter reason for return (optional)"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Return Items</h3>
                  <button
                    onClick={() => setReturnItems([...returnItems, { inventoryItemId: '', quantity: 0 }])}
                    className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>

                {returnItems.length > 0 ? (
                  <div className="space-y-3">
                    {returnItems.map((item, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="block text-xs font-medium mb-1 text-gray-700">Product *</label>
                            <select
                              value={item.inventoryItemId}
                              onChange={(e) => {
                                const newItems = [...returnItems];
                                newItems[index].inventoryItemId = e.target.value;
                                setReturnItems(newItems);
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                              required
                            >
                              <option value="">Select product...</option>
                              {inventoryItems.map((inv) => (
                                <option key={inv.id} value={inv.id}>
                                  {inv.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium mb-1 text-gray-700">Return Quantity *</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.quantity || ''}
                                onChange={(e) => {
                                  const newItems = [...returnItems];
                                  newItems[index].quantity = parseFloat(e.target.value) || 0;
                                  setReturnItems(newItems);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1 text-gray-700">Replacement Quantity (Optional)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.replacementQuantity || ''}
                                onChange={(e) => {
                                  const newItems = [...returnItems];
                                  newItems[index].replacementQuantity = parseFloat(e.target.value) || undefined;
                                  setReturnItems(newItems);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                              />
                            </div>
                          </div>
                          {item.replacementQuantity && item.replacementQuantity > 0 && (
                            <div>
                              <label className="block text-xs font-medium mb-1 text-gray-700">Replacement Product (Optional)</label>
                              <select
                                value={item.replacementItemId || ''}
                                onChange={(e) => {
                                  const newItems = [...returnItems];
                                  newItems[index].replacementItemId = e.target.value || undefined;
                                  setReturnItems(newItems);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                              >
                                <option value="">No replacement</option>
                                {inventoryItems.map((inv) => (
                                  <option key={inv.id} value={inv.id}>
                                    {inv.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          <button
                            onClick={() => setReturnItems(returnItems.filter((_, i) => i !== index))}
                            className="self-end p-2 text-red-600 hover:bg-red-50 rounded text-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    No items added. Click "Add Item" to start.
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowReturnModal(false);
                    setReturnItems([]);
                    setReturnReason('');
                  }}
                  className="btn-secondary flex-1 py-2.5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateReturn}
                  className="btn-primary flex-1 py-2.5"
                >
                  Process Return
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

