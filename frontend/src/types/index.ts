// TypeScript Types

export type UserRole = 'ADMIN' | 'SALESPERSON' | 'ACCOUNTANT' | 'PRODUCTION';

export interface User {
  id: string;
  username: string;
  email?: string;
  role: UserRole;
  fullName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ============================================
// PRODUCTS & BOM
// ============================================

export interface Product {
  id: string;
  name: string;
  category?: string;
  sellingPrice: number;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductBOM {
  id: string;
  productId: string;
  inventoryItemId: string;
  quantityRequired: number;
  unit: string;
  inventoryItem?: {
    id: string;
    name: string;
    unit: string;
    currentStock: number;
  };
}

export interface CreateProductData {
  name: string;
  category?: string;
  sellingPrice: number;
  description?: string;
  isActive?: boolean;
}

export interface CreateBOMData {
  inventoryItemId: string;
  quantityRequired: number;
  unit: string;
}

// ============================================
// BUYERS
// ============================================

export interface Buyer {
  id: string;
  shopName: string;
  contact?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBuyerData {
  shopName: string;
  contact?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  isActive?: boolean;
}

// ============================================
// PRODUCTION
// ============================================

export interface Production {
  id: string;
  date: string;
  productId: string;
  quantityProduced: number;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  product?: Product;
}

export interface CreateProductionData {
  productId: string;
  quantityProduced: number;
  date?: string;
  notes?: string;
}

// ============================================
// SALES
// ============================================

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  price: number;
  subtotal: number;
  product?: Product;
}

export interface Sale {
  id: string;
  buyerId?: string;
  salespersonId: string;
  date: string;
  totalAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid';
  notes?: string;
  createdAt: string;
  buyer?: Buyer;
  items?: SaleItem[];
}

export interface CreateSaleData {
  buyerId?: string;
  date?: string;
  items: {
    productId: string;
    quantity: number;
    price: number;
  }[];
  notes?: string;
}

// ============================================
// PAYMENTS & CHEQUES
// ============================================

export interface Cheque {
  id: string;
  paymentId: string;
  chequeNumber?: string;
  bankName?: string;
  chequeDate: string;
  returnDate?: string;
  amount: number;
  status: 'pending' | 'cleared' | 'bounced' | 'cancelled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  saleId: string;
  cashAmount: number;
  chequeAmount: number;
  totalAmount: number;
  status: 'pending' | 'completed' | 'cancelled';
  paymentDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  cheques?: Cheque[];
  sale?: Sale;
}

export interface CreatePaymentData {
  saleId: string;
  cashAmount?: number;
  chequeAmount?: number;
  cheques?: {
    chequeNumber?: string;
    bankName?: string;
    chequeDate: string;
    amount: number;
    notes?: string;
  }[];
  notes?: string;
}

// ============================================
// RETURNS
// ============================================

export interface Return {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  reason?: string;
  replacementGiven: boolean;
  replacementProductId?: string;
  replacementQuantity?: number;
  processedBy?: string;
  createdAt: string;
  updatedAt: string;
  product?: Product;
  sale?: Sale;
}

export interface CreateReturnData {
  saleId: string;
  productId: string;
  quantity: number;
  reason?: string;
  replacementGiven?: boolean;
  replacementProductId?: string;
  replacementQuantity?: number;
}


