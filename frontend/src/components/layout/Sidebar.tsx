// Sidebar Navigation Component - Mobile Responsive
import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HomeIcon,
  UsersIcon,
  BeakerIcon,
  CubeIcon,
  Cog6ToothIcon,
  ShoppingCartIcon,
  ShoppingBagIcon,
  ArrowPathIcon,
  CreditCardIcon,
  DocumentTextIcon,
  ChartBarIcon,
  BanknotesIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import logoImage from '../../assets/Logo.png';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  hiddenForRoles?: string[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', path: '/', icon: HomeIcon },
  { name: 'Milk Collection', path: '/milk', icon: BeakerIcon, roles: ['ADMIN'] },
  { name: 'Salary', path: '/salary', icon: UsersIcon, roles: ['ADMIN'] },
  { name: 'Inventory', path: '/inventory', icon: CubeIcon, hiddenForRoles: ['SALESPERSON'] },
  { name: 'Production', path: '/production', icon: Cog6ToothIcon, roles: ['ADMIN'] },
  { name: 'Sales', path: '/sales', icon: ShoppingCartIcon },
  { name: 'Shops', path: '/buyers', icon: ShoppingBagIcon, roles: ['ADMIN'] },
  { name: 'Returns', path: '/returns', icon: ArrowPathIcon, hiddenForRoles: ['SALESPERSON'] },
  { name: 'Payments', path: '/payments', icon: CreditCardIcon, hiddenForRoles: ['SALESPERSON'] },
  { name: 'Cheques', path: '/cheques', icon: DocumentTextIcon, hiddenForRoles: ['SALESPERSON'] },
  { name: 'Expenses', path: '/expenses', icon: BanknotesIcon },
  { name: 'Reports', path: '/reports', icon: ChartBarIcon, roles: ['ADMIN', 'ACCOUNTANT'] },
];

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const filteredNavigation = navigation.filter((item) => {
    const userRole = user?.role || '';
    
    // Salespersons can only access Dashboard, Sales, and Expenses
    if (userRole === 'SALESPERSON') {
      return item.path === '/' || item.path === '/sales' || item.path === '/expenses';
    }
    
    // Hide items for specific roles
    if (item.hiddenForRoles && item.hiddenForRoles.includes(userRole)) {
      return false;
    }
    
    // Check role-based access
    if (!item.roles) {
      // If no roles specified, show to all users (unless hidden)
      return true;
    }
    return item.roles.includes(userRole);
  });

  const sidebarContent = (
    <>
      {/* Logo/Brand */}
      <div className="flex items-center justify-between h-16 px-4 bg-primary-900 border-b border-primary-700">
        <img src={logoImage} alt="Logo" className="h-12 w-auto object-contain" />
        {isMobile && (
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 text-primary-100 hover:bg-primary-700 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {filteredNavigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-primary-900 shadow-lg'
                    : 'text-primary-100 hover:bg-primary-700 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-primary-700">
        <button
          onClick={() => {
            logout();
            window.location.href = '/login';
          }}
          className="flex items-center space-x-3 w-full px-4 py-3 rounded-lg text-primary-100 hover:bg-red-600 hover:text-white transition-all duration-200"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="fixed top-[15px] left-4 z-[60] p-2.5 bg-primary-600 text-white rounded-xl shadow-xl hover:bg-primary-700 active:bg-primary-800 transition-all duration-200 touch-manipulation"
          aria-label="Open menu"
        >
          <Bars3Icon className="w-6 h-6" />
        </button>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className="fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-primary-900 to-primary-800 text-white flex flex-col shadow-2xl z-30">
          {sidebarContent}
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {isMobile && isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Sidebar */}
          <div className="fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-primary-900 to-primary-800 text-white flex flex-col shadow-2xl z-50 transform transition-transform">
            {sidebarContent}
          </div>
        </>
      )}
    </>
  );
};
