// Dashboard API Service
import api from './api';

export interface SalespersonLocation {
  userId: string;
  name: string;
  username: string;
  email?: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
  };
  lastUpdated: string;
}

export const dashboardAPI = {
  // Update salesperson location
  updateLocation: async (latitude: number, longitude: number, accuracy?: number) => {
    const response = await api.post<{ success: boolean; data: any; message: string }>('/dashboard/location', {
      latitude,
      longitude,
      accuracy
    });
    return response.data;
  },

  // Get all salesperson locations (admin only)
  getAllSalespersonLocations: async (): Promise<SalespersonLocation[]> => {
    const response = await api.get<{ success: boolean; data: SalespersonLocation[] }>('/dashboard/locations');
    return response.data.data;
  },

  // Get daily milk collection and usage chart data (from January 1st of current year to today)
  getDailyMilkChartData: async (): Promise<{ date: string; collection: number; usage: number }[]> => {
    const response = await api.get<{ success: boolean; data: { date: string; collection: number; usage: number }[] }>('/dashboard/milk-chart');
    return response.data.data;
  },

  // Get product sales data for pie chart
  getProductSalesData: async (): Promise<{ productId: string; productName: string; amount: number; quantity: number; count: number; percentage: number }[]> => {
    const response = await api.get<{ success: boolean; data: { productId: string; productName: string; amount: number; quantity: number; count: number; percentage: number }[] }>('/dashboard/product-sales');
    return response.data.data;
  },

  // Get shop-wise sales data for bar chart
  getShopWiseSalesData: async (): Promise<Array<{ shopId: string; shopName: string; totalAmount: number; saleCount: number }>> => {
    const response = await api.get<{ success: boolean; data: Array<{ shopId: string; shopName: string; totalAmount: number; saleCount: number }> }>('/dashboard/shop-wise-sales');
    return response.data.data;
  },

  // Get finished goods chart data (production vs sales)
  getFinishedGoodsChartData: async (): Promise<{ chartData: Array<any>; products: string[]; currentInventory: Array<{ productName: string; currentStock: number }> }> => {
    const response = await api.get<{ success: boolean; data: { chartData: Array<any>; products: string[]; currentInventory: Array<{ productName: string; currentStock: number }> } }>('/dashboard/finished-goods-chart');
    return response.data.data;
  },

  // Get aggregated salesperson allocated stock (remaining after sales)
  getSalespersonStock: async (): Promise<Array<{ productId: string; productName: string; remainingStock: number }>> => {
    const response = await api.get<{ success: boolean; data: Array<{ productId: string; productName: string; remainingStock: number }> }>('/dashboard/salesperson-stock');
    return response.data.data;
  },

  // Get today's sales and returns by product (admin only)
  getTodaySalesAndReturns: async (): Promise<Array<{ productId: string; productName: string; soldToday: number; returnedToday: number }>> => {
    const response = await api.get<{ success: boolean; data: Array<{ productId: string; productName: string; soldToday: number; returnedToday: number }> }>('/dashboard/today-sales-returns');
    return response.data.data;
  }
};



