import { useState, useEffect } from 'react';
import { workerAPI, type Worker, type CreateWorkerData, type CreateAttendanceData, type CreateAdvanceData, type CreateSalaryBonusData, type GeneratePayrollData } from '../../services/workerAPI';
import { Plus, Eye, Phone, MapPin, User, FileText, CheckCircle, XCircle, Clock, DollarSign, Calendar, Edit2, Save, X, Settings } from 'lucide-react';
import { setupHourlyRefresh } from '../../utils/hourlyRefresh';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatCurrencySimple } from '../../utils/currency';
import { settingsAPI } from '../../services/settingsAPI';
import { productAPI } from '../../services/productAPI';
import { useAuth } from '../../context/AuthContext';

interface WorkerWithTodayAttendance extends Worker {
  today_present?: boolean;
  today_late_hours?: number;
}

interface WorkerSalaryRow extends WorkerWithTodayAttendance {
  workingDays?: number;
  monthlyBonus?: number;
  lateBonus?: number;
  advanceAmount?: number;
  calculatedMainSalary?: number;
  calculatedGrossSalary?: number;
  calculatedEPF?: number;
  calculatedETF?: number;
  calculatedTotalDeductions?: number;
  calculatedNetPay?: number;
}

export const Workers = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';
  const [workers, setWorkers] = useState<WorkerSalaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<WorkerWithTodayAttendance | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<any>(null);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  
  // Current month/year for payroll
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  
  // Add Worker Form
  const [workerForm, setWorkerForm] = useState<CreateWorkerData>({
    name: '',
    phone: '',
    address: '',
    epf_number: '',
    etf_number: '',
    daily_salary: 0, // Will use default from settings
    job_role: '',
    main_salary: 0,
    monthly_bonus: 0,
    late_hour_rate: 0
  } as any);
  
  // Add Attendance Form
  const [attendanceForm, setAttendanceForm] = useState<CreateAttendanceData>({
    workerId: '',
    date: new Date().toISOString().split('T')[0],
    present: true,
    late_hours: 0,
    notes: ''
  });

  // Advance Form
  const [advanceForm, setAdvanceForm] = useState<CreateAdvanceData>({
    workerId: '',
    month: selectedMonth,
    year: selectedYear,
    amount: 0,
    notes: ''
  });

  // Bonus Form
  const [bonusForm, setBonusForm] = useState<CreateSalaryBonusData>({
    workerId: '',
    month: selectedMonth,
    year: selectedYear,
    monthly_bonus: 0,
    late_bonus: 0,
    notes: ''
  });

  // Settings Form (for all workers)
  const [settingsForm, setSettingsForm] = useState({
    defaultDailySalary: 0,
    defaultEPFPercentage: 8.00,
    defaultETFPercentage: 3.00,
    defaultFreeProducts: [] as Array<{ productId: string; quantity: number; unit: string }>
  });
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);

  useEffect(() => {
    loadWorkers();
    loadSettings();
    loadProducts();
    // Refresh once per hour at the top of the hour
    const cleanup = setupHourlyRefresh(loadWorkers);
    return cleanup;
  }, []);

  // Open Worker Settings modal if navigated with ?settings=1 (used by Footer settings shortcut)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldOpen = params.get('settings') === '1';
    if (shouldOpen) {
      setShowSettingsModal(true);
      // Clear query param without leaving the page
      navigate('/salary', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  useEffect(() => {
    // Reload monthly data when month/year changes
    if (workers.length > 0) {
      loadMonthlyDataForWorkers(workers);
    }
  }, [selectedMonth, selectedYear]);

  const loadWorkers = async () => {
    try {
      setLoading(true);
      const data = await workerAPI.getWorkersWithTodayAttendance();
      const workersWithDefaults = (data || []).map(worker => ({
        ...worker,
        workingDays: 0,
        monthlyBonus: 0,
        lateBonus: 0,
        advanceAmount: 0
      }));
      setWorkers(workersWithDefaults);
      // Load monthly data for each worker
      await loadMonthlyDataForWorkers(workersWithDefaults);
    } catch (error) {
      console.error('Failed to load workers:', error);
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyDataForWorkers = async (workersList: WorkerSalaryRow[]) => {
    try {
      const updatedWorkers = await Promise.all(
        workersList.map(async (worker) => {
          try {
            const report = await workerAPI.getMonthlyReport(worker.id, selectedYear, selectedMonth);
            const summary = report?.summary || {};
            // Use working days from report, or keep existing if user manually entered
            const workingDays = summary.workingDays || summary.daysPresent || worker.workingDays || 0;
            return {
              ...worker,
              workingDays: workingDays,
              monthlyBonus: summary.monthlyBonus || 0,
              lateBonus: summary.lateBonus || 0,
              advanceAmount: summary.totalAdvance || 0
            };
          } catch (error) {
            console.error(`Failed to load monthly data for worker ${worker.id}:`, error);
            return worker;
          }
        })
      );
      recalculateAllSalaries(updatedWorkers);
    } catch (error) {
      console.error('Failed to load monthly data:', error);
      recalculateAllSalaries(workersList);
    }
  };

  const loadSettings = async () => {
    try {
      setSettingsLoading(true);
      const defaultDailySalary = await settingsAPI.getSetting('worker_default_daily_salary').catch(() => null);
      const defaultEPF = await settingsAPI.getSetting('worker_default_epf_percentage').catch(() => null);
      const defaultETF = await settingsAPI.getSetting('worker_default_etf_percentage').catch(() => null);
      const defaultFreeProducts = await settingsAPI.getSetting('worker_default_free_products').catch(() => null);

      setSettingsForm({
        defaultDailySalary: defaultDailySalary ? parseFloat(defaultDailySalary.value) : 0,
        defaultEPFPercentage: defaultEPF ? parseFloat(defaultEPF.value) : 8.00,
        defaultETFPercentage: defaultETF ? parseFloat(defaultETF.value) : 3.00,
        defaultFreeProducts: defaultFreeProducts ? JSON.parse(defaultFreeProducts.value || '[]') : []
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const products = await productAPI.getAll();
      setAvailableProducts(products || []);
    } catch (error) {
      console.error('Failed to load products:', error);
      setAvailableProducts([]);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSettingsLoading(true);
      
      // Save each setting
      await settingsAPI.updateSetting('worker_default_daily_salary', settingsForm.defaultDailySalary.toString());
      await settingsAPI.updateSetting('worker_default_epf_percentage', settingsForm.defaultEPFPercentage.toString());
      await settingsAPI.updateSetting('worker_default_etf_percentage', settingsForm.defaultETFPercentage.toString());
      await settingsAPI.updateSetting('worker_default_free_products', JSON.stringify(settingsForm.defaultFreeProducts));

      // Apply to all existing workers
      const updatePromises = workers.map(worker => 
        workerAPI.update(worker.id, {
          daily_salary: settingsForm.defaultDailySalary || worker.daily_salary || (worker.main_salary / 26),
          epf_percentage: settingsForm.defaultEPFPercentage,
          etf_percentage: settingsForm.defaultETFPercentage
        } as any)
      );

      await Promise.all(updatePromises);
      
      setShowSettingsModal(false);
      alert('Settings saved and applied to all workers successfully!');
      loadWorkers();
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      alert(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleAddFreeProduct = () => {
    setSettingsForm({
      ...settingsForm,
      defaultFreeProducts: [
        ...settingsForm.defaultFreeProducts,
        { productId: '', quantity: 0, unit: 'piece' }
      ]
    });
  };

  const handleRemoveFreeProduct = (index: number) => {
    setSettingsForm({
      ...settingsForm,
      defaultFreeProducts: settingsForm.defaultFreeProducts.filter((_, i) => i !== index)
    });
  };

  const recalculateAllSalaries = (workersList?: WorkerSalaryRow[]) => {
    const list = workersList || workers;
    const updated = list.map(worker => {
      const dailySalary = worker.daily_salary || (worker.main_salary / 26) || 0;
      const workingDays = worker.workingDays || 26;
      const mainSalary = dailySalary * workingDays;
      const monthlyBonus = worker.monthlyBonus || 0;
      const lateBonus = worker.lateBonus || 0;
      const grossSalary = mainSalary + monthlyBonus + lateBonus;
      const epfPercentage = worker.epf_percentage || 8.00;
      const etfPercentage = worker.etf_percentage || 3.00;
      const epfAmount = grossSalary * (epfPercentage / 100);
      const etfAmount = grossSalary * (etfPercentage / 100);
      const advanceAmount = worker.advanceAmount || 0;
      const totalDeductions = advanceAmount + epfAmount + etfAmount;
      const netPay = grossSalary - totalDeductions;

      return {
        ...worker,
        calculatedMainSalary: mainSalary,
        calculatedGrossSalary: grossSalary,
        calculatedEPF: epfAmount,
        calculatedETF: etfAmount,
        calculatedTotalDeductions: totalDeductions,
        calculatedNetPay: netPay
      };
    });
    setWorkers(updated);
  };

  const handleWorkingDaysChange = (workerId: string, days: number) => {
    const updated = workers.map(worker => 
      worker.id === workerId 
        ? { ...worker, workingDays: Math.max(0, Math.min(31, days)) }
        : worker
    );
    setWorkers(updated);
    recalculateAllSalaries(updated);
  };

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerForm.name.trim()) {
      alert('Please enter worker name');
      return;
    }
    
    // Use default settings if not provided in form
    const dailySalary = settingsForm.defaultDailySalary || 0;
    if (!dailySalary || dailySalary <= 0) {
      alert('Please set default daily salary in Worker Settings first');
      return;
    }

    try {
      await workerAPI.create({
        ...workerForm,
        daily_salary: dailySalary,
        epf_percentage: settingsForm.defaultEPFPercentage,
        etf_percentage: settingsForm.defaultETFPercentage,
        job_role: (workerForm as any).job_role || undefined
      } as any);
      setShowAddWorkerModal(false);
      setWorkerForm({
        name: '',
        phone: '',
        address: '',
        epf_number: '',
        etf_number: '',
        daily_salary: 0,
        job_role: '',
        main_salary: 0,
        monthly_bonus: 0,
        late_hour_rate: 0
      } as any);
      loadWorkers();
    } catch (error: any) {
      console.error('Failed to add worker:', error);
      alert(error.response?.data?.message || 'Failed to add worker');
    }
  };

  const handleAddAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker) {
      alert('Please select a worker');
      return;
    }

    try {
      await workerAPI.addAttendance({
        ...attendanceForm,
        workerId: selectedWorker.id
      });
      
      setShowAttendanceModal(false);
      setAttendanceForm({
        workerId: '',
        date: new Date().toISOString().split('T')[0],
        present: true,
        late_hours: 0,
        notes: ''
      });
      setSelectedWorker(null);
      loadWorkers();
      alert('Attendance recorded successfully!');
    } catch (error: any) {
      console.error('Failed to add attendance:', error);
      alert(error.response?.data?.message || 'Failed to record attendance');
    }
  };

  const handleAddAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker) {
      alert('Please select a worker');
      return;
    }

    try {
      await workerAPI.addAdvance({
        ...advanceForm,
        workerId: selectedWorker.id
      });
      
      setShowAdvanceModal(false);
      setAdvanceForm({
        workerId: '',
        month: selectedMonth,
        year: selectedYear,
        amount: 0,
        notes: ''
      });
      setSelectedWorker(null);
      // Reload monthly data to reflect the new advance
      await loadMonthlyDataForWorkers(workers);
      alert('Advance payment recorded successfully!');
    } catch (error: any) {
      console.error('Failed to add advance:', error);
      alert(error.response?.data?.message || 'Failed to record advance');
    }
  };

  const handleAddBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker) {
      alert('Please select a worker');
      return;
    }

    try {
      await workerAPI.addSalaryBonus({
        ...bonusForm,
        workerId: selectedWorker.id
      });
      
      setShowBonusModal(false);
      setBonusForm({
        workerId: '',
        month: selectedMonth,
        year: selectedYear,
        monthly_bonus: 0,
        late_bonus: 0,
        notes: ''
      });
      setSelectedWorker(null);
      // Reload monthly data to reflect the new bonus
      await loadMonthlyDataForWorkers(workers);
      alert('Salary bonus saved successfully!');
    } catch (error: any) {
      console.error('Failed to add bonus:', error);
      alert(error.response?.data?.message || 'Failed to save bonus');
    }
  };

  const handleGeneratePayroll = async (worker: WorkerSalaryRow) => {
    if (!worker.workingDays || worker.workingDays <= 0) {
      alert('Please enter working days first');
      return;
    }

    try {
      await workerAPI.generatePayroll({
        workerId: worker.id,
        month: selectedMonth,
        year: selectedYear,
        workingDays: worker.workingDays
      });
      alert('Payroll generated successfully! You can now view/print the paysheet.');
      // Reload to get updated data
      await loadMonthlyDataForWorkers(workers);
    } catch (error: any) {
      console.error('Failed to generate payroll:', error);
      alert(error.response?.data?.message || 'Failed to generate payroll');
    }
  };

  const handleViewDetails = async (worker: WorkerWithTodayAttendance) => {
    setSelectedWorker(worker);
    try {
      const report = await workerAPI.getMonthlyReport(worker.id, selectedYear, selectedMonth);
      setMonthlyReport(report);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Failed to load monthly report:', error);
      alert('Failed to load worker details');
    }
  };

  const handleViewPaysheet = (worker: WorkerSalaryRow) => {
    const days = worker.workingDays || 0;
    navigate(`/salary/paysheet/${worker.id}?year=${selectedYear}&month=${selectedMonth}&days=${days}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading workers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        {isAdmin && (
          <button
            onClick={() => setShowSettingsModal(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Worker Settings
          </button>
        )}
        <button
          onClick={() => {
            setWorkerForm({
              name: '',
              phone: '',
              address: '',
              epf_number: '',
              etf_number: '',
              daily_salary: 0,
              epf_percentage: 8.00,
              etf_percentage: 3.00,
              job_role: '',
              main_salary: 0,
              monthly_bonus: 0,
              late_hour_rate: 0
            } as any);
            setShowAddWorkerModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Worker
        </button>
      </div>

      {/* Month/Year Selector */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Payroll Period:</label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
            <option key={m} value={m}>{new Date(2000, m-1).toLocaleString('en-US', { month: 'long' })}</option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          {[currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Professional Salary Table */}
      {workers.length > 0 ? (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Daily Salary</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Days</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Main Salary</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Bonus</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Late Bonus</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Advance</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">EPF</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">ETF</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Net Salary</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {workers.map((worker, index) => (
                  <tr key={worker.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100'}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-gray-900">{worker.name}</p>
                        {worker.job_role && (
                          <p className="text-xs text-gray-500">{worker.job_role}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatCurrencySimple(worker.daily_salary || (worker.main_salary / 26) || 0)}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        max="31"
                        value={worker.workingDays || 26}
                        onChange={(e) => handleWorkingDaysChange(worker.id, parseInt(e.target.value) || 0)}
                        className="w-16 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      {formatCurrencySimple(worker.calculatedMainSalary || 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-blue-600">
                      {formatCurrencySimple(worker.monthlyBonus || 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-blue-600">
                      {formatCurrencySimple(worker.lateBonus || 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-red-600">
                      {formatCurrencySimple(worker.advanceAmount || 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-red-600">
                      {formatCurrencySimple(worker.calculatedEPF || 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-red-600">
                      {formatCurrencySimple(worker.calculatedETF || 0)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-base font-bold text-green-700">
                        {formatCurrencySimple(worker.calculatedNetPay || 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedWorker(worker);
                            setAdvanceForm({
                              workerId: worker.id,
                              month: selectedMonth,
                              year: selectedYear,
                              amount: 0,
                              notes: ''
                            });
                            setShowAdvanceModal(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Add Advance"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedWorker(worker);
                            setBonusForm({
                              workerId: worker.id,
                              month: selectedMonth,
                              year: selectedYear,
                              monthly_bonus: worker.monthlyBonus || 0,
                              late_bonus: worker.lateBonus || 0,
                              notes: ''
                            });
                            setShowBonusModal(true);
                          }}
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded"
                          title="Add Bonus"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleViewPaysheet(worker)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                          title="View Paysheet"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No workers found</p>
          <p className="text-gray-400 text-sm mt-2">Add your first worker to get started</p>
        </div>
      )}

      {/* Add Worker Modal */}
      {showAddWorkerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowAddWorkerModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <h2 className="text-2xl font-bold mb-6">Add Worker</h2>
            <form onSubmit={handleAddWorker} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Name *</label>
                  <input
                    type="text"
                    required
                    value={workerForm.name}
                    onChange={(e) => setWorkerForm({ ...workerForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Phone</label>
                  <input
                    type="text"
                    value={workerForm.phone || ''}
                    onChange={(e) => setWorkerForm({ ...workerForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2 text-gray-700">Address</label>
                  <textarea
                    value={workerForm.address || ''}
                    onChange={(e) => setWorkerForm({ ...workerForm, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">EPF Number</label>
                  <input
                    type="text"
                    value={workerForm.epf_number || ''}
                    onChange={(e) => setWorkerForm({ ...workerForm, epf_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">ETF Number</label>
                  <input
                    type="text"
                    value={workerForm.etf_number || ''}
                    onChange={(e) => setWorkerForm({ ...workerForm, etf_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Job Role</label>
                  <input
                    type="text"
                    value={(workerForm as any).job_role || ''}
                    onChange={(e) => setWorkerForm({ ...workerForm, job_role: e.target.value } as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., Production Worker, Driver"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowAddWorkerModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Worker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Advance Modal */}
      {showAdvanceModal && selectedWorker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowAdvanceModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-2xl font-bold mb-4">Add Advance Payment</h2>
            <p className="text-sm text-gray-600 mb-4">Worker: <strong>{selectedWorker.name}</strong></p>
            <form onSubmit={handleAddAdvance} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Amount (Rs.) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={advanceForm.amount || ''}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Notes</label>
                <textarea
                  value={advanceForm.notes || ''}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowAdvanceModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Advance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bonus Modal */}
      {showBonusModal && selectedWorker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowBonusModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-2xl font-bold mb-4">Add Salary Bonus</h2>
            <p className="text-sm text-gray-600 mb-4">Worker: <strong>{selectedWorker.name}</strong></p>
            <form onSubmit={handleAddBonus} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Monthly Bonus (Rs.)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={bonusForm.monthly_bonus || ''}
                  onChange={(e) => setBonusForm({ ...bonusForm, monthly_bonus: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Late Hour Bonus (Rs.)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={bonusForm.late_bonus || ''}
                  onChange={(e) => setBonusForm({ ...bonusForm, late_bonus: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Notes</label>
                <textarea
                  value={bonusForm.notes || ''}
                  onChange={(e) => setBonusForm({ ...bonusForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowBonusModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Bonus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowSettingsModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
              <h2 className="text-2xl font-bold text-gray-900">Worker Settings</h2>
              <p className="text-sm text-gray-600 mt-1">Configure default settings that apply to all workers</p>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleSaveSettings} className="space-y-6">
                {/* Default Daily Salary */}
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Default Daily Salary</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Daily Salary (Rs.) *
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Rs.</span>
                        <input
                          type="number"
                          step="0.01"
                          required
                          min="0"
                          value={settingsForm.defaultDailySalary || ''}
                          onChange={(e) => setSettingsForm({ ...settingsForm, defaultDailySalary: parseFloat(e.target.value) || 0 })}
                          className="flex-1 input text-lg font-semibold"
                        />
                        <span className="text-gray-600">per day</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        This will be applied to all new workers and can update existing workers
                      </p>
                    </div>
                  </div>
                </div>

                {/* EPF & ETF Percentages */}
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">EPF & ETF Percentages</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        EPF Percentage (%) *
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          required
                          min="0"
                          max="100"
                          value={settingsForm.defaultEPFPercentage || ''}
                          onChange={(e) => setSettingsForm({ ...settingsForm, defaultEPFPercentage: parseFloat(e.target.value) || 8.00 })}
                          className="flex-1 input"
                        />
                        <span className="text-gray-600">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ETF Percentage (%) *
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          required
                          min="0"
                          max="100"
                          value={settingsForm.defaultETFPercentage || ''}
                          onChange={(e) => setSettingsForm({ ...settingsForm, defaultETFPercentage: parseFloat(e.target.value) || 3.00 })}
                          className="flex-1 input"
                        />
                        <span className="text-gray-600">%</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-3">
                    These percentages will be applied to all workers' gross salary
                  </p>
                </div>

                {/* Default Free Products */}
                <div className="card">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Default Free Products (Monthly)</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Products given to all workers monthly (reduces inventory)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddFreeProduct}
                      className="btn-secondary flex items-center gap-2 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Product
                    </button>
                  </div>
                  
                  {settingsForm.defaultFreeProducts.length > 0 ? (
                    <div className="space-y-3">
                      {settingsForm.defaultFreeProducts.map((item, index) => (
                        <div key={index} className="flex gap-3 items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <select
                            required
                            value={item.productId}
                            onChange={(e) => {
                              const updated = [...settingsForm.defaultFreeProducts];
                              updated[index].productId = e.target.value;
                              setSettingsForm({ ...settingsForm, defaultFreeProducts: updated });
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            <option value="">Select Product</option>
                            {availableProducts.map(product => (
                              <option key={product.id} value={product.id}>{product.name}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            step="0.01"
                            required
                            min="0"
                            value={item.quantity || ''}
                            onChange={(e) => {
                              const updated = [...settingsForm.defaultFreeProducts];
                              updated[index].quantity = parseFloat(e.target.value) || 0;
                              setSettingsForm({ ...settingsForm, defaultFreeProducts: updated });
                            }}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Quantity"
                          />
                          <input
                            type="text"
                            value={item.unit || 'piece'}
                            onChange={(e) => {
                              const updated = [...settingsForm.defaultFreeProducts];
                              updated[index].unit = e.target.value;
                              setSettingsForm({ ...settingsForm, defaultFreeProducts: updated });
                            }}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Unit"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveFreeProduct(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove product"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                      No products added. Click "Add Product" to start.
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-3">
                    These products will be automatically assigned to all workers each month. 
                    You can also manually assign different products to specific workers when generating their paysheet.
                  </p>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button 
                    type="button" 
                    onClick={() => setShowSettingsModal(false)} 
                    className="flex-1 btn-secondary"
                    disabled={settingsLoading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 btn-primary flex items-center justify-center gap-2"
                    disabled={settingsLoading}
                  >
                    <Save className="w-4 h-4" />
                    {settingsLoading ? 'Saving...' : 'Save & Apply to All Workers'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && selectedWorker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowAttendanceModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-2xl font-bold mb-4">Record Attendance</h2>
            <p className="text-sm text-gray-600 mb-4">Worker: <strong>{selectedWorker.name}</strong></p>
            <form onSubmit={handleAddAttendance} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Date *</label>
                <input
                  type="date"
                  required
                  value={attendanceForm.date}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attendanceForm.present}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, present: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Present</span>
                </label>
              </div>
              {attendanceForm.present && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Late Hours (Overtime)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={attendanceForm.late_hours || ''}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, late_hours: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Notes</label>
                <textarea
                  value={attendanceForm.notes || ''}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowAttendanceModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Record Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
