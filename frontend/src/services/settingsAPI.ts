// Settings API Service
import api from './api';

export interface MilkPrice {
  price: number;
}

export const settingsAPI = {
  // Get milk price
  getMilkPrice: async (): Promise<MilkPrice> => {
    const response = await api.get<{ success: boolean; data: MilkPrice }>('/settings/milk-price');
    return response.data.data;
  },

  // Update milk price
  updateMilkPrice: async (price: number): Promise<MilkPrice> => {
    const response = await api.put<{ success: boolean; data: MilkPrice; message: string }>('/settings/milk-price', {
      price
    });
    return response.data.data;
  },

  // Get setting by key
  getSetting: async (key: string): Promise<{ key: string; value: string } | null> => {
    try {
      const response = await api.get<{ success: boolean; data: { key: string; value: string } }>(`/settings/${key}`);
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // Update setting by key
  updateSetting: async (key: string, value: string): Promise<{ key: string; value: string }> => {
    const response = await api.put<{ success: boolean; data: { key: string; value: string }; message: string }>(`/settings/${key}`, {
      value
    });
    return response.data.data;
  }
};




