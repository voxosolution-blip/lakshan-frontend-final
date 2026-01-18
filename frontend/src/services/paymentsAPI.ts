import api from './api';

export interface Payment {
  id: string;
  saleId: string;
  amount: number;
  cashAmount?: number;
  chequeAmount?: number;
  paymentMethod: string;
  chequeNumber?: string;
  chequeBank?: string;
  shopName?: string;
  returnDate?: string;
  expiryDate?: string;
  chequeStatus?: string;
  notes?: string;
  createdAt: string;
  createdBy?: string;
  paymentStatus?: string;
  sale?: {
    id: string;
    customerName?: string;
    totalAmount: number;
    paymentStatus?: string;
    totalPaid?: number;
    remainingBalance?: number;
  };
}

export interface CreatePaymentData {
  saleId: string;
  amount?: number;
  paymentMethod: string;
  cashAmount?: number;
  chequeAmount?: number;
  chequeNumber?: string;
  chequeBank?: string;
  shopName?: string;
  returnDate?: string;
  expiryDate?: string;
  chequeStatus?: string;
  notes?: string;
  freeItems?: Array<{
    inventoryItemId: string; // usually product_id from salesperson inventory
    quantity: number;
  }>;
}

export interface ChequeAlert {
  id: string;
  paymentId: string;
  saleId: string;
  chequeNumber: string;
  bankName: string;
  amount: number;
  expiryDate: string;
  daysUntilExpiry: number;
  status: string;
  buyerName?: string;
  saleTotal: number;
  notes?: string;
}

export const paymentsAPI = {
  getAll: async (params?: { saleId?: string }): Promise<Payment[]> => {
    const response = await api.get<{ success: boolean; data: Payment[] }>('/payments', { params });
    return response.data.data;
  },

  getById: async (id: string): Promise<Payment> => {
    const response = await api.get<{ success: boolean; data: Payment }>(`/payments/${id}`);
    return response.data.data;
  },

  create: async (data: CreatePaymentData): Promise<Payment> => {
    const response = await api.post<{ success: boolean; data: Payment; message: string }>('/payments', data);
    return response.data.data;
  },

  update: async (id: string, data: Partial<CreatePaymentData>): Promise<Payment> => {
    const response = await api.put<{ success: boolean; data: Payment; message: string }>(`/payments/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete<{ success: boolean; message: string }>(`/payments/${id}`);
  },

  getChequeAlerts: async (): Promise<ChequeAlert[]> => {
    const response = await api.get<{ success: boolean; data: ChequeAlert[] }>('/payments/cheque-alerts');
    return response.data.data;
  },

  getOngoingPendingPayments: async (): Promise<any[]> => {
    const response = await api.get<{ success: boolean; data: any[] }>('/payments/ongoing-pending');
    return response.data.data;
  },

  getShopWisePaymentHistory: async (): Promise<any[]> => {
    const response = await api.get<{ success: boolean; data: any[] }>('/payments/shop-wise');
    return response.data.data;
  },

  // Get ALL cheques (including from salesperson mobile sales) - for Admin Cheques panel
  getAllCheques: async (status?: string): Promise<ChequeRecord[]> => {
    const response = await api.get<{ success: boolean; data: ChequeRecord[] }>('/payments/cheques/all', {
      params: status && status !== 'all' ? { status } : {}
    });
    return response.data.data;
  },

  // Update cheque status (Admin: pending, cleared/collected, bounced, cancelled)
  updateChequeStatus: async (chequeId: string, status: string): Promise<void> => {
    await api.put<{ success: boolean; message: string }>(`/payments/cheques/${chequeId}/status`, { status });
  }
};

// Cheque record from getAllCheques - includes salesperson mobile cheques
export interface ChequeRecord {
  id: string;
  paymentId: string;
  saleId: string;
  chequeNumber: string;
  chequeBank: string;
  chequeDate: string;
  returnDate?: string;
  expiryDate?: string;
  amount: number;
  status: string;
  chequeStatus: string;
  notes?: string;
  createdAt: string;
  shopName?: string;
  saleTotal: number;
  saleDate: string;
  salespersonName?: string;
  salespersonUsername?: string;
  cashAmount?: number;
  chequeAmount?: number;
  ongoingAmount?: number;
}






