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
  }
};


