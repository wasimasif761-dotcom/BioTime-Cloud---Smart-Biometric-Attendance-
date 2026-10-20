import React, { useState, useEffect } from 'react';
import { 
  ScanLine, 
  LayoutDashboard, 
  Monitor, 
  Globe, 
  ShieldCheck, 
  Building2, 
  Sparkles,
  Fingerprint,
  Info,
  Code2,
  UserPlus
} from 'lucide-react';
import { Employee, AttendanceRecord, Branch, SystemSettings } from './types';
import { storage } from './utils/storage';
import { translations, Language } from './utils/i18n';
import { KioskTerminal } from './components/KioskTerminal';
import { AdminDashboard } from './components/AdminDashboard';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { loadFaceModels } from './utils/faceRecognition';
import { DEFAULT_BRANCHES, DEFAULT_SETTINGS } from './utils/db';

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>(() => storage.getCachedEmployees());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => storage.getCachedAttendance());
  const [branches, setBranches] = useState<Branch[]>(DEFAULT_BRANCHES);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [currentBranchId, setCurrentBranchId] = useState<string>(() => storage.getCurrentBranchId());
  const [lang, setLang] = useState<Language>(() => storage.getLanguage());
  const [viewMode, setViewMode] = useState<'kiosk' | 'admin'>('kiosk');
  const [adminTab, setAdminTab] = useState<'overview' | 'staff' | 'logs' | 'payroll' | 'settings'>('overview');
  const [autoOpenAddStaff, setAutoOpenAddStaff] = useState<boolean>(false);
  const [isDbLoading, setIsDbLoading] = useState(true);

  const t = translations[lang];

  // Set HTML document dir (RTL for Urdu and Arabic)
  useEffect(() => {
    document.documentElement.dir = (lang === 'ur' || lang === 'ar') ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Load from IndexedDB on mount & pre-warm face recognition models
  useEffect(() => {
    let mounted = true;
    async function initApp() {
      try {
        const [loadedEmps, loadedAtt, loadedBranches, loadedSettings] = await Promise.all([
          storage.loadEmployees(),
          storage.loadAttendance(),
          storage.loadBranches(),
          storage.loadSettings(),
        ]);
        if (mounted) {
          setEmployees(loadedEmps);
          setAttendance(loadedAtt);
          setBranches(loadedBranches);
          setSettings(loadedSettings);
          setIsDbLoading(false);
        }
      } catch (err) {
        console.warn('Error loading from IndexedDB:', err);
        if (mounted) setIsDbLoading(false);
      }

      // Pre-warm face recognition models in background
      loadFaceModels().catch((err) => {
        console.warn('Face models background load warning:', err);
      });
    }

    initApp();
    return () => {
      mounted = false;
    };
  }, []);

  // Handle Punch recorded
  const handlePunchSuccess = async (newOrUpdatedRecord: AttendanceRecord, isNewIn: boolean) => {
    setAttendance((prev) => {
      let updated: AttendanceRecord[];
      if (isNewIn) {
        updated = [newOrUpdatedRecord, ...prev];
      } else {
        updated = prev.map((r) => (r.id === newOrUpdatedRecord.id ? newOrUpdatedRecord : r));
      }
      return updated;
    });

    try {
      await storage.persistAttendance(newOrUpdatedRecord);
    } catch (err) {
      console.error('Failed to persist attendance to IndexedDB:', err);
    }
  };

  // Staff changes
  const handleSaveEmployee = async (emp: Employee) => {
    setEmployees((prev) => {
      const exists = prev.some((e) => e.id === emp.id);
      return exists ? prev.map((e) => (e.id === emp.id ? emp : e)) : [emp, ...prev];
    });

    try {
      await storage.persistEmployee(emp);
    } catch (err) {
      console.error('Failed to save employee to IndexedDB:', err);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    try {
      await storage.removeEmployee(id);
    } catch (err) {
      console.error('Failed to delete employee from IndexedDB:', err);
    }
  };

  // Settings changes
  const handleSaveSettings = async (newSettings: SystemSettings) => {
    setSettings(newSettings);
    try {
      await storage.persistSettings(newSettings);
    } catch (err) {
      console.error('Failed to save settings to IndexedDB:', err);
    }
  };

  const handleSaveBranches = async (newBranches: Branch[]) => {
    setBranches(newBranches);
    try {
      await storage.persistBranches(newBranches);
    } catch (err) {
      console.error('Failed to save branches to IndexedDB:', err);
    }
  };

  const handleClearAttendance = async () => {
    setAttendance([]);
    try {
      await storage.clearAttendance();
    } catch (err) {
      console.error('Failed to clear attendance in IndexedDB:', err);
    }
  };

  const handleOpenAddStaff = () => {
    setAdminTab('staff');
    setAutoOpenAddStaff(true);
    setViewMode('admin');
  };

  const handleBranchChange = (branchId: string) => {
    setCurrentBranchId(branchId);
    storage.setCurrentBranchId(branchId);
  };

  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    storage.setLanguage(newLang);
  };

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* Offline Toast Indicator */}
      <OfflineIndicator lang={lang} />

      {/* Main Top Header Navbar - 100% Responsive on all screen sizes */}
      <header className="no-print sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 space-y-2.5">
          
          {/* Top Row: Brand on left, PWA & Languages on right */}
          <div className="flex items-center justify-between gap-2">
            
            {/* Brand Logo & Title */}
            <div 
              className="flex items-center gap-2.5 cursor-pointer min-w-0" 
              onClick={() => setViewMode('kiosk')}
            >
              <div className="relative flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/25 flex-shrink-0">
                <Fingerprint className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950" />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950"></span>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-extrabold text-sm sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent truncate">
                    {t.appTitle}
                  </h1>
                  <span className="hidden md:inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-cyan-950 text-cyan-400 border border-cyan-800/60 uppercase">
                    PWA
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 truncate max-w-[170px] sm:max-w-xs">
                  {lang === 'ur' ? 'عصام اکنامکس کمپنی لمیٹڈ' : 'Isam Economics Company Ltd'}
                </p>
              </div>
            </div>

            {/* Desktop Mode Switcher + Add Staff Button */}
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800">
                <button
                  onClick={() => setViewMode('kiosk')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'kiosk'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  <span>{t.kioskMode}</span>
                </button>

                <button
                  onClick={() => {
                    setViewMode('admin');
                    setAdminTab('overview');
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'admin'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>{t.adminMode}</span>
                </button>
              </div>

              {/* Direct Add New Staff Button in Top Navbar */}
              <button
                onClick={handleOpenAddStaff}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-md shadow-cyan-500/25 transition-all cursor-pointer active:scale-95"
                title="Add New Employee"
              >
                <UserPlus className="w-4 h-4" />
                <span>{lang === 'ur' ? '+ نیا ملازم شامل کریں' : '+ Add New Staff'}</span>
              </button>
            </div>

            {/* Right Group: PWA Install + Language Switcher */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {/* PWA Install Button */}
              <PWAInstallButton lang={lang} />

              {/* Language Switcher */}
              <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-0.5 sm:p-1 text-[11px] sm:text-xs font-semibold">
                <button
                  onClick={() => handleLanguageChange('ur')}
                  className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg transition cursor-pointer ${
                    lang === 'ur' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="اردو"
                >
                  اردو
                </button>
                <button
                  onClick={() => handleLanguageChange('en')}
                  className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg transition cursor-pointer ${
                    lang === 'en' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="English"
                >
                  EN
                </button>
                <button
                  onClick={() => handleLanguageChange('ar')}
                  className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg transition cursor-pointer ${
                    lang === 'ar' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="العربية"
                >
                  عربي
                </button>
              </div>
            </div>

          </div>

          {/* Mobile Mode Switcher + Add Staff Button */}
          <div className="md:hidden grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-900/95 border border-slate-800">
            <button
              onClick={() => setViewMode('kiosk')}
              className={`flex items-center justify-center gap-1 py-2 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === 'kiosk'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>{t.kioskMode}</span>
            </button>

            <button
              onClick={() => {
                setViewMode('admin');
                setAdminTab('overview');
              }}
              className={`flex items-center justify-center gap-1 py-2 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === 'admin'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>{t.adminMode}</span>
            </button>

            <button
              onClick={handleOpenAddStaff}
              className="flex items-center justify-center gap-1 py-2 px-1 rounded-lg text-[11px] font-black bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 shadow-md shadow-cyan-500/25 transition-all cursor-pointer active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{lang === 'ur' ? '+ نیا ملازم' : '+ Add Staff'}</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        {viewMode === 'kiosk' ? (
          <KioskTerminal
            employees={employees}
            attendance={attendance}
            branches={branches}
            currentBranchId={currentBranchId}
            onBranchChange={handleBranchChange}
            settings={settings}
            lang={lang}
            onPunchSuccess={handlePunchSuccess}
            onOpenAdmin={() => setViewMode('admin')}
            onAddStaff={handleOpenAddStaff}
          />
        ) : (
          <AdminDashboard
            employees={employees}
            attendance={attendance}
            branches={branches}
            settings={settings}
            lang={lang}
            onSaveEmployee={handleSaveEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onSaveSettings={handleSaveSettings}
            onSaveBranches={handleSaveBranches}
            onClearAttendance={handleClearAttendance}
            onBackToKiosk={() => setViewMode('kiosk')}
            initialAdminTab={adminTab}
            autoOpenAddStaff={autoOpenAddStaff}
            onResetAutoOpenStaff={() => setAutoOpenAddStaff(false)}
          />
        )}
      </main>

      {/* Bottom Footer (Cleanly showing Isam Economics Company Ltd & Developed by: Waseem Asif) */}
      <footer className="no-print border-t border-slate-900 bg-slate-950/80 py-6 px-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center space-y-2">
          
          {/* Company Name as requested */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-slate-200 font-bold text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Isam Economics company Ltd</span>
            <span className="text-slate-500">•</span>
            <span className="text-cyan-400 font-normal">
              {lang === 'ur' ? 'عصام اکنامکس کمپنی لمیٹڈ' : 'Jeddah & Riyadh Branches'}
            </span>
          </div>

          {/* Developer Credit as requested */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-medium">
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {lang === 'ur' ? 'ڈویلپڈ بائے:' : 'Developed by:'}{' '}
              <strong className="text-slate-200 font-semibold tracking-wide">Waseem Asif</strong>
            </span>
          </div>

          <div className="text-[11px] text-slate-600 pt-1">
            BioTime PWA Standalone • Biometric Face & Triple Fingerprint Cloud System
          </div>
        </div>
      </footer>

    </div>
  );
}
