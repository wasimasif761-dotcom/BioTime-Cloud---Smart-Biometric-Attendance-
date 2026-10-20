import React, { useState } from 'react';
import { 
  Settings, 
  Building2, 
  Clock, 
  Volume2, 
  Save, 
  Plus, 
  CheckCircle2, 
  Trash2,
  DollarSign,
  Database,
  Download,
  ShieldCheck,
  FileSpreadsheet,
  Users,
  Camera,
  AlertTriangle
} from 'lucide-react';
import { SystemSettings, Branch, Employee, AttendanceRecord } from '../types';
import { sound } from '../utils/audio';
import { translations, Language } from '../utils/i18n';
import { exportAttendanceToCSV, downloadCSV } from '../utils/db';

interface SettingsViewProps {
  settings: SystemSettings;
  branches: Branch[];
  lang: Language;
  employees?: Employee[];
  attendance?: AttendanceRecord[];
  onSaveSettings: (settings: SystemSettings) => void;
  onSaveBranches: (branches: Branch[]) => void;
  onClearAttendance?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  branches,
  lang,
  employees = [],
  attendance = [],
  onSaveSettings,
  onSaveBranches,
  onClearAttendance,
}) => {
  const t = translations[lang];
  const [formData, setFormData] = useState<SystemSettings>(settings);
  const [branchList, setBranchList] = useState<Branch[]>(branches);
  const [savedToast, setSavedToast] = useState(false);

  // New branch modal inputs
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchNameUrdu, setNewBranchNameUrdu] = useState('');
  const [newBranchCity, setNewBranchCity] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    onSaveBranches(branchList);
    sound.playSuccessIn();
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const handleAddBranch = () => {
    if (!newBranchName.trim()) return;
    const codePrefix = newBranchCity.slice(0, 3).toUpperCase() || 'BRN';
    const newBranch: Branch = {
      id: `br_${Date.now()}`,
      name: newBranchName.trim(),
      nameUrdu: newBranchNameUrdu.trim() || newBranchName.trim(),
      city: newBranchCity.trim() || 'Saudi Arabia',
      isHeadOffice: false,
      terminalCode: `${codePrefix}-TERM-0${branchList.length + 1}`,
      activeKiosks: 1,
    };

    setBranchList([...branchList, newBranch]);
    setNewBranchName('');
    setNewBranchNameUrdu('');
    setNewBranchCity('');
    sound.playCardBeep();
  };

  const handleDeleteBranch = (id: string) => {
    if (branchList.length <= 1) {
      alert('At least one branch must remain active.');
      return;
    }
    setBranchList(branchList.filter((b) => b.id !== id));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">{t.settings}</h2>
            <p className="text-xs text-slate-400">
              {lang === 'ur'
                ? 'ڈیوٹی کے اوقات، تاخیر کٹوتی، اوور ٹائم ریٹ اور نئی برانچز کا اندراج'
                : 'Configure business rules, shift timings, overtime multipliers, and branches'}
            </p>
          </div>
        </div>

        {savedToast && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Company & General Rules */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-slate-800 pb-3">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <span>Company & Currency</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Company Name (English)</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">کمپنی کا نام (اردو)</label>
              <input
                type="text"
                value={formData.companyNameUrdu}
                onChange={(e) => setFormData({ ...formData, companyNameUrdu: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Currency Code</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-cyan-500"
              >
                <option value="SAR">SAR (Saudi Riyal)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="AED">AED (UAE Dirham)</option>
                <option value="PKR">PKR (Pakistani Rupee)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Overtime Rate Multiplier</label>
              <input
                type="number"
                step="0.1"
                value={formData.overtimeMultiplier}
                onChange={(e) => setFormData({ ...formData, overtimeMultiplier: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Shift Timings & Grace Period */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-slate-800 pb-3">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Shift Timings & Late Policy</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Default Shift Start</label>
              <input
                type="time"
                value={formData.defaultShiftStart}
                onChange={(e) => setFormData({ ...formData, defaultShiftStart: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Default Shift End</label>
              <input
                type="time"
                value={formData.defaultShiftEnd}
                onChange={(e) => setFormData({ ...formData, defaultShiftEnd: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Grace Period (Minutes)</label>
              <input
                type="number"
                value={formData.lateGracePeriodMinutes}
                onChange={(e) => setFormData({ ...formData, lateGracePeriodMinutes: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Branch Management (Riyadh, Jeddah, etc.) */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="font-bold text-white text-sm flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span>Branches & Terminals</span>
            </div>
            <span className="text-xs text-slate-400 font-normal">{branchList.length} Active Locations</span>
          </h3>

          <div className="space-y-3">
            {branchList.map((branch) => (
              <div
                key={branch.id}
                className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>{branch.name} ({branch.nameUrdu})</span>
                    {branch.isHeadOffice && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950 text-cyan-400 font-bold border border-cyan-800/40">
                        HEAD OFFICE
                      </span>
                    )}
                  </div>
                  <div className="text-slate-400">
                    City: {branch.city} • Terminal: <span className="font-mono text-cyan-400">{branch.terminalCode}</span>
                  </div>
                </div>

                {!branch.isHeadOffice && (
                  <button
                    type="button"
                    onClick={() => handleDeleteBranch(branch.id)}
                    className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add Branch Inline Box */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="text-xs font-semibold text-slate-300 mb-2">Add New Location / Branch</div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="Branch Name (e.g. Mecca Center)"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none"
              />
              <input
                type="text"
                placeholder="نام (مثال: مکہ مرکز)"
                value={newBranchNameUrdu}
                onChange={(e) => setNewBranchNameUrdu(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none"
              />
              <input
                type="text"
                placeholder="City (e.g. Makkah)"
                value={newBranchCity}
                onChange={(e) => setNewBranchCity(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none"
              />
              <button
                type="button"
                onClick={handleAddBranch}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Branch</span>
              </button>
            </div>
          </div>
        </div>

        {/* Local Offline Database (IndexedDB) Status & Data Management */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="font-bold text-white text-sm flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>{lang === 'ur' ? 'مقامی ڈیٹا بیس اور آف لائن اسٹوریج (IndexedDB)' : 'Offline Local Database (IndexedDB)'}</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/40">
              {lang === 'ur' ? '100% آن ڈیوائس محفوظ' : '100% Phone Hardware'}
            </span>
          </h3>

          <p className="text-xs text-slate-400">
            {lang === 'ur'
              ? 'تمام ملازمین، بائیو میٹرک ویکٹرز اور حاضری کا ریکارڈ بغیر کسی بیرونی مشین اور بغیر کسی کلاؤڈ ڈیٹا بیس کے آپ کے موبائل فون کے اندر IndexedDB میں محفوظ ہے۔'
              : 'All employee profiles, 128D neural facial vectors, and attendance records are stored 100% on this device in browser IndexedDB with zero external machine or cloud database dependencies.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span>{lang === 'ur' ? 'درج ملازمین' : 'Enrolled Staff'}</span>
              </div>
              <div className="text-xl font-black text-white font-mono">{employees.length}</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-blue-400" />
                <span>{lang === 'ur' ? 'چہرہ بائیو میٹرک ویکٹرز' : 'Face Vectors (128D)'}</span>
              </div>
              <div className="text-xl font-black text-cyan-400 font-mono">
                {employees.filter((e) => e.faceDescriptor && e.faceDescriptor.length === 128).length}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lang === 'ur' ? 'محفوظ حاضری ریکارڈ' : 'Attendance Logs'}</span>
              </div>
              <div className="text-xl font-black text-emerald-400 font-mono">{attendance.length}</div>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => {
                if (attendance.length === 0) {
                  alert(lang === 'ur' ? 'حاضری کا کوئی ریکارڈ موجود نہیں ہے' : 'No attendance logs recorded yet.');
                  return;
                }
                const csv = exportAttendanceToCSV(attendance);
                downloadCSV(`All_Attendance_${new Date().toISOString().split('T')[0]}.csv`, csv);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{lang === 'ur' ? 'تمام حاضری ڈیٹا ڈاؤن لوڈ کریں (CSV)' : 'Export Attendance Data (CSV)'}</span>
            </button>

            {onClearAttendance && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(lang === 'ur' ? 'کیا آپ واقعی تمام حاضری لاگز صاف کرنا چاہتے ہیں؟' : 'Are you sure you want to clear all attendance logs from IndexedDB?')) {
                    onClearAttendance();
                    sound.playError();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/20 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{lang === 'ur' ? 'حاضری ہسٹری صاف کریں' : 'Clear Attendance History'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-sm shadow-xl shadow-cyan-500/25 transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save All System Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
