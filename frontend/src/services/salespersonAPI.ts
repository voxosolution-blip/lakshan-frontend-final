// Salesperson API Service
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with auth token
const api = axios.create({
  baseURL: `${API_BASE_URL}/salesperson`,
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================
// TYPES
// ============================================
export interface Shop {
  id: string;
  shop_name: string;
  contact?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  location_set_at?: string;
  is_active: boolean;
  pending_ongoing: number;
  pending_cheques: number;
  pending_cheque_count: number;
  latest_cheque_date?: string;
  latest_cheque_expiry?: string;
}

export interface InventoryBatch {
  batch_number: string;
  production_date: string;
  allocated: number;
  sold: number;
  returned: number;
  available: number;
}

export interface SalespersonInventory {
  product_id: string;
  product_name: string;
  selling_price: number;
  category?: string;
  total_allocated: number;
  total_sold: number;
  total_returned: number;
  total_available: number;
  batches: InventoryBatch[];
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface ReturnItem {
  productId: string;
  productName: string;
  quantity: number;
}

export interface Cheque {
  chequeNumber: string;
  bankName: string;
  expiryDate: string;
  amount: number;
}

export interface Payment {
  cash_amount: number;
  cheque_amount: number;
  ongoing_amount: number;
  cheques?: Cheque[];
}

// ============================================
// LOCATION TRACKING
// ============================================
export const updateLocation = (latitude: number, longitude: number, status: string = 'online') => {
  return api.post('/location', { latitude, longitude, status });
};

export const getMyLocation = () => {
  return api.get('/location/me');
};

export const getAllLocations = () => {
  return api.get('/locations/all');
};

// ============================================
// SHOPS MANAGEMENT
// ============================================
export const getMyShops = () => {
  return api.get<{ success: boolean; data: Shop[] }>('/shops');
};

export const addShop = (shop: {
  shopName: string;
  contact?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}) => {
  return api.post('/shops', shop);
};

export const updateShopLocation = (shopId: string, latitude: number, longitude: number) => {
  return api.put(`/shops/${shopId}/location`, { latitude, longitude });
};

export const getShopSales = (shopId: string) => {
  return api.get(`/shops/${shopId}/sales`);
};

// ============================================
// INVENTORY ALLOCATION
// ============================================
export const getMyInventory = () => {
  return api.get<{ success: boolean; data: SalespersonInventory[] }>('/inventory');
};

// ============================================
// MOBILE SALES
// ============================================
export const createMobileSale = (data: {
  shopId: string;
  saleItems: SaleItem[];
  returnItems?: ReturnItem[];
  payment: Payment;
}) => {
  return api.post('/sales', data);
};

// ============================================
// END OF DAY STOCK UPDATE
// ============================================
export const submitEndOfDayRequest = () => {
  return api.post('/end-of-day');
};

export const getMyEndOfDayRequests = () => {
  return api.get<{ success: boolean; data: any[] }>('/end-of-day');
};

export const getEndOfDayRequestDetails = (id: string) => {
  return api.get<{ success: boolean; data: any }>(`/end-of-day/${id}`);
};

export const salespersonAPI = {
  updateLocation,
  getMyLocation,
  getAllLocations,
  getMyShops,
  addShop,
  updateShopLocation,
  getShopSales,
  getMyInventory,
  createMobileSale,
  submitEndOfDayRequest,
  getMyEndOfDayRequests,
  getEndOfDayRequestDetails,
};

export default salespersonAPI;
