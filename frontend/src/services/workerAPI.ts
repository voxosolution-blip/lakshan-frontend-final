import api from './api';

export interface Worker {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  epf_number?: string;
  etf_number?: string;
  daily_salary?: number;
  main_salary: number;
  monthly_bonus: number;
  late_hour_rate: number;
  epf_percentage?: number;
  etf_percentage?: number;
  job_role?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  today_present?: boolean;
  today_late_hours?: number;
}

export interface WorkerAttendance {
  id: string;
  worker_id: string;
  date: string;
  present: boolean;
  late_hours: number;
  notes?: string;
  created_at?: string;
}

export interface WorkerAdvance {
  id: string;
  worker_id: string;
  month: number;
  year: number;
  amount: number;
  payment_date: string;
  notes?: string;
}

export interface WorkerFreeProduct {
  id: string;
  worker_id: string;
  month: number;
  year: number;
  inventory_item_id?: string;
  product_id?: string;
  quantity: number;
  unit: string;
  product_name?: string;
  notes?: string;
}

export interface CreateWorkerData {
  name: string;
  phone?: string;
  address?: string;
  epf_number?: string;
  etf_number?: string;
  daily_salary: number;
  epf_percentage?: number;
  etf_percentage?: number;
  job_role?: string;
  main_salary?: number; // For backward compatibility
  monthly_bonus?: number;
  late_hour_rate?: number;
}

export interface CreateAttendanceData {
  workerId: string;
  date?: string;
  present: boolean;
  late_hours?: number;
  notes?: string;
}

export interface CreateAdvanceData {
  workerId: string;
  month: number;
  year: number;
  amount: number;
  payment_date?: string;
  time?: string;
  notes?: string;
}

export interface SalaryBonus {
  id: string;
  worker_id: string;
  month: number;
  year: number;
  monthly_bonus: number;
  late_bonus: number;
  notes?: string;
}

export interface CreateSalaryBonusData {
  workerId: string;
  month: number;
  year: number;
  monthly_bonus?: number;
  late_bonus?: number;
  notes?: string;
}

export interface Payroll {
  id: string;
  worker_id: string;
  month: number;
  year: number;
  daily_salary: number;
  working_days: number;
  main_salary: number;
  monthly_bonus: number;
  late_bonus: number;
  advance_amount: number;
  epf_amount: number;
  etf_amount: number;
  gross_salary: number;
  total_deductions: number;
  net_pay: number;
  payment_status?: string;
  created_at?: string;
}

export interface GeneratePayrollData {
  workerId: string;
  month: number;
  year: number;
  workingDays: number;
}

export interface CreateFreeProductsData {
  workerId: string;
  month: number;
  year: number;
  items: Array<{
    inventory_item_id?: string;
    product_id?: string;
    quantity: number;
    unit?: string;
    notes?: string;
  }>;
}

export const workerAPI = {
  // Get all workers with today's attendance (for Salary page)
  getWorkersWithTodayAttendance: async (): Promise<Worker[]> => {
    const response = await api.get<{ success: boolean; data: Worker[] }>('/workers/with-today-attendance');
    return response.data.data;
  },

  // Get all workers (simple list)
  getAll: async (): Promise<Worker[]> => {
    const response = await api.get<{ success: boolean; data: Worker[] }>('/workers');
    return response.data.data;
  },

  // Get worker by ID
  getById: async (id: string): Promise<Worker> => {
    const response = await api.get<{ success: boolean; data: Worker }>(`/workers/${id}`);
    return response.data.data;
  },

  // Create worker
  create: async (data: CreateWorkerData): Promise<Worker> => {
    const response = await api.post<{ success: boolean; data: Worker; message: string }>('/workers', data);
    return response.data.data;
  },

  // Update worker
  update: async (id: string, data: Partial<CreateWorkerData>): Promise<Worker> => {
    const response = await api.put<{ success: boolean; data: Worker; message: string }>(`/workers/${id}`, data);
    return response.data.data;
  },

  // Delete worker
  delete: async (id: string): Promise<void> => {
    await api.delete<{ success: boolean; message: string }>(`/workers/${id}`);
  },

  // Add attendance
  addAttendance: async (data: CreateAttendanceData): Promise<WorkerAttendance> => {
    const response = await api.post<{ success: boolean; data: WorkerAttendance; message: string }>('/workers/attendance', data);
    return response.data.data;
  },

  // Get monthly report for worker
  getMonthlyReport: async (workerId: string, year?: number, month?: number): Promise<any> => {
    const response = await api.get<{ success: boolean; data: any }>(`/workers/${workerId}/monthly-report`, {
      params: { year, month }
    });
    return response.data.data;
  },

  // Add advance payment
  addAdvance: async (data: CreateAdvanceData): Promise<WorkerAdvance> => {
    const response = await api.post<{ success: boolean; data: WorkerAdvance; message: string }>('/workers/advance', data);
    return response.data.data;
  },

  // Add free products
  addFreeProducts: async (data: CreateFreeProductsData): Promise<WorkerFreeProduct[]> => {
    const response = await api.post<{ success: boolean; data: WorkerFreeProduct[]; message: string }>('/workers/free-products', data);
    return response.data.data;
  },

  // Add or update salary bonus
  addSalaryBonus: async (data: CreateSalaryBonusData): Promise<SalaryBonus> => {
    const response = await api.post<{ success: boolean; data: SalaryBonus; message: string }>('/workers/salary-bonus', data);
    return response.data.data;
  },

  // Generate payroll
  generatePayroll: async (data: GeneratePayrollData): Promise<Payroll> => {
    const response = await api.post<{ success: boolean; data: Payroll; message: string }>('/workers/generate-payroll', data);
    return response.data.data;
  },

  // Issue (deduct) monthly free products when paysheet is printed (idempotent)
  issueFreeProducts: async (workerId: string, year: number, month: number): Promise<any> => {
    const response = await api.post<{ success: boolean; data: any; message: string }>(`/workers/${workerId}/issue-free-products`, {
      year,
      month
    });
    return response.data.data;
  }
};

