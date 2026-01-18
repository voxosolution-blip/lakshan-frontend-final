import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { workerAPI } from '../../services/workerAPI';
import { ArrowLeft, Printer } from 'lucide-react';
import logoImage from '../../assets/Logo.png';

type Lang = 'EN' | 'SI';

const LABELS = {
  EN: {
    title: 'Monthly Salary Paysheet',
    workerInfo: 'Worker Information',
    attendanceDetails: 'Attendance Details',
    salarySummary: 'Salary Summary',
    daysPresent: 'Days Present',
    dailySalary: 'Daily Salary',
    workingDays: 'Working Days',
    mainSalary: 'Main Salary',
    monthlyBonus: 'Monthly Bonus',
    lateBonus: 'Late Hour Bonus',
    grossSalary: 'Gross Salary',
    epfAmount: 'EPF Deduction',
    etfAmount: 'ETF Deduction',
    totalAdvance: 'Total Advance',
    totalDeductions: 'Total Deductions',
    netPay: 'Net Pay Amount',
    preparedBy: 'Prepared By',
    receivedBy: 'Received By',
    ownerSignature: 'Owner Signature',
    workerSignature: 'Worker Signature',
    back: 'Back',
    print: 'Print Paysheet',
    language: 'සිංහල',
    name: 'Name',
    phone: 'Phone',
    address: 'Address',
    epf: 'EPF Number',
    etf: 'ETF Number',
    date: 'Date',
    present: 'Present',
    absent: 'Absent',
    lateHours: 'Late Hours',
    noAttendance: 'No attendance records for this month',
    signature: 'Signature',
    generatedOn: 'Generated on',
    period: 'Period',
    advances: 'Advance Payments',
    freeProducts: 'Free Products',
    productName: 'Product Name',
    quantity: 'Quantity',
    unit: 'Unit',
  },
  SI: {
    title: 'මාසික වැටුප් ගෙවීම් පත්‍රය',
    workerInfo: 'කම්කරුවාගේ තොරතුරු',
    attendanceDetails: 'පැමිණීමේ විස්තර',
    salarySummary: 'වැටුප් සාරාංශය',
    daysPresent: 'පැමිණි දින',
    dailySalary: 'දිනකට වැටුප්',
    workingDays: 'වැඩ කළ දින',
    mainSalary: 'ප්‍රධාන වැටුප්',
    monthlyBonus: 'මාසික ප්‍රසාද',
    lateBonus: 'පසුවීමේ ප්‍රසාද',
    grossSalary: 'ප්‍රසාරිත වැටුප්',
    epfAmount: 'EPF අඩු කිරීම',
    etfAmount: 'ETF අඩු කිරීම',
    totalAdvance: 'මුළු උපග්‍රහ',
    totalDeductions: 'මුළු අඩු කිරීම්',
    netPay: 'ශුද්ධ ගෙවීම් මුදල',
    preparedBy: 'සකස් කළ',
    receivedBy: 'ලැබූ කම්කරුවා',
    ownerSignature: 'හිමිකරුගේ අත්සන',
    workerSignature: 'කම්කරුවාගේ අත්සන',
    back: 'ආපසු',
    print: 'මුද්‍රණය කරන්න',
    language: 'English',
    name: 'නම',
    phone: 'දුරකථන',
    address: 'ලිපිනය',
    epf: 'EPF අංකය',
    etf: 'ETF අංකය',
    date: 'දිනය',
    present: 'පැමිණියේ',
    absent: 'නොපැමිණියේ',
    lateHours: 'පසුවීමේ පැය',
    noAttendance: 'මෙම මාසයට පැමිණීමේ වාර්තා නොමැත',
    signature: 'අත්සන',
    generatedOn: 'නිපදවන ලද්දේ',
    period: 'කාල සීමාව',
    advances: 'උපග්‍රහ ගෙවීම්',
    freeProducts: 'නොමිලේ නිෂ්පාදන',
    productName: 'නිෂ්පාදන නම',
    quantity: 'ප්‍රමාණය',
    unit: 'ඒකකය',
  }
};

