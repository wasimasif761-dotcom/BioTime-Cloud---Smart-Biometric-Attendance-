import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  Calculator, 
  Settings, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  LogIn, 
  TrendingUp, 
  Radio, 
  ShieldCheck,
  Calendar,
  Sparkles,
  Monitor,
  UserPlus
} from 'lucide-react';
import { Employee, AttendanceRecord, Branch, SystemSettings } from '../types';
import { StaffManagement } from './StaffManagement';
import { AttendanceLogs } from './AttendanceLogs';
import { PayrollCalculator } from './PayrollCalculator';
import { SettingsView } from './SettingsView';
import { translations, Language } from '../utils/i18n';

interface AdminDashboardProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  branches: Branch[];
  settings: SystemSettings;
  lang: Language;
  onSaveEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onSaveSettings: (settings: SystemSettings) => void;
  onSaveBranches: (branches: Branch[]) => void;
  onClearAttendance?: () => void;
  onBackToKiosk?: () => void;
  initialAdminTab?: 'overview' | 'staff' | 'logs' | 'payroll' | 'settings';
  autoOpenAddStaff?: boolean;
  onResetAutoOpenStaff?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  employees,
  attendance,
  branches,
  settings,
  lang,
  onSaveEmployee,
  onDeleteEmployee,
  onSaveSettings,
  onSaveBranches,
  onClearAttendance,
  onBackToKiosk,
  initialAdminTab = 'overview',
  autoOpenAddStaff = false,
  onResetAutoOpenStaff,
}) => {
  const t = translations[lang];
  const [activeAdminTab, setActiveAdminTab] = useState<'overview' | 'staff' | 'logs' | 'payroll' | 'settings'>(initialAdminTab);
  const [localAutoOpen, setLocalAutoOpen] = useState(autoOpenAddStaff);

  useEffect(() => {
    if (initialAdminTab) {
      setActiveAdminTab(initialAdminTab);
    }
  }, [initialAdminTab]);

  useEffect(() => {
    if (autoOpenAddStaff) {
      setActiveAdminTab('staff');
      setLocalAutoOpen(true);
    }
  }, [autoOpenAddStaff]);

  // Compute live today statistics
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecords = attendance.filter((r) => r.date === todayStr);

  const presentCount = todayRecords.filter((r) => r.timeIn).length;
  const lateCount = todayRecords.filter((r) => r.status === 'late').length;
  const clockedOutCount = todayRecords.filter((r) => r.timeOut).length;
  const stillInCount = presentCount - clockedOutCount;
  const onLeaveCount = employees.filter((e) => e.status === 'on_leave').length;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Subnav Navigation Bar for Admin Dashboard - Mobile Friendly Horizontal Scroll */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-2.5 p-2 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full md:w-auto py-0.5">
          {/* Prominent Back to Kiosk Button so user never feels trapped on another page */}
          {onBackToKiosk && (
            <button
              onClick={onBackToKiosk}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-md shadow-emerald-500/20 transition cursor-pointer whitespace-nowrap flex-shrink-0"
              title="Return to Attendance Terminal"
            >
              <Monitor className="w-4 h-4" />
              <span>{lang === 'ur' ? '← حاضری مشین پر واپس جائیں' : '← Back to Attendance Machine'}</span>
            </button>
          )}

          <button
            onClick={() => setActiveAdminTab('overview')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex-shrink-0 ${
              activeAdminTab === 'overview'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>{lang === 'ur' ? 'جائزہ و برانچز' : 'Overview'}</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('staff')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex-shrink-0 ${
              activeAdminTab === 'staff'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t.staffManagement}</span>
          </button>

          {/* Quick Direct Add Staff Trigger */}
          <button
            onClick={() => {
              setActiveAdminTab('staff');
              setLocalAutoOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-md shadow-cyan-500/25 transition cursor-pointer whitespace-nowrap flex-shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{lang === 'ur' ? '+ نیا ملازم شامل کریں' : '+ Add New Staff'}</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('logs')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex-shrink-0 ${
              activeAdminTab === 'logs'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{t.reports}</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('payroll')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex-shrink-0 ${
              activeAdminTab === 'payroll'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>{t.payrollCalculator}</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('settings')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex-shrink-0 ${
              activeAdminTab === 'settings'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{t.settings}</span>
          </button>
        </div>

        {/* Riyadh Head Office Master Badge */}
        <div className="flex items-center justify-between md:justify-end gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex-shrink-0">
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300 font-semibold truncate max-w-[200px] sm:max-w-none">
              {settings.companyName}
            </span>
          </div>
          <span className="font-mono text-[10px] text-cyan-400 uppercase tracking-wider">
            HQ RIYADH
          </span>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & LIVE ACTIVITY */}
      {activeAdminTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Quick Action Banner for Staff Enrollment */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-cyan-950/70 via-slate-900 to-blue-950/70 border border-cyan-800/40 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <UserPlus className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-white">
                  {lang === 'ur' ? 'نیا عملہ / ملازم شامل کریں' : 'Enroll New Workforce & Biometrics'}
                </h3>
                <p className="text-xs text-slate-400">
                  {lang === 'ur' 
                    ? 'کیمرہ چہرہ شناخت، 3 فنگر پرنٹ اور اسمارٹ کیو آر بیج کے ساتھ فوری اندراج' 
                    : 'Register staff with AI face scan, 3-fingerprint enrollment & printable QR badges'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  setActiveAdminTab('staff');
                  setLocalAutoOpen(true);
                }}
                className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-cyan-500/25 transition cursor-pointer active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                <span>{lang === 'ur' ? '+ نیا ملازم شامل کریں' : '+ Add New Staff'}</span>
              </button>

              <button
                onClick={() => setActiveAdminTab('staff')}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs border border-slate-700 transition cursor-pointer"
              >
                <span>{lang === 'ur' ? 'فہرست عملہ' : 'Staff List'}</span>
              </button>
            </div>
          </div>

          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Total Staff */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>{t.totalEmployees}</span>
                <Users className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="font-mono text-3xl font-extrabold text-white">
                {employees.length}
              </div>
              <div className="text-[11px] text-slate-400">Across {branches.length} branches</div>
            </div>

            {/* Present Today */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>{t.presentToday}</span>
                <LogIn className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="font-mono text-3xl font-extrabold text-emerald-400">
                {presentCount}
              </div>
              <div className="text-[11px] text-emerald-400/80 font-medium">{stillInCount} currently on duty</div>
            </div>

            {/* Late Arrivals */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>{t.lateArrivals}</span>
                <AlertCircle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="font-mono text-3xl font-extrabold text-amber-400">
                {lateCount}
              </div>
              <div className="text-[11px] text-slate-400">&gt;{settings.lateGracePeriodMinutes}m grace period</div>
            </div>

            {/* Clocked Out */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>{t.clockedOut}</span>
                <LogOut className="w-4 h-4 text-rose-400" />
              </div>
              <div className="font-mono text-3xl font-extrabold text-rose-400">
                {clockedOutCount}
              </div>
              <div className="text-[11px] text-slate-400">Punched exit today</div>
            </div>

            {/* Active Terminals */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-2 col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Active Kiosks</span>
                <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
              </div>
              <div className="font-mono text-3xl font-extrabold text-cyan-400">
                {branches.length}
              </div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>100% Online & Synced</span>
              </div>
            </div>

          </div>

          {/* Branch Kiosk Terminals Grid & Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {branches.map((b) => {
              const branchStaff = employees.filter((e) => e.branchId === b.id);
              const branchTodayAttendance = todayRecords.filter((r) => r.branchId === b.id);
              const branchPresent = branchTodayAttendance.filter((r) => r.timeIn).length;

              return (
                <div
                  key={b.id}
                  className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-white text-base">
                          {lang === 'ur' ? b.nameUrdu : b.name}
                        </h3>
                        {b.isHeadOffice && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950 text-cyan-400 font-bold border border-cyan-800/40">
                            HQ
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{b.city} • Terminal: <span className="font-mono text-cyan-400">{b.terminalCode}</span></p>
                    </div>

                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/50 text-emerald-400 text-[11px] font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>ONLINE</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400">Assigned Staff</span>
                      <div className="font-mono text-lg font-bold text-white mt-0.5">{branchStaff.length}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Present Today</span>
                      <div className="font-mono text-lg font-bold text-emerald-400 mt-0.5">{branchPresent}</div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-400">Terminal Capabilities</div>
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300">AI Face Camera</span>
                      <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300">3-Finger Sensor</span>
                      <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300">Smart RFID Tap</span>
                      <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300">Offline Cache</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Real-time Multi-Branch Attendance Punch Feed */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                <h3 className="font-extrabold text-white text-base">{t.liveAttendanceFeed}</h3>
              </div>
              <span className="text-xs text-slate-400">Jeddah, Riyadh & Regional Sync</span>
            </div>

            <div className="divide-y divide-slate-800/80">
              {attendance.slice(0, 7).map((rec) => {
                const emp = employees.find((e) => e.id === rec.employeeId);

                return (
                  <div key={rec.id} className="py-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      {emp && (
                        <img
                          src={emp.avatar}
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover border border-cyan-500/30"
                        />
                      )}
                      <div>
                        <div className="font-bold text-white text-sm">
                          {rec.employeeName}
                          <span className="ml-2 font-mono text-[11px] text-cyan-400 font-normal">#{rec.empNumber}</span>
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          {rec.branchName} • Method: <span className="uppercase text-slate-300 font-semibold">{rec.methodIn}</span>
                          {rec.fingerUsed && ` (${rec.fingerUsed})`}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-white font-bold text-sm">
                        {rec.timeOut ? (
                          <span className="text-rose-400">{rec.timeOut} (OUT)</span>
                        ) : (
                          <span className="text-emerald-400">{rec.timeIn} (IN)</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">{rec.date}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: STAFF & BIOMETRIC ENROLLMENT */}
      {activeAdminTab === 'staff' && (
        <StaffManagement
          employees={employees}
          branches={branches}
          lang={lang}
          onSaveEmployee={onSaveEmployee}
          onDeleteEmployee={onDeleteEmployee}
          autoOpenAdd={localAutoOpen}
          onResetAutoOpen={() => {
            setLocalAutoOpen(false);
            onResetAutoOpenStaff?.();
          }}
        />
      )}

      {/* TAB 3: TIMESHEET & LOGS */}
      {activeAdminTab === 'logs' && (
        <AttendanceLogs
          attendance={attendance}
          branches={branches}
          employees={employees}
          lang={lang}
        />
      )}

      {/* TAB 4: PAYROLL CALCULATOR */}
      {activeAdminTab === 'payroll' && (
        <PayrollCalculator
          employees={employees}
          attendance={attendance}
          branches={branches}
          settings={settings}
          lang={lang}
        />
      )}

      {/* TAB 5: SYSTEM SETTINGS */}
      {activeAdminTab === 'settings' && (
        <SettingsView
          settings={settings}
          branches={branches}
          employees={employees}
          attendance={attendance}
          lang={lang}
          onSaveSettings={onSaveSettings}
          onSaveBranches={onSaveBranches}
          onClearAttendance={onClearAttendance}
        />
      )}

    </div>
  );
};
