import React, { useState } from 'react';
import { 
  Calendar, 
  Search, 
  Download, 
  Printer, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Building2,
  LogIn,
  LogOut,
  Camera,
  Fingerprint,
  CreditCard,
  KeyRound,
  FileSpreadsheet
} from 'lucide-react';
import { AttendanceRecord, Branch, Employee } from '../types';
import { translations, Language } from '../utils/i18n';
import { exportAttendanceToCSV, downloadCSV } from '../utils/db';

interface AttendanceLogsProps {
  attendance: AttendanceRecord[];
  branches: Branch[];
  employees: Employee[];
  lang: Language;
}

export const AttendanceLogs: React.FC<AttendanceLogsProps> = ({
  attendance,
  branches,
  employees,
  lang,
}) => {
  const t = translations[lang];
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedMethod, setSelectedMethod] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Filter logs
  const filteredRecords = attendance.filter((rec) => {
    const matchesBranch = selectedBranch === 'ALL' || rec.branchId === selectedBranch;
    const matchesMethod = selectedMethod === 'ALL' || rec.methodIn === selectedMethod;
    const matchesDate = !filterDate || rec.date === filterDate;
    const matchesSearch = 
      rec.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.empNumber.includes(searchQuery) ||
      rec.branchName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesBranch && matchesMethod && matchesDate && matchesSearch;
  });

  // Export CSV with UTF-8 BOM for perfect Excel compatibility
  const handleExportCSV = () => {
    const csvContent = exportAttendanceToCSV(filteredRecords);
    const filename = `Attendance_Export_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(filename, csvContent);
  };

  const getMethodIcon = (m: string) => {
    switch (m) {
      case 'face':
        return <span title="Offline Face AI"><Camera className="w-3.5 h-3.5 text-cyan-400" /></span>;
      case 'webauthn':
      case 'fingerprint':
        return <span title="Phone Biometric (TouchID/FaceID)"><Fingerprint className="w-3.5 h-3.5 text-emerald-400" /></span>;
      case 'qr':
      case 'card':
        return <span title="QR Badge / Smart Card"><CreditCard className="w-3.5 h-3.5 text-purple-400" /></span>;
      default:
        return <span title="PIN Code"><KeyRound className="w-3.5 h-3.5 text-amber-400" /></span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">{t.reports}</h2>
            <p className="text-xs text-slate-400">
              {lang === 'ur'
                ? 'جدہ، ریاض اور تمام برانچز کی روزانہ و ماہانہ حاضری کا مکمل کلاؤڈ ریکارڈ'
                : 'Consolidated timesheets and punch timestamps for all enterprise branches'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Branch filter */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none"
          >
            <option value="ALL">{t.allBranches}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {lang === 'ur' ? b.nameUrdu : b.name}
              </option>
            ))}
          </select>

          {/* Verification Method filter */}
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none"
          >
            <option value="ALL">{lang === 'ur' ? 'تمام طریقے' : 'All Methods'}</option>
            <option value="face">{lang === 'ur' ? 'چہرہ شناخت' : 'Face AI'}</option>
            <option value="fingerprint">{lang === 'ur' ? 'فنگر پرنٹ' : 'Fingerprint'}</option>
            <option value="card">{lang === 'ur' ? 'اسمارٹ کارڈ' : 'RFID Card'}</option>
            <option value="pin">{lang === 'ur' ? 'پن کوڈ' : 'PIN'}</option>
          </select>

          {/* Date Picker */}
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono outline-none"
          />

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t.searchStaff}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 w-40 md:w-52"
            />
          </div>

          {/* Export and Print Buttons */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-xs shadow-md border border-emerald-500/40 transition cursor-pointer"
            title="Download CSV"
          >
            <Download className="w-4 h-4" />
            <span>{lang === 'ur' ? 'ایکسپورٹ ڈیٹا (CSV)' : 'Export Data (CSV)'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
            title="Print Timesheet"
          >
            <Printer className="w-4 h-4" />
            <span>{t.printReport}</span>
          </button>
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block p-4 border-b border-slate-400 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">BioTime Cloud — Official Attendance Sheet</h1>
            <p className="text-sm text-gray-600">Consolidated Headquarters Report • Riyadh & Jeddah Branches</p>
          </div>
          <div className="text-right text-xs">
            <p>Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
            <p>Total Records: {filteredRecords.length}</p>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden print-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Emp ID</th>
                <th className="px-5 py-3.5">Employee Name</th>
                <th className="px-5 py-3.5">Branch</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Time In</th>
                <th className="px-5 py-3.5">Time Out</th>
                <th className="px-5 py-3.5">Hours</th>
                <th className="px-5 py-3.5">Method</th>
                <th className="px-5 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredRecords.map((rec) => {
                const emp = employees.find((e) => e.id === rec.employeeId);

                return (
                  <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3.5 font-mono text-cyan-400 font-bold">
                      #{rec.empNumber}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        {emp && (
                          <img
                            src={emp.avatar}
                            alt=""
                            className="w-7 h-7 rounded-lg object-cover border border-slate-700"
                          />
                        )}
                        <div>
                          <div className="font-bold text-white">{rec.employeeName}</div>
                          {rec.fingerUsed && (
                            <div className="text-[10px] text-cyan-400/80">{rec.fingerUsed}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">
                      {rec.branchName}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-400">
                      {rec.date}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-emerald-400 font-bold">
                      {rec.timeIn}
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      {rec.timeOut ? (
                        <span className="text-rose-400 font-bold">{rec.timeOut}</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                          ON DUTY
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-white">
                      {rec.hoursWorked ? `${rec.hoursWorked}h` : '—'}
                      {rec.overtimeHours > 0 && (
                        <span className="text-[10px] text-amber-400 ml-1">(+{rec.overtimeHours}h OT)</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 uppercase font-mono text-[10px] text-slate-300">
                        {getMethodIcon(rec.methodIn)}
                        <span>{rec.methodIn}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {rec.status === 'late' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                          <AlertCircle className="w-3 h-3" />
                          <span>{t.late} ({rec.lateMinutes}m)</span>
                        </span>
                      ) : rec.status === 'overtime' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold">
                          <Clock className="w-3 h-3" />
                          <span>{t.overtime}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{t.present}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredRecords.length === 0 && (
          <div className="p-10 text-center text-slate-500 text-sm">
            No attendance records match your filter criteria.
          </div>
        )}
      </div>
    </div>
  );
};
