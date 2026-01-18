// Header Component
import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getPageInfo } from '../../utils/pageInfo';

export const Header = () => {
  const location = useLocation();
  const pageInfo = getPageInfo(location.pathname);

  const [dateTime, setDateTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-gradient-to-r from-primary-900 to-primary-800 shadow-sm border-b border-primary-700 min-h-16 flex flex-col md:flex-row items-center justify-center px-4 md:px-6 py-3 md:py-0 relative">
      
      {/* Mobile: Center Title (Full Width) */}
      <div className="text-center md:hidden w-full mb-2">
        <h1 className="text-lg font-bold text-white">LAKSHAN-products</h1>
        <p className="text-xs text-primary-200">ERP System by VOXOsolution</p>
      </div>

      {/* Desktop: Center Title */}
      <div className="hidden md:block text-center absolute left-1/2 transform -translate-x-1/2">
        <h1 className="text-xl font-bold text-white">LAKSHAN-products</h1>
        <p className="text-xs text-primary-200">ERP System by VOXOsolution</p>
      </div>

      {/* Left Page Info */}
      <div className="absolute left-4 md:left-6 top-3 md:top-auto">
        <h2 className="text-sm md:text-lg font-bold text-white">{pageInfo.title}</h2>
        <p className="hidden md:block text-xs text-primary-200">{pageInfo.description}</p>
      </div>

      {/* Right Date & Time */}
      <div className="absolute right-4 md:right-6 top-3 md:top-auto text-right">
        <p className="text-xs md:text-sm font-semibold text-white">
          {dateTime.toLocaleDateString('en-GB', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </p>
        <p className="text-xs text-primary-200">
          {dateTime.toLocaleTimeString()}
        </p>
      </div>

    </header>
  );
};
