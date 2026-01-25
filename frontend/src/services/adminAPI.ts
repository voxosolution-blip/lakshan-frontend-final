import api from './api';

export const adminAPI = {
  downloadBackup: async (): Promise<Blob> => {
    const res = await api.get('/admin/backup', { responseType: 'blob' as any });
    return res.data as any;
  },

  restoreFromBackup: async (file: File): Promise<void> => {
    const form = new FormData();
    form.append('file', file);
    await api.post('/admin/restore', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  resetSystem: async (): Promise<void> => {
    await api.post('/admin/reset', { confirm: 'RESET' });
  },

  // End-of-day stock approval
  getPendingEndOfDayRequests: async () => {
    const res = await api.get<{ success: boolean; data: any[] }>('/admin/end-of-day/pending');
    return res.data.data;
  },

  getEndOfDayRequestDetails: async (id: string) => {
    const res = await api.get<{ success: boolean; data: any }>(`/admin/end-of-day/${id}`);
    return res.data.data;
  },

  approveEndOfDayRequest: async (id: string, notes?: string) => {
    const res = await api.post<{ success: boolean; message: string }>(`/admin/end-of-day/${id}/approve`, { notes });
    return res.data;
  },

  rejectEndOfDayRequest: async (id: string, notes?: string) => {
    const res = await api.post<{ success: boolean; message: string }>(`/admin/end-of-day/${id}/reject`, { notes });
    return res.data;
  }
};


