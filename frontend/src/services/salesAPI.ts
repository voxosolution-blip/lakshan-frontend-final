import api from './api';

export interface Sale {
  id: string;
  date: string;
  route?: string;
  address?: string;
  customerName?: string;
  contact?: string;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
  createdBy?: string;
  buyerId?: string; // Add buyerId for proper shop grouping
  items?: SaleItem[];
  totalPaid?: number;
  pendingAmount?: number;
  pendingCash?: number;
  pendingCheque?: number;
  isEdited?: boolean;
  isReversed?: boolean;
  salespersonName?: string; // Salesperson name for admin view
}

export interface SaleItem {
  id?: string;
  saleId?: string;
  inventoryItemId?: string;
  productId?: string;
  productName?: string;
  quantity: number;
  unitPrice?: number;
  price?: number;
  totalPrice?: number;
  freeQuantity?: number;
  isReturn?: boolean;
  inventoryItem?: {
    id: string;
    name: string;
    category: string;
    unit: string;
    price: number;
  };
}

export interface CreateSaleData {
  buyerId?: string;
  date?: string;
  route?: string;
  customerName?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  items: Array<{
    inventoryItemId: string;
    quantity: number;
    unitPrice?: number;
    freeQuantity?: number;
  }>;
  notes?: string;
}

export const salesAPI = {
  getAll: async (params?: { startDate?: string; endDate?: string; buyerId?: string; salespersonId?: string }): Promise<Sale[]> => {
    const response = await api.get<{ success: boolean; data: Sale[] }>('/sales', { params });
    return response.data.data;
  },

  getByBuyerId: async (buyerId: string): Promise<Sale[]> => {
    const response = await api.get<{ success: boolean; data: Sale[] }>(`/sales/buyer/${buyerId}`);
    return response.data.data;
  },

  getById: async (id: string): Promise<Sale> => {
    const response = await api.get<{ success: boolean; data: Sale }>(`/sales/${id}`);
    return response.data.data;
  },

  create: async (data: CreateSaleData): Promise<Sale> => {
    const response = await api.post<{ success: boolean; data: Sale; message: string }>('/sales', data);
    return response.data.data;
  },

  update: async (id: string, data: Partial<CreateSaleData>): Promise<Sale> => {
    const response = await api.put<{ success: boolean; data: Sale; message: string }>(`/sales/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete<{ success: boolean; message: string }>(`/sales/${id}`);
  },

  reverse: async (id: string, password: string, reason?: string): Promise<void> => {
    await api.post<{ success: boolean; message: string }>(`/sales/${id}/reverse`, {
      password,
      reason: reason || 'Wrong order - bill reversed'
    });
  }
};






