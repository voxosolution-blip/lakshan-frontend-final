// Inventory API Service
import api from './api';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStockLevel?: number;
  expiryDate?: string;
  price: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryItemData {
  name: string;
  category: string;
  unit: string;
  currentStock?: number;
  minStockLevel?: number;
  expiryDate?: string;
  price?: number;
}

export interface StockAdjustmentData {
  adjustment: number; // Positive for stock in, negative for stock out
  reason?: string;
}

export const inventoryAPI = {
  getAll: (params?: { category?: string }) =>
    api.get('/inventory', { params }),

  getById: (id: string) =>
    api.get(`/inventory/${id}`),

  create: (data: CreateInventoryItemData) =>
    api.post('/inventory', data),

  update: (id: string, data: Partial<CreateInventoryItemData>) =>
    api.put(`/inventory/${id}`, data),

  delete: (id: string) =>
    api.delete(`/inventory/${id}`),

  adjustStock: (id: string, data: StockAdjustmentData) =>
    api.post(`/inventory/${id}/adjust`, data),

  getLowStockAlerts: () =>
    api.get('/inventory/alerts/low-stock'),

  getExpiryAlerts: (days?: number) =>
    api.get('/inventory/alerts/expiry', { params: { days } }),

  getMilkInventoryByDate: (date?: string) =>
    api.get('/inventory/milk/by-date', { params: { date } }),

  getTodayMilkUsage: () =>
    api.get('/inventory/milk/today-usage'),
};