export const WorkerPaysheet = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [currentDate] = useState(new Date());
  const [lang, setLang] = useState<Lang>('EN');
  const t = LABELS[lang];

  // Get year and month from URL params or use current date
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : currentDate.getFullYear();
  const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : currentDate.getMonth() + 1;
  const workingDays = searchParams.get('days') ? parseInt(searchParams.get('days')!) : 0;

  useEffect(() => {
    if (id) {
      loadAndGenerateReport();
    }
  }, [id, year, month]);

  const loadAndGenerateReport = async () => {
    try {
      setLoading(true);
      
      // First get the report to check working days
      let data = await workerAPI.getMonthlyReport(id!, year, month);
      
      // If working days from URL or from report, auto-generate payroll
      const days = workingDays || data?.summary?.workingDays || data?.summary?.daysPresent || 0;
      
      if (days > 0) {
        // Auto-generate payroll with the working days
        try {
          await workerAPI.generatePayroll({
            workerId: id!,
            month: month,
            year: year,
            workingDays: days
          });
          // Reload report after generating
          data = await workerAPI.getMonthlyReport(id!, year, month);
        } catch (genError) {
          console.error('Failed to auto-generate payroll:', genError);
        }
      }
      
      setReport(data);
    } catch (error) {
      console.error('Failed to load report:', error);
      alert('Failed to load worker report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    (async () => {
      try {
        // Issue free products (deduct inventory) once per month before printing.
        // Safe on reprint (backend checks issued_at).
        if (report?.period?.year && report?.period?.month) {
          await workerAPI.issueFreeProducts(id!, report.period.year, report.period.month);
        }
      } catch (error: any) {
        console.error('Failed to issue free products:', error);
        const msg = error?.response?.data?.message || error?.message || 'Failed to issue free products';
        alert(msg);
        return;
      }

      window.print();
    })();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading paysheet...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  const monthName =
    lang === 'SI'
      ? new Date(report.period.year, report.period.month - 1)
          .toLocaleString('si-LK', { month: 'long', year: 'numeric' })
      : new Date(report.period.year, report.period.month - 1)
          .toLocaleString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <>
      {/* Action Buttons - Hidden when printing */}
      <div className="flex items-center gap-4 print:hidden mb-6">
        <button
          onClick={() => navigate('/salary')}
          className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          {t.back}
        </button>
        <button
          onClick={() => setLang(lang === 'EN' ? 'SI' : 'EN')}
          className="btn-secondary"
        >
          {t.language}
        </button>
        <button
          onClick={handlePrint}
          className="btn-primary flex items-center gap-2"
        >
          <Printer className="w-4 h-4" />
          {t.print}
        </button>
      </div>

      {/* Printable Paysheet */}
      <div className={`paysheet-print bg-white p-6 print:p-8 shadow-lg print:shadow-none relative ${lang === 'SI' ? 'font-sinhala' : ''}`} style={{ minHeight: '11in' }}>
        {/* Background Logo - Watermark */}
        <div 
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: `url(${logoImage})`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />

        {/* Content */}
        <div className="relative z-10">
          {/* Centered Header */}
          <div className="border-b-2 border-gray-300 pb-4 mb-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <img src={logoImage} alt="Logo" className="h-14 w-auto" />
              <div>
                <h1 className="text-base font-bold text-gray-900">Lakshan Dairy Products</h1>
                <p className="text-sm text-gray-600 mt-1">17 Mile Post, wewmada, Bibile Rd, Bakinigahawela</p>
                <p className="text-xs text-gray-500 mt-0.5">Tel: 0779708725 | Email: milkfoodlakshan@gmail.com</p>
              </div>
            </div>
          </div>

          {/* Title and Period - Centered */}
          <div className="mb-6 text-center">
            <h2 className="text-base font-bold text-gray-900 mb-1">{t.title}</h2>
            <p className="text-sm text-gray-600">{monthName}</p>
          </div>

          {/* Worker Information & Salary Summary - Side by Side */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="bg-white border-l-4 border-primary-600 p-4 rounded shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">{t.workerInfo}</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">{t.name}</p>
                  <p className="text-base font-semibold text-gray-900">{report.worker.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">{t.phone}</p>
                  <p className="text-base font-medium text-gray-900">{report.worker.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">{t.address}</p>
                  <p className="text-sm font-medium text-gray-900">{report.worker.address || 'N/A'}</p>
                </div>
                {report.worker.epf_number && (
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">{t.epf}</p>
                    <p className="text-sm font-medium text-gray-900">{report.worker.epf_number}</p>
                  </div>
                )}
                {report.worker.etf_number && (
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">{t.etf}</p>
                    <p className="text-sm font-medium text-gray-900">{report.worker.etf_number}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-gray-50 border-l-4 border-gray-400 p-4 rounded shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">{t.salarySummary}</h3>
              <div className="space-y-2">
                {/* Daily Salary & Working Days */}
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-600">{t.dailySalary}</p>
                  <p className="text-sm font-semibold text-gray-900">Rs. {(report.summary.dailySalary || report.worker.daily_salary || 0).toFixed(2)}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-600">{t.workingDays}</p>
                  <p className="text-sm font-semibold text-gray-900">{report.summary.workingDays || report.summary.daysPresent || 0} days</p>
                </div>
                <div className="pt-1 border-t border-gray-300">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-600">{t.mainSalary}</p>
                    <p className="text-sm font-semibold text-gray-900">Rs. {report.summary.mainSalary.toFixed(2)}</p>
                  </div>
                </div>
                {/* Bonuses */}
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-600">{t.monthlyBonus}</p>
                  <p className="text-sm font-semibold text-blue-600">+ Rs. {(report.summary.monthlyBonus || 0).toFixed(2)}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-600">{t.lateBonus}</p>
                  <p className="text-sm font-semibold text-blue-600">+ Rs. {(report.summary.lateBonus || report.summary.lateHourSalary || 0).toFixed(2)}</p>
                </div>
                {/* Gross Salary */}
                <div className="pt-1 border-t border-blue-300">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-semibold text-blue-700">{t.grossSalary}</p>
                    <p className="text-sm font-bold text-blue-700">Rs. {(report.summary.grossSalary || (report.summary.mainSalary + report.summary.monthlyBonus + (report.summary.lateBonus || report.summary.lateHourSalary || 0))).toFixed(2)}</p>
                  </div>
                </div>
                {/* Deductions */}
                <div className="pt-2 border-t border-red-300">
                  <p className="text-xs font-semibold text-red-700 mb-1">Deductions:</p>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-600">{t.epfAmount} ({report.worker.epf_percentage || 8}%)</p>
                    <p className="text-sm font-semibold text-red-600">- Rs. {(report.summary.epfAmount || 0).toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-600">{t.etfAmount} ({report.worker.etf_percentage || 3}%)</p>
                    <p className="text-sm font-semibold text-red-600">- Rs. {(report.summary.etfAmount || 0).toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-600">{t.totalAdvance}</p>
                    <p className="text-sm font-semibold text-red-600">- Rs. {(report.summary.totalAdvance || 0).toFixed(2)}</p>
                  </div>
                  <div className="pt-1 border-t border-red-300 mt-1">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-semibold text-red-700">{t.totalDeductions}</p>
                      <p className="text-sm font-bold text-red-700">Rs. {(report.summary.totalDeductions || ((report.summary.totalAdvance || 0) + (report.summary.epfAmount || 0) + (report.summary.etfAmount || 0))).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                {/* Net Pay */}
                <div className="pt-2 border-t-2 border-green-400">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-gray-900">{t.netPay}</p>
                    <p className="text-lg font-extrabold text-green-700">Rs. {report.summary.netPay.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Details - Compact Table */}
          <div className="mb-6">
            <h3 className="text-base font-bold text-gray-900 mb-3">{t.attendanceDetails}</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-800 text-white print:bg-gray-800">
                    <th className="border border-gray-400 px-3 py-2 text-left text-sm font-semibold">{t.date}</th>
                    <th className="border border-gray-400 px-3 py-2 text-center text-sm font-semibold">{t.present}</th>
                    <th className="border border-gray-400 px-3 py-2 text-right text-sm font-semibold">{t.lateHours}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.attendance.length > 0 ? (
                    report.attendance.map((record: any, index: number) => (
                      <tr key={record.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          {new Date(record.date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                          {record.present ? (
                            <span className="text-green-600 font-semibold">{t.present}</span>
                          ) : (
                            <span className="text-red-600 font-semibold">{t.absent}</span>
                          )}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-right font-semibold">
                          {parseFloat(record.lateHours || record.late_hours || 0).toFixed(2)} hrs
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="border border-gray-300 px-4 py-4 text-center text-sm text-gray-500">
                        {t.noAttendance}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Advance Payments */}
          {report.advances && report.advances.length > 0 && (
            <div className="mb-6">
              <h3 className="text-base font-bold text-gray-900 mb-3">{t.advances}</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-800 text-white print:bg-gray-800">
                      <th className="border border-gray-400 px-3 py-2 text-left text-sm font-semibold">{t.date}</th>
                      <th className="border border-gray-400 px-3 py-2 text-right text-sm font-semibold">Amount (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.advances.map((advance: any, index: number) => (
                      <tr key={advance.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          {new Date(advance.paymentDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-right font-semibold">
                          Rs. {advance.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}


          {/* Footer - Compact */}
          <div className="mt-8 pt-4 border-t-2 border-gray-300">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-gray-600 mb-1">
                  {lang === 'SI' ? `${t.preparedBy} / Prepared By` : `${t.preparedBy}:`}
                </p>
                <div className="border-b-2 border-gray-400 pt-6 pb-1">
                  <p className="text-xs text-gray-700">{t.ownerSignature}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">
                  {lang === 'SI' ? `${t.receivedBy} / Received By` : `${t.receivedBy}:`}
                </p>
                <div className="border-b-2 border-gray-400 pt-6 pb-1">
                  <p className="text-xs text-gray-700">{t.workerSignature}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 text-center text-xs text-gray-500">
              <p>
                {t.generatedOn}: {currentDate.toLocaleDateString(lang === 'SI' ? 'si-LK' : 'en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

