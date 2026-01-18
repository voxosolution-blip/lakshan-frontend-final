import api from './api';

export interface Return {
  id: string;
  date: string;
  originalSaleId?: string;
  productId?: string;
  productName?: string;
  quantity?: number;
  reason?: string;
  settlementStatus?: string;
  notes?: string;
  createdAt: string;
  createdBy?: string;
  items?: ReturnItem[];
  shopName?: string;
}

export interface ReturnItem {
  id: string;
  returnId: string;
  inventoryItemId: string;
  quantity: number;
  replacementItemId?: string;
  inventoryItem?: {
    id: string;
    name: string;
    category: string;
    unit: string;
    price: number;
  };
}

export interface CreateReturnData {
  date?: string;
  originalSaleId?: string;
  reason?: string;
  settlementStatus?: string;
  items: Array<{
    inventoryItemId: string;
    quantity: number;
    replacementItemId?: string;
  }>;
  notes?: string;
}

export const returnsAPI = {
  getAll: async (): Promise<Return[]> => {
    const response = await api.get<{ success: boolean; data: Return[] }>('/returns');
    return response.data.data;
  },

  getById: async (id: string): Promise<Return> => {
    const response = await api.get<{ success: boolean; data: Return }>(`/returns/${id}`);
    return response.data.data;
  },

  create: async (data: CreateReturnData): Promise<Return> => {
    const response = await api.post<{ success: boolean; data: Return; message: string }>('/returns', data);
    return response.data.data;
  },

  update: async (id: string, data: Partial<CreateReturnData>): Promise<Return> => {
    const response = await api.put<{ success: boolean; data: Return; message: string }>(`/returns/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete<{ success: boolean; message: string }>(`/returns/${id}`);
  }
};






