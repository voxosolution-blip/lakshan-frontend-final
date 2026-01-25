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
  const restoreInputRef = useRef<HTMLInputElement | null>(null);

  const [footerHeight, setFooterHeight] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsMounted, setSettingsMounted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  useLayoutEffect(() => {
    const measure = () => {
      const h = footerRef.current?.getBoundingClientRect().height || 0;
      setFooterHeight(h);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    if (showSettings) {
      setSettingsMounted(true);
      setTimeout(() => setSettingsOpen(true), 20);
    } else {
      setSettingsOpen(false);
      setTimeout(() => setSettingsMounted(false), 300);
    }
  }, [showSettings]);

  return (
    <footer ref={footerRef as any} className="bg-primary-900 border-t border-primary-700">
      <div className="max-w-7xl mx-auto px-3 py-2">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">

          {/* Left */}
          <div className="text-primary-300 text-center md:text-left">
            © {new Date().getFullYear()} <span className="font-semibold text-white">VOXOsolution</span>
          </div>

          {/* Center Icons */}
          <div className="flex items-center gap-5">
            <a
              href={`mailto:${email}`}
              className="p-2 rounded-full text-primary-300 hover:text-white hover:bg-primary-800 transition"
            >
              <EnvelopeIcon className="w-5 h-5" />
            </a>

            {isAdmin && (
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-full text-primary-300 hover:text-white hover:bg-primary-800 transition"
              >
                <Cog6ToothIcon className="w-5 h-5" />
              </button>
            )}

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full text-primary-300 hover:text-white hover:bg-primary-800 transition"
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
            </a>
          </div>

          {/* Right */}
          <div className="text-primary-400 text-center md:text-right">
            Powered by <span className="font-medium text-primary-200">VOXOsolution</span>
          </div>
        </div>
      </div>

      {/* SETTINGS MODAL */}
      {settingsMounted && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity ${
              settingsOpen ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={() => setShowSettings(false)}
          />

          <div
            className={`relative w-full sm:max-w-[480px] bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl
            transform transition-all duration-300 ${
              settingsOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-primary-600 to-primary-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Cog6ToothIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg">Settings</h2>
                  <p className="text-primary-100 text-xs">System configuration</p>
                </div>
              </div>
              <button onClick={() => setShowSettings(false)} className="text-white">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* CONTENT */}
            <div className="px-5 py-4 space-y-6 max-h-[65vh] overflow-y-auto">

              {/* Application Settings */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                  Application Settings
                </h3>

                <div className="space-y-3">
                  <SettingItem
                    icon={<UserGroupIcon className="w-6 h-6 text-primary-600" />}
                    title="Worker Settings"
                    desc="Salary & worker configuration"
                    onClick={() => {
                      setShowSettings(false);
                      navigate('/salary?settings=1');
                    }}
                  />

                  <SettingItem
                    icon={<CurrencyDollarIcon className="w-6 h-6 text-green-600" />}
                    title="Milk Price"
                    desc="Milk price per litre"
                    onClick={() => {
                      setShowSettings(false);
                      navigate('/milk/settings');
                    }}
                  />

                  <SettingItem
                    icon={<GiftIcon className="w-6 h-6 text-purple-600" />}
                    title="Free Products"
                    desc="Collector incentives"
                    onClick={() => {
                      setShowSettings(false);
                      navigate('/milk/free-products-settings');
                    }}
                  />
                </div>
              </section>

              {/* Admin Section */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                  System Administration
                </h3>

                <div className={`p-3 rounded-xl border flex items-center gap-2 ${
                  isAdmin ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <ShieldCheckIcon className={`w-5 h-5 ${
                    isAdmin ? 'text-green-600' : 'text-yellow-600'
                  }`} />
                  <span className="text-sm font-medium">
                    {isAdmin ? 'Admin Access Enabled' : 'Admin access required'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <AdminAction
                    icon={<CloudArrowDownIcon className="w-6 h-6 text-primary-600" />}
                    label="Backup"
                    disabled={!isAdmin || adminBusy !== null}
                    onClick={async () => {
                      try {
                        setAdminBusy('backup');
                        const blob = await adminAPI.downloadBackup();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `backup_${Date.now()}.sql`;
                        a.click();
                        URL.revokeObjectURL(url);
                      } finally {
                        setAdminBusy(null);
                      }
                    }}
                  />

                  <AdminAction
                    icon={<CloudArrowUpIcon className="w-6 h-6 text-blue-600" />}
                    label="Restore"
                    disabled={!isAdmin || adminBusy !== null}
                    onClick={() => restoreInputRef.current?.click()}
                  />
                </div>

                {/* Danger Zone */}
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <div className="flex gap-2 text-red-700">
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    <div>
                      <p className="font-semibold text-sm">Danger Zone</p>
                      <p className="text-xs">This will delete all data permanently</p>
                    </div>
                  </div>

                  <button
                    disabled={!isAdmin || adminBusy !== null}
                    onClick={async () => {
                      const ok = prompt('Type RESET to confirm');
                      if (ok !== 'RESET') return;
                      try {
                        setAdminBusy('reset');
                        await adminAPI.resetSystem();
                        window.location.href = '/login';
                      } finally {
                        setAdminBusy(null);
                      }
                    }}
                    className="mt-4 w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition disabled:opacity-50"
                  >
                    Reset System
                  </button>
                </div>
              </section>
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
                if (!confirm(`Restore database with ${file.name}?`)) return;
                try {
                  setAdminBusy('restore');
                  await adminAPI.restoreFromBackup(file);
                  window.location.href = '/login';
                } finally {
                  setAdminBusy(null);
                }
              }}
            />
          </div>
        </div>
      )}
    </footer>
  );
};

/* ===== Reusable Components ===== */

const SettingItem = ({ icon, title, desc, onClick }: any) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-4 p-4 bg-white border rounded-2xl hover:shadow-md transition"
  >
    <div className="p-3 bg-gray-100 rounded-xl">{icon}</div>
    <div className="text-left flex-1">
      <p className="font-semibold text-gray-900">{title}</p>
      <p className="text-xs text-gray-500">{desc}</p>
    </div>
  </button>
);

const AdminAction = ({ icon, label, onClick, disabled }: any) => (
  <button
    disabled={disabled}
    onClick={onClick}
    className="p-4 border rounded-2xl bg-white hover:shadow-md transition disabled:opacity-50"
  >
    <div className="flex justify-center">{icon}</div>
    <p className="mt-2 text-sm font-medium text-center">{label}</p>
  </button>
);
