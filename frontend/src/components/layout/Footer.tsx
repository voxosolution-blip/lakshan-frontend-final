// Footer Component
import {
    EnvelopeIcon,
    ChatBubbleLeftRightIcon,
    Cog6ToothIcon,
    XMarkIcon,
    UserGroupIcon,
    CurrencyDollarIcon,
    GiftIcon,
    CloudArrowDownIcon,
    CloudArrowUpIcon,
    ArrowPathIcon,
    ShieldCheckIcon,
    ExclamationTriangleIcon,
  } from '@heroicons/react/24/outline';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../services/adminAPI';
  
  export const Footer = () => {
    const navigate = useNavigate();
    const footerRef = useRef<HTMLElement | null>(null);
    const [footerHeight, setFooterHeight] = useState(0);
    const [showSettings, setShowSettings] = useState(false);
  const [settingsMounted, setSettingsMounted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
    const restoreInputRef = useRef<HTMLInputElement | null>(null);
    const [adminBusy, setAdminBusy] = useState<null | 'backup' | 'restore' | 'reset'>(null);
    const whatsappNumber = '94710901871';
    const whatsappUrl = `https://wa.me/${whatsappNumber}`;
    const email = 'voxosolution@gmail.com';
    const user = (() => {
      try {
        return JSON.parse(localStorage.getItem('user') || 'null');
      } catch {
        return null;
      }
    })();
    const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';

    // Measure footer height so the popup stays ABOVE the footer area (footer remains visible)
    useLayoutEffect(() => {
      const measure = () => {
        const h = footerRef.current?.getBoundingClientRect().height || 0;
        setFooterHeight(h);
      };
      measure();
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }, []);

  // Bottom-sheet animation: mount -> open; close -> animate out -> unmount
  useEffect(() => {
    if (showSettings) {
      setSettingsMounted(true);
      // next tick so transition animates
      const t = setTimeout(() => setSettingsOpen(true), 20);
      return () => clearTimeout(t);
    }
    // animate out
    setSettingsOpen(false);
    const t = setTimeout(() => setSettingsMounted(false), 350);
    return () => clearTimeout(t);
  }, [showSettings]);
  
    return (
    <footer ref={footerRef as any} className="bg-primary-900 border-t border-primary-700">
        <div className="max-w-7xl mx-auto px-3 py-1">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
  
            {/* Left - Copyright */}
            <div className="text-primary-300 text-center md:text-left">
              © {new Date().getFullYear()}{' '}
              <span className="font-semibold text-white">
                VOXOsolution
              </span>{' '}
              All rights reserved
            </div>
  
            {/* Center - Contact Icons Only */}
            <div className="flex items-center gap-6">
  
              {/* Email Icon */}
              <a
                href={`mailto:${email}`}
                className="p-2 rounded-full text-primary-300 hover:text-white hover:bg-primary-800 transition-all"
                title="Send Email"
              >
                <EnvelopeIcon className="w-5 h-5" />
              </a>

              {/* Settings Icon - Admin Only */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowSettings(true)}
                  className="p-2 rounded-full text-primary-300 hover:text-white hover:bg-primary-800 transition-all"
                  title="Settings"
                >
                  <Cog6ToothIcon className="w-5 h-5" />
                </button>
              )}
  
              {/* WhatsApp Icon */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full text-primary-300 hover:text-white hover:bg-primary-800 transition-all"
                title="Chat on WhatsApp"
              >
                <ChatBubbleLeftRightIcon className="w-5 h-5" />
              </a>
  
            </div>
  
            {/* Right - Branding */}
            <div className="text-primary-400 text-center md:text-right">
              Powered by{' '}
              <span className="font-medium text-primary-200">
                VOXOsolution
              </span>
            </div>
  
          </div>
        </div>

        {/* Settings Quick Menu - Redesigned with Rise Up Animation */}
        {settingsMounted && (
          <div
            className={`fixed inset-0 z-40 flex items-end sm:items-center justify-center ${settingsOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
          >
            {/* Backdrop */}
            <div
              className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
                settingsOpen ? 'opacity-100' : 'opacity-0'
              }`}
              onClick={() => setShowSettings(false)}
            />

            {/* Centered Modal - System UI Style with Rise Up Animation */}
            <div
              className={`relative w-full sm:w-[95%] max-w-[480px] mx-auto
                bg-white shadow-2xl rounded-t-3xl sm:rounded-2xl overflow-hidden border-t-4 border-primary-500
                transform transition-all duration-300 ease-out
                ${settingsOpen 
                  ? 'translate-y-0 opacity-100 scale-100' 
                  : 'translate-y-full sm:translate-y-8 opacity-0 sm:scale-95'
                }`}
              role="dialog"
              aria-modal="true"
              aria-label="Settings"
              style={{
                maxHeight: settingsOpen ? '90vh' : '0',
                transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease-out, max-height 0.3s ease-out'
              }}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Cog6ToothIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-lg">Settings</h2>
                    <p className="text-primary-100 text-xs">Configure system preferences</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Settings Content */}
              <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                
                {/* Application Settings Section */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mb-3 flex items-center gap-2">
                    <span className="w-8 h-px bg-gray-300"></span>
                    Application Settings
                    <span className="flex-1 h-px bg-gray-300"></span>
                  </h3>
                  
                  <div className="space-y-2">
                    {/* Worker Settings */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowSettings(false);
                        navigate('/salary?settings=1');
                      }}
                      className="w-full flex items-center gap-4 px-4 py-3 rounded-xl bg-primary-50 hover:bg-primary-100 border border-primary-200 transition-all group"
                    >
                      <div className="p-2.5 bg-primary-500 rounded-lg group-hover:bg-primary-600 transition-colors">
                        <UserGroupIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-gray-900">Worker Settings</p>
                        <p className="text-xs text-gray-500">Manage worker rates & configurations</p>
                      </div>
                      <div className="text-primary-400 group-hover:text-primary-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>

                    {/* Milk Price Settings */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowSettings(false);
                        navigate('/milk/settings');
                      }}
                      className="w-full flex items-center gap-4 px-4 py-3 rounded-xl bg-green-50 hover:bg-green-100 border border-green-200 transition-all group"
                    >
                      <div className="p-2.5 bg-green-500 rounded-lg group-hover:bg-green-600 transition-colors">
                        <CurrencyDollarIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-gray-900">Milk Price Settings</p>
                        <p className="text-xs text-gray-500">Set milk collection price per liter</p>
                      </div>
                      <div className="text-green-400 group-hover:text-green-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>

                    {/* Free Products Settings */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowSettings(false);
                        navigate('/milk/free-products-settings');
                      }}
                      className="w-full flex items-center gap-4 px-4 py-3 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-all group"
                    >
                      <div className="p-2.5 bg-purple-500 rounded-lg group-hover:bg-purple-600 transition-colors">
                        <GiftIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-gray-900">Dairy Collector Free Products</p>
                        <p className="text-xs text-gray-500">Configure free product allocations</p>
                      </div>
                      <div className="text-purple-400 group-hover:text-purple-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  </div>
                </div>

                {/* System Administration Section */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mb-3 flex items-center gap-2">
                    <span className="w-8 h-px bg-gray-300"></span>
                    System Administration
                    <span className="flex-1 h-px bg-gray-300"></span>
                  </h3>

                  {/* Admin Badge */}
                  <div className={`mb-3 px-4 py-2 rounded-lg flex items-center gap-2 ${isAdmin ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                    <ShieldCheckIcon className={`w-5 h-5 ${isAdmin ? 'text-green-600' : 'text-yellow-600'}`} />
                    <span className={`text-sm font-medium ${isAdmin ? 'text-green-700' : 'text-yellow-700'}`}>
                      {isAdmin ? 'Admin Access Granted' : 'Admin login required for system tools'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {/* Backup Button */}
                    <button
                      type="button"
                      disabled={!isAdmin || adminBusy !== null}
                      onClick={async () => {
                        try {
                          setAdminBusy('backup');
                          const blob = await adminAPI.downloadBackup();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `yogurt_erp_backup_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.sql`;
                          a.click();
                          window.URL.revokeObjectURL(url);
                        } catch (e: any) {
                          alert(e?.response?.data?.message || 'Backup failed');
                        } finally {
                          setAdminBusy(null);
                        }
                      }}
                      className={`flex flex-col items-center gap-2 px-3 py-4 rounded-xl border-2 transition-all ${
                        !isAdmin || adminBusy !== null 
                          ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' 
                          : 'bg-primary-50 hover:bg-primary-100 border-primary-200 hover:border-primary-400 text-primary-700'
                      }`}
                      title="Download full system backup"
                    >
                      <div className={`p-2 rounded-lg ${!isAdmin || adminBusy !== null ? 'bg-gray-200' : 'bg-primary-500'}`}>
                        <CloudArrowDownIcon className={`w-5 h-5 ${!isAdmin || adminBusy !== null ? 'text-gray-400' : 'text-white'}`} />
                      </div>
                      <span className="text-sm font-medium">
                        {adminBusy === 'backup' ? 'Backing up...' : 'Backup'}
                      </span>
                    </button>

                    {/* Restore Button */}
                    <button
                      type="button"
                      disabled={!isAdmin || adminBusy !== null}
                      onClick={() => restoreInputRef.current?.click()}
                      className={`flex flex-col items-center gap-2 px-3 py-4 rounded-xl border-2 transition-all ${
                        !isAdmin || adminBusy !== null 
                          ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' 
                          : 'bg-blue-50 hover:bg-blue-100 border-blue-200 hover:border-blue-400 text-blue-700'
                      }`}
                      title="Restore from a backup file"
                    >
                      <div className={`p-2 rounded-lg ${!isAdmin || adminBusy !== null ? 'bg-gray-200' : 'bg-blue-500'}`}>
                        <CloudArrowUpIcon className={`w-5 h-5 ${!isAdmin || adminBusy !== null ? 'text-gray-400' : 'text-white'}`} />
                      </div>
                      <span className="text-sm font-medium">
                        {adminBusy === 'restore' ? 'Restoring...' : 'Restore'}
                      </span>
                    </button>

                    {/* Reset Button */}
                    <button
                      type="button"
                      disabled={!isAdmin || adminBusy !== null}
                      onClick={async () => {
                        const ok = window.prompt('Type RESET to confirm full system reset (this will delete ALL data).');
                        if (String(ok || '').toUpperCase() !== 'RESET') return;
                        try {
                          setAdminBusy('reset');
                          await adminAPI.resetSystem();
                          alert('System reset completed. You will be logged out now.');
                          localStorage.removeItem('token');
                          localStorage.removeItem('user');
                          window.location.href = '/login';
                        } catch (e: any) {
                          alert(e?.response?.data?.message || 'Reset failed');
                        } finally {
                          setAdminBusy(null);
                        }
                      }}
                      className={`flex flex-col items-center gap-2 px-3 py-4 rounded-xl border-2 transition-all ${
                        !isAdmin || adminBusy !== null
                          ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'bg-red-50 hover:bg-red-100 border-red-200 hover:border-red-400 text-red-700'
                      }`}
                      title="Danger: wipe and recreate the entire system"
                    >
                      <div className={`p-2 rounded-lg ${!isAdmin || adminBusy !== null ? 'bg-gray-200' : 'bg-red-500'}`}>
                        <ArrowPathIcon className={`w-5 h-5 ${!isAdmin || adminBusy !== null ? 'text-gray-400' : 'text-white'}`} />
                      </div>
                      <span className="text-sm font-medium">
                        {adminBusy === 'reset' ? 'Resetting...' : 'Reset'}
                      </span>
                    </button>
                  </div>

                  {/* Warning Note */}
                  <div className="mt-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-700">
                      <span className="font-semibold">Caution:</span> System reset will permanently delete all data. Always create a backup before resetting.
                    </p>
                  </div>

                  <input
                    ref={restoreInputRef}
                    type="file"
                    accept=".sql,.dump"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      const confirmRestore = window.confirm(
                        `Restore will REPLACE the entire database with this file:\n\n${file.name}\n\nContinue?`
                      );
                      if (!confirmRestore) return;
                      try {
                        setAdminBusy('restore');
                        await adminAPI.restoreFromBackup(file);
                        alert('Restore completed. Please refresh the app and login again.');
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        window.location.href = '/login';
                      } catch (err: any) {
                        alert(err?.response?.data?.message || 'Restore failed');
                      } finally {
                        setAdminBusy(null);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                <p className="text-xs text-center text-gray-500">
                  Lakshan Dairy Products ERP • Powered by <span className="font-semibold text-primary-600">VOXOsolution</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </footer>
    );
  };
  