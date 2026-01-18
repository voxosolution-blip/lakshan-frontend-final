import api from './api';

export interface Farmer {
  id: string;
  name: string;
  phone: string;
  address: string;
  allowance: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    milkCollections: number;
  };
}

export interface CreateFarmerData {
  name: string;
  phone: string;
  address: string;
  allowance?: number;
}

export interface MilkCollection {
  id: string;
  farmerId: string;
  quantity: number;
  date: string;
  notes?: string;
  createdAt: string;
  farmer_name?: string;
}

export interface CreateMilkCollectionData {
  farmerId: string;
  date?: string;
  time?: string;
  quantity_liters: number;
}

export interface FarmerMilkHistory {
  data: MilkCollection[];
}

export interface CurrentMonthTotal {
  farmer: Farmer;
  currentMonth: {
    totalQuantity: number;
    collectionCount: number;
    startDate: string;
    endDate: string;
  };
}

export interface TotalMilkInventory {
  currentStock: number;
  totalCollected: number;
  farmerCount: number;
  collectionCount: number;
  currentMonthTotal: number;
}

export interface PaymentCalculation {
  farmer: Farmer;
  period: {
    startDate: string;
    endDate: string;
    year: number;
    month: number;
  };
  milk: {
    totalQuantity: number;
    collectionCount: number;
  };
  payment: {
    ratePerLiter: number;
    milkPayment: number;
    allowance: number;
    totalPayment: number;
  };
}

export const farmerAPI = {
  // Get all farmers with today's milk (for Milk Collection page)
  getFarmersWithTodayMilk: async (): Promise<{ data: any[] }> => {
    const response = await api.get<{ success: boolean; data: any[] }>('/farmers/with-today-milk');
    return response.data;
  },
  
  // Get all farmers
  getAll: async (): Promise<Farmer[]> => {
    const response = await api.get<{ success: boolean; data: Farmer[] }>('/farmers');
    return response.data.data;
  },

  // Get single farmer
  getById: async (id: string): Promise<Farmer> => {
    const response = await api.get<{ success: boolean; data: Farmer }>(`/farmers/${id}`);
    return response.data.data;
  },

  // Create farmer
  create: async (data: CreateFarmerData): Promise<Farmer> => {
    const response = await api.post<{ success: boolean; data: Farmer; message: string }>('/farmers', data);
    return response.data.data;
  },

  // Update farmer
  update: async (id: string, data: Partial<CreateFarmerData>): Promise<Farmer> => {
    const response = await api.put<{ success: boolean; data: Farmer; message: string }>(`/farmers/${id}`, data);
    return response.data.data;
  },

  // Delete farmer
  delete: async (id: string): Promise<void> => {
    await api.delete<{ success: boolean; message: string }>(`/farmers/${id}`);
  },

  // Get farmer milk history
  getMilkHistory: async (farmerId: string, limit?: number): Promise<MilkCollection[]> => {
    const response = await api.get<FarmerMilkHistory>(`/farmers/${farmerId}/milk-history`, {
      params: { limit }
    });
    return response.data.data;
  },

  // Get current month total
  getCurrentMonthTotal: async (farmerId: string): Promise<CurrentMonthTotal> => {
    const response = await api.get<{ success: boolean; data: CurrentMonthTotal }>(`/farmers/${farmerId}/current-month`);
    return response.data.data;
  },

  // Add milk collection
  addMilkCollection: async (data: CreateMilkCollectionData): Promise<MilkCollection> => {
    const response = await api.post<{ success: boolean; data: MilkCollection; message: string }>(
      '/farmers/milk-collection',
      data
    );
    return response.data.data;
  },

  // Get total milk inventory
  getTotalMilkInventory: async (): Promise<TotalMilkInventory> => {
    const response = await api.get<{ success: boolean; data: TotalMilkInventory }>('/farmers/milk/total');
    return response.data.data;
  },

  // Get monthly report for farmer
  getMonthlyReport: async (farmerId: string, year?: number, month?: number): Promise<any> => {
    const response = await api.get<{ success: boolean; data: any }>(`/farmers/${farmerId}/monthly-report`, {
      params: { year, month }
    });
    return response.data.data;
  },

  // Calculate payment
  calculatePayment: async (
    farmerId: string,
    ratePerLiter: number,
    year?: number,
    month?: number
  ): Promise<PaymentCalculation> => {
    const response = await api.post<{ success: boolean; data: PaymentCalculation }>('/farmers/calculate-payment', {
      farmerId,
      ratePerLiter,
      year,
      month
    });
    return response.data.data;
  },

  // Add free products for farmer
  addFreeProducts: async (data: {
    farmerId: string;
    month: number;
    year: number;
    items: Array<{
      product_id: string;
      quantity: number;
      unit?: string;
      notes?: string;
    }>;
  }): Promise<any[]> => {
    const response = await api.post<{ success: boolean; data: any[]; message: string }>('/farmers/free-products', data);
    return response.data.data;
  },

  // Issue (deduct) monthly free products when paysheet is printed (idempotent)
  issueFreeProducts: async (farmerId: string, year: number, month: number): Promise<any> => {
    const response = await api.post<{ success: boolean; data: any; message: string }>(`/farmers/${farmerId}/issue-free-products`, {
      year,
      month
    });
    return response.data.data;
  }
};



