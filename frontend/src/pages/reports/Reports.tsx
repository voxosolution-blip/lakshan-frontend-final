import { useEffect, useMemo, useState } from 'react';
import {
  Milk,
  Users,
  Package,
  Factory,
  ShoppingCart,
  RotateCcw,
  Banknote,
  Receipt,
  FileText,
  BadgeDollarSign,
  Download
} from 'lucide-react';
import { reportsAPI, type ReportKey } from '../../services/reportsAPI';
import { formatCurrencySimple } from '../../utils/currency';
import { SalesReportView } from './SalesReportView';

export const Reports = () => {
  const [selectedReport, setSelectedReport] = useState<ReportKey>('sales');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReport]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportsAPI.getReport(selectedReport, { startDate, endDate });
      setReport(data);
    } catch (e: any) {
      console.error('Failed to load report:', e);
      setReport(null);
      setError(e?.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const cards = useMemo(
    () => [
      { key: 'milk' as const, title: 'Milk Collection', icon: Milk },
      { key: 'payroll' as const, title: 'Salary & Payroll', icon: Users },
      { key: 'inventory' as const, title: 'Inventory', icon: Package },
      { key: 'production' as const, title: 'Production', icon: Factory },
      { key: 'sales' as const, title: 'Sales', icon: ShoppingCart },
      { key: 'returns' as const, title: 'Returns', icon: RotateCcw },
      { key: 'payments' as const, title: 'Payments', icon: Banknote },
      { key: 'cheques' as const, title: 'Cheques', icon: Receipt },
      { key: 'expenses' as const, title: 'Expenses', icon: FileText },
      { key: 'final-financial' as const, title: 'Final Financial Report', icon: BadgeDollarSign }
    ],
    []
  );

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const onDownloadExcel = async () => {
    try {
      const blob = await reportsAPI.downloadExcel(selectedReport, { startDate, endDate });
      downloadBlob(blob, `${selectedReport}_${startDate}_to_${endDate}.xlsx`);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to download Excel');
    }
  };

  const onDownloadPdf = async () => {
    try {
      const blob = await reportsAPI.downloadPdf(selectedReport, { startDate, endDate });
      downloadBlob(blob, `${selectedReport}_${startDate}_to_${endDate}.pdf`);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to download PDF');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading report...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Report Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          const active = selectedReport === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setSelectedReport(c.key)}
              className={`card p-4 text-left transition border ${
                active ? 'border-primary-500 ring-2 ring-primary-100' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-gray-700" />
                <div className="text-sm font-semibold text-gray-900">{c.title}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">From</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">To</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full input" />
          </div>
          <div className="flex items-end">
            <button onClick={loadReport} className="btn-primary w-full">
              Generate Report
            </button>
          </div>
          <div className="flex items-end">
            <div className="w-full flex flex-col sm:flex-row gap-2">
              <button 
                onClick={onDownloadExcel} 
                className="btn-secondary w-full flex items-center justify-center gap-2"
                title="Download Excel (Shop-wise format for Sales)"
              >
              <Download className="w-4 h-4" />
              Excel
              </button>
              <button 
                onClick={onDownloadPdf} 
                className="btn-secondary w-full flex items-center justify-center gap-2"
                disabled={selectedReport === 'sales'}
                title={selectedReport === 'sales' ? 'PDF export not available for shop-wise view' : 'Download PDF'}
              >
              <Download className="w-4 h-4" />
              PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="card border border-red-200 bg-red-50 text-red-800 p-4">{error}</div>}

      {/* Sales Report - Shop-wise View */}
      {selectedReport === 'sales' && !error && (
        <SalesReportView startDate={startDate} endDate={endDate} />
      )}

      {/* Report Content */}
      {report && selectedReport !== 'sales' && (
        <div className="space-y-6">
          {/* Detail Table */}
          {selectedReport !== 'final-financial' && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-lg font-bold text-gray-900">{report.meta?.reportName}</div>
                  <div className="text-sm text-gray-600">
                    Period: {report.meta?.period?.startDate} to {report.meta?.period?.endDate}
                  </div>
                </div>
              </div>

              {/* Host-safe table wrapper: never overflow outside card */}
              <div className="-mx-4 px-4 overflow-x-auto overflow-y-hidden">
                <table className="min-w-max w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200 bg-gray-50">
                      {(report.columns || []).map((col: any) => (
                        <th key={col.key} className="text-left p-3 text-sm font-semibold text-gray-700 whitespace-nowrap">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(report.details || []).map((row: any, idx: number) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        {(report.columns || []).map((col: any) => {
                          const k = String(col.key || '').toLowerCase();
                          const wrap =
                            k.includes('notes') ||
                            k.includes('description') ||
                            k.includes('address') ||
                            k.includes('reason') ||
                            k.includes('customer') ||
                            k.includes('farmer') || k.includes('collector') ||
                            k.includes('created_by');
                          return (
                            <td
                              key={col.key}
                              className={`p-3 text-sm text-gray-800 ${
                                wrap ? 'whitespace-normal break-words max-w-[320px]' : 'whitespace-nowrap'
                              }`}
                            >
                              {String(row?.[col.key] ?? '')}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {(report.details || []).length === 0 && (
                      <tr>
                        <td className="p-6 text-center text-gray-500" colSpan={(report.columns || []).length || 1}>
                          No transactions found for selected period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Summary (bottom) */}
          <div className="card border border-gray-200">
            <div className="border-b border-gray-200 p-4">
              <div className="text-lg font-bold text-gray-900">Report Summary</div>
              <div className="text-sm text-gray-600">
                {report.meta?.reportName} • {report.meta?.period?.startDate} to {report.meta?.period?.endDate}
              </div>
            </div>
            <div className="p-4 space-y-2 text-sm">
              {selectedReport === 'final-financial' ? (
                <div className="space-y-4">
                  <div>
                    <div className="font-semibold text-gray-900 mb-2">Profit & Loss</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>Total Sales: <span className="font-semibold">{formatCurrencySimple(Number(report.summary?.profit_and_loss?.total_sales || 0))}</span></div>
                      <div>Total Returns: <span className="font-semibold">{formatCurrencySimple(Number(report.summary?.profit_and_loss?.total_returns || 0))}</span></div>
                      <div>Net Sales: <span className="font-semibold">{formatCurrencySimple(Number(report.summary?.profit_and_loss?.net_sales || 0))}</span></div>
                      <div>COGS (Estimated): <span className="font-semibold">{formatCurrencySimple(Number(report.summary?.profit_and_loss?.cogs_estimated || 0))}</span></div>
                      <div>Gross Profit: <span className="font-semibold">{formatCurrencySimple(Number(report.summary?.profit_and_loss?.gross_profit || 0))}</span></div>
                      <div>Net Profit: <span className="font-semibold">{formatCurrencySimple(Number(report.summary?.profit_and_loss?.net_profit || 0))}</span></div>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 mb-2">Balance Sheet (Simplified)</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>Assets: <span className="font-semibold">{formatCurrencySimple(Number(report.summary?.balance_sheet?.assets || 0))}</span></div>
                      <div>Liabilities: <span className="font-semibold">{formatCurrencySimple(Number(report.summary?.balance_sheet?.liabilities || 0))}</span></div>
                      <div>Equity: <span className="font-semibold">{formatCurrencySimple(Number(report.summary?.balance_sheet?.equity || 0))}</span></div>
                      <div className="text-gray-600">{report.summary?.balance_sheet?.validation}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-800">
                    {Object.entries(report.summary || {}).map(([k, v]: any) => (
                      <div key={k} className="flex items-start justify-between gap-4 min-w-0">
                        <div className="text-gray-600 shrink-0">{k.replace(/_/g, ' ')}</div>
                        <div className="font-semibold text-right break-words min-w-0">{String(v)}</div>
                      </div>
                    ))}
                  </div>

                  {report.reconciliation && (
                    <div className="pt-3 border-t border-gray-200">
                      <div className="font-semibold text-gray-900 mb-2">Reconciliation</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {Object.entries(report.reconciliation || {}).map(([k, v]: any) => (
                          <div key={k} className="flex items-start justify-between gap-4 min-w-0">
                            <div className="text-gray-600 shrink-0">{k.replace(/_/g, ' ')}</div>
                            <div className="font-semibold text-right break-words min-w-0">{String(v)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
