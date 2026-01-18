import api from './api';

export type ReportKey =
  | 'milk'
  | 'payroll'
  | 'inventory'
  | 'production'
  | 'sales'
  | 'returns'
  | 'payments'
  | 'cheques'
  | 'expenses'
  | 'final-financial';

export interface ReportColumn {
  key: string;
  label: string;
}

export interface ReportMeta {
  reportKey: string;
  reportName: string;
  period: { startDate: string; endDate: string };
  generatedAt: string;
  generatedBy: string;
}

export interface ReportResponse {
  meta: ReportMeta;
  columns: ReportColumn[];
  details: any[];
  summary: any;
  reconciliation?: any | null;
}

export const reportsAPI = {
  getReport: async (key: ReportKey, params: { startDate: string; endDate: string }) => {
    const res = await api.get<{ success: boolean; data: ReportResponse }>(`/reports/${key}`, { params });
    return res.data.data;
  },

  downloadExcel: async (key: ReportKey, params: { startDate: string; endDate: string }) => {
    const res = await api.get<Blob>(`/reports/${key}/export/excel`, {
      params,
      responseType: 'blob' as any
    });
    return res.data as any;
  },

  downloadPdf: async (key: ReportKey, params: { startDate: string; endDate: string }) => {
    const res = await api.get<Blob>(`/reports/${key}/export/pdf`, {
      params,
      responseType: 'blob' as any
    });
    return res.data as any;
  }
};


