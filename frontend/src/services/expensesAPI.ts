import api from './api';

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description?: string;
  date: string;
  createdAt: string;
  createdBy?: string;
  salespersonName?: string;
  salespersonUsername?: string;
}

export interface CreateExpenseData {
  category: string;
  amount: number;
  description?: string;
  date?: string;
}

export const expensesAPI = {
  getAll: async (params?: { startDate?: string; endDate?: string; category?: string }): Promise<Expense[]> => {
    const response = await api.get<{ success: boolean; data: Expense[] }>('/expenses', { params });
    return response.data.data;
  },

  getById: async (id: string): Promise<Expense> => {
    const response = await api.get<{ success: boolean; data: Expense }>(`/expenses/${id}`);
    return response.data.data;
  },

  create: async (data: CreateExpenseData): Promise<Expense> => {
    const response = await api.post<{ success: boolean; data: Expense; message: string }>('/expenses', data);
    return response.data.data;
  },

  update: async (id: string, data: Partial<CreateExpenseData>): Promise<Expense> => {
    const response = await api.put<{ success: boolean; data: Expense; message: string }>(`/expenses/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete<{ success: boolean; message: string }>(`/expenses/${id}`);
  }
};












