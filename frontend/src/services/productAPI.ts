// Product API Service
import api from './api';
import type { Product, CreateProductData, ProductBOM, CreateBOMData } from '../types';

export const productAPI = {
  getAll: async (): Promise<Product[]> => {
    const response = await api.get<{ success: boolean; data: Product[] }>('/products');
    return response.data.data;
  },

  getById: async (id: string): Promise<Product> => {
    const response = await api.get<{ success: boolean; data: Product }>(`/products/${id}`);
    return response.data.data;
  },

  create: async (data: CreateProductData): Promise<Product> => {
    const response = await api.post<{ success: boolean; data: Product; message: string }>('/products', data);
    return response.data.data;
  },

  update: async (id: string, data: Partial<CreateProductData>): Promise<Product> => {
    const response = await api.put<{ success: boolean; data: Product; message: string }>(`/products/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete<{ success: boolean; message: string }>(`/products/${id}`);
  },

  // BOM methods
  getBOM: async (productId: string): Promise<ProductBOM[]> => {
    const response = await api.get<{ success: boolean; data: ProductBOM[] }>(`/products/${productId}/bom`);
    return response.data.data;
  },

  addBOMItem: async (productId: string, data: CreateBOMData): Promise<ProductBOM> => {
    const response = await api.post<{ success: boolean; data: ProductBOM; message: string }>(
      `/products/${productId}/bom`,
      data
    );
    return response.data.data;
  },

  deleteBOMItem: async (productId: string, bomId: string): Promise<void> => {
    await api.delete<{ success: boolean; message: string }>(`/products/${productId}/bom/${bomId}`);
  },
};











