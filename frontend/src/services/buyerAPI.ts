// Buyer API Service
import api from './api';
import type { Buyer, CreateBuyerData } from '../types';

export const buyerAPI = {
  getAll: async (): Promise<Buyer[]> => {
    const response = await api.get<{ success: boolean; data: Buyer[] }>('/buyers');
    return response.data.data;
  },

  getById: async (id: string): Promise<Buyer> => {
    const response = await api.get<{ success: boolean; data: Buyer }>(`/buyers/${id}`);
    return response.data.data;
  },

  create: async (data: CreateBuyerData): Promise<Buyer> => {
    const response = await api.post<{ success: boolean; data: Buyer; message: string }>('/buyers', data);
    return response.data.data;
  },

  update: async (id: string, data: Partial<CreateBuyerData>): Promise<Buyer> => {
    const response = await api.put<{ success: boolean; data: Buyer; message: string }>(`/buyers/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete<{ success: boolean; message: string }>(`/buyers/${id}`);
  },

  getWithPaymentStatus: async (): Promise<any[]> => {
    const response = await api.get<{ success: boolean; data: any[] }>('/buyers/payment-status');
    return response.data.data;
  },
};





