import api from './api';

export interface Production {
  id: string;
  date: string;
  milkUsed: number;
  notes?: string;
  createdAt: string;
  createdBy?: string;
  items?: ProductionItem[];
}

export interface ProductionItem {
  id: string;
  productionId: string;
  inventoryItemId: string;
  quantity: number;
  inventoryItem?: {
    id: string;
    name: string;
    category: string;
    unit: string;
    price: number;
  };
}

export interface CreateProductionData {
  productId: string;
  date?: string;
  quantityProduced: number;
  notes?: string;
}

export interface ProductionCapacity {
  productId: string;
  productName: string;
  productCategory: string;
  maxPossibleUnits: number;
  ingredients: Array<{
    inventoryItemId: string;
    inventoryName: string;
    quantityRequired: number;
    unit: string;
    currentStock: number;
  }>;
  message?: string;
}

export interface SalesAllocation {
  id: string;
  productionId: string;
  productId: string;
  quantityAllocated: number;
  allocatedTo?: string;
  allocationDate: string;
  status: string;
  productName?: string;
  productionDate?: string;
  batch?: string;
  allocatedToName?: string;
}

export const productionAPI = {
  // Get production capacity
  getCapacity: async (): Promise<ProductionCapacity[]> => {
    const response = await api.get<{ success: boolean; data: ProductionCapacity[] }>('/production/capacity');
    return response.data.data;
  },

  // Get today's production summary
  getTodayProduction: async (): Promise<any[]> => {
    const response = await api.get<{ success: boolean; data: any[] }>('/production/today');
    return response.data.data;
  },

  getAll: async (): Promise<Production[]> => {
    const response = await api.get<{ success: boolean; data: Production[] }>('/production');
    return response.data.data;
  },

  getById: async (id: string): Promise<Production> => {
    const response = await api.get<{ success: boolean; data: Production }>(`/production/${id}`);
    return response.data.data;
  },

  create: async (data: CreateProductionData): Promise<Production> => {
    const response = await api.post<{ success: boolean; data: Production; message: string }>('/production', data);
    return response.data.data;
  },

  // Sales allocation
  createAllocation: async (data: {
    productionId?: string;
    inventoryItemId?: string;
    productId: string;
    salespersonId: string;
    quantityAllocated: number;
    notes?: string;
  }): Promise<SalesAllocation> => {
    const response = await api.post<{ success: boolean; data: SalesAllocation; message: string }>('/production/allocation', data);
    return response.data.data;
  },

  getAllocations: async (params?: { date?: string; status?: string; salespersonId?: string }): Promise<SalesAllocation[]> => {
    const response = await api.get<{ success: boolean; data: SalesAllocation[] }>('/production/allocations', { params });
    return response.data.data;
  },

  // Get today's production with allocations
  getTodayProductionWithAllocations: async (): Promise<any[]> => {
    const response = await api.get<{ success: boolean; data: any[] }>('/production/today/allocations');
    return response.data.data;
  },

  // Create bulk allocation
  createBulkAllocation: async (allocations: Array<{
    productionId: string;
    productId: string;
    salespersonId: string;
    quantity: number;
  }>, notes?: string): Promise<SalesAllocation[]> => {
    const response = await api.post<{ success: boolean; data: SalesAllocation[]; message: string }>('/production/allocation', {
      allocations,
      notes
    });
    return response.data.data;
  },

  // Get salesperson's allocated inventory
  getSalespersonInventory: async (): Promise<Array<{
    id: string;
    name: string;
    unit: string;
    stock: number;
    price: number;
  }>> => {
    const response = await api.get<{ success: boolean; data: Array<{
      id: string;
      name: string;
      unit: string;
      stock: number;
      price: number;
    }> }>('/production/salesperson/inventory');
    return response.data.data;
  },
};



