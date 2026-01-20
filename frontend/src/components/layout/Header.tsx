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
    <header className="bg-gradient-to-r from-primary-900 to-primary-800 shadow-lg border-b border-primary-700 min-h-[70px] flex flex-col md:flex-row items-center justify-center px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-0 relative z-20">
      
      {/* Mobile: Center Title (Full Width) - with left padding for sidebar button */}
      <div className="text-center md:hidden w-full mb-1.5 pl-12">
        <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">LAKSHAN-products</h1>
        <p className="text-xs text-primary-200">ERP System by VOXOsolution</p>
      </div>

      {/* Desktop: Center Title */}
      <div className="hidden md:block text-center absolute left-1/2 transform -translate-x-1/2">
        <h1 className="text-xl font-bold text-white tracking-wide">LAKSHAN-products</h1>
        <p className="text-xs text-primary-200">ERP System by VOXOsolution</p>
      </div>

      {/* Left Page Info - Mobile responsive with padding for sidebar */}
      <div className="absolute left-12 sm:left-16 md:left-6 top-2 sm:top-2.5 md:top-auto">
        <h2 className="text-xs sm:text-sm md:text-lg font-bold text-white tracking-tight">{pageInfo.title}</h2>
        <p className="hidden md:block text-xs text-primary-200 mt-0.5">{pageInfo.description}</p>
      </div>

      {/* Right Date & Time - Mobile responsive */}
      <div className="absolute right-3 sm:right-4 md:right-6 top-2 sm:top-2.5 md:top-auto text-right">
        <p className="text-xs sm:text-sm md:text-sm font-semibold text-white">
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
