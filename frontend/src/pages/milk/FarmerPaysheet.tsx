import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { farmerAPI } from '../../services/farmerAPI';
import { ArrowLeft, Printer } from 'lucide-react';
import logoImage from '../../assets/Logo.png';

type Lang = 'EN' | 'SI';

const LABELS = {
  EN: {
    title: 'Monthly Milk Collection Paysheet',
    farmerInfo: 'Dairy Collector Information',
    milkDetails: 'Milk Collection Details',
    paymentSummary: 'Payment Summary',
    totalMilk: 'Total Milk Collected',
    rate: 'Rate per Liter',
    totalPayment: 'Total Payment Amount',
    preparedBy: 'Prepared By',
    receivedBy: 'Received By',
    back: 'Back',
    print: 'Print Paysheet',
    language: 'සිංහල',
    name: 'Name',
    phone: 'Phone',
    address: 'Address',
    date: 'Date',
    time: 'Time',
    milkQuantity: 'Quantity (Liters)',
    noCollections: 'No milk collections for this month',
    signature: 'Signature',
    farmerSignature: 'Collector Signature',
    generatedOn: 'Generated on',
    period: 'Period',
    freeProducts: 'Free Products',
    productName: 'Product Name',
    freeProductQuantity: 'Quantity',
    unit: 'Unit',
    noFreeProducts: 'No free products for this month',
  },
  SI: {
    title: 'මාසික කිරි එකතු කිරීමේ ගෙවීම් පත්‍රය',
    farmerInfo: 'කිරි එකතු කරන්නාගේ තොරතුරු',
    milkDetails: 'කිරි එකතු කිරීමේ විස්තර',
    paymentSummary: 'ගෙවීම් සාරාංශය',
    totalMilk: 'එකතු කළ කිරි ප්‍රමාණය',
    rate: 'ලීටරයක මිල',
    totalPayment: 'මුළු ගෙවීම් මුදල',
    preparedBy: 'සකස් කළ',
    receivedBy: 'ලැබූ එකතු කරන්නා',
    back: 'ආපසු',
    print: 'මුද්‍රණය කරන්න',
    language: 'English',
    name: 'නම',
    phone: 'දුරකථන',
    address: 'ලිපිනය',
    date: 'දිනය',
    time: 'වේලාව',
    milkQuantity: 'ප්‍රමාණය (ලීටර)',
    noCollections: 'මෙම මාසයට කිරි එකතු කිරීම් නොමැත',
    signature: 'අත්සන',
    farmerSignature: 'එකතු කරන්නාගේ අත්සන',
    generatedOn: 'නිපදවන ලද්දේ',
    period: 'කාල සීමාව',
    freeProducts: 'නොමිලේ නිෂ්පාදන',
    productName: 'නිෂ්පාදන නම',
    freeProductQuantity: 'ප්‍රමාණය',
    unit: 'ඒකකය',
    noFreeProducts: 'මෙම මාසයට නොමිලේ නිෂ්පාදන නොමැත',
  }
};

export const FarmerPaysheet = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [currentDate] = useState(new Date());
  const [lang, setLang] = useState<Lang>('EN');
  const t = LABELS[lang];

  useEffect(() => {
    if (id) {
      loadReport();
    }
  }, [id]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await farmerAPI.getMonthlyReport(id!);
      setReport(data);
    } catch (error) {
      console.error('Failed to load report:', error);
      alert('Failed to load farmer report');
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
          await farmerAPI.issueFreeProducts(id!, report.period.year, report.period.month);
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
          onClick={() => navigate('/milk')}
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

          {/* Farmer Information & Period - Side by Side */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="bg-white border-l-4 border-primary-600 p-4 rounded shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">{t.farmerInfo}</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">{t.name}</p>
                  <p className="text-base font-semibold text-gray-900">{report.farmer.name}</p>
                </div>
              <div>
                  <p className="text-xs text-gray-500 mb-0.5">{t.phone}</p>
                  <p className="text-base font-medium text-gray-900">{report.farmer.phone || 'N/A'}</p>
              </div>
              <div>
                  <p className="text-xs text-gray-500 mb-0.5">{t.address}</p>
                  <p className="text-sm font-medium text-gray-900">{report.farmer.address || 'N/A'}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 border-l-4 border-gray-400 p-4 rounded shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">{t.paymentSummary}</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-600">{t.totalMilk}</p>
                  <p className="text-base font-bold text-primary-600">{report.summary.totalLiters.toFixed(2)} L</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-600">{t.rate}</p>
                  <p className="text-sm font-semibold text-gray-900">Rs. {report.summary.milkPrice.toFixed(2)}</p>
                </div>
                <div className="pt-2 border-t border-gray-300">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-semibold text-gray-900">{t.totalPayment}</p>
                    <p className="text-base font-bold text-green-700">Rs. {report.summary.totalPayment.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Milk Collection Details - Compact Table */}
          <div className="mb-6">
            <h3 className="text-base font-bold text-gray-900 mb-3">{t.milkDetails}</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-800 text-white print:bg-gray-800">
                    <th className="border border-gray-400 px-3 py-2 text-left text-sm font-semibold">{t.date}</th>
                    <th className="border border-gray-400 px-3 py-2 text-left text-sm font-semibold">{t.time}</th>
                    <th className="border border-gray-400 px-3 py-2 text-right text-sm font-semibold">{t.milkQuantity}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.collections.length > 0 ? (
                    report.collections.map((collection: any, index: number) => (
                      <tr key={collection.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          {new Date(collection.date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">{collection.time || '-'}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-right font-semibold">
                          {parseFloat(collection.quantity_liters).toFixed(2)} L
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="border border-gray-300 px-4 py-4 text-center text-sm text-gray-500">
                        {t.noCollections}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Free Products */}
          {report.freeProducts && report.freeProducts.length > 0 && (
            <div className="mb-6">
              <h3 className="text-base font-bold text-gray-900 mb-3">{t.freeProducts}</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-800 text-white print:bg-gray-800">
                      <th className="border border-gray-400 px-3 py-2 text-left text-sm font-semibold">{t.productName}</th>
                      <th className="border border-gray-400 px-3 py-2 text-right text-sm font-semibold">{t.milkQuantity}</th>
                      <th className="border border-gray-400 px-3 py-2 text-left text-sm font-semibold">{t.unit}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.freeProducts.map((product: any, index: number) => (
                      <tr key={product.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 px-3 py-2 text-sm">{product.productName || 'N/A'}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-right font-semibold">
                          {product.quantity.toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">{product.unit}</td>
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
                  <p className="text-xs text-gray-700">{t.signature}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">
                  {lang === 'SI' ? `${t.receivedBy} / Received By` : `${t.receivedBy}:`}
                </p>
                <div className="border-b-2 border-gray-400 pt-6 pb-1">
                  <p className="text-xs text-gray-700">{t.farmerSignature}</p>
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