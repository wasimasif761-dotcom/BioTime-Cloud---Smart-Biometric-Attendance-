import React, { useState } from 'react';
import { 
  Calculator, 
  Printer, 
  Download, 
  DollarSign, 
  User, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Building2, 
  FileText,
  X
} from 'lucide-react';
import { Employee, AttendanceRecord, Branch, SystemSettings, SalaryReportItem } from '../types';
import { translations, Language } from '../utils/i18n';

interface PayrollCalculatorProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  branches: Branch[];
  settings: SystemSettings;
  lang: Language;
}

export const PayrollCalculator: React.FC<PayrollCalculatorProps> = ({
  employees,
  attendance,
  branches,
  settings,
  lang,
}) => {
  const t = translations[lang];
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [payPeriodMonth, setPayPeriodMonth] = useState('October 2026');
  const [selectedPayslipEmp, setSelectedPayslipEmp] = useState<SalaryReportItem | null>(null);

  // Compute payroll metrics for each employee based on attendance logs
  const payrollItems: SalaryReportItem[] = employees
    .filter((emp) => selectedBranch === 'ALL' || emp.branchId === selectedBranch)
    .map((employee) => {
      const empRecords = attendance.filter((r) => r.employeeId === employee.id);
      
      const totalDaysPresent = empRecords.length;
      const totalLateDays = empRecords.filter((r) => r.status === 'late').length;
      const totalWorkingHours = Number(empRecords.reduce((sum, r) => sum + (r.hoursWorked || 8), 0).toFixed(1));
      const totalOvertimeHours = Number(empRecords.reduce((sum, r) => sum + (r.overtimeHours || 0), 0).toFixed(1));
      
      // Calculations:
      // Base salary: if monthly, or daily prorated
      const baseSalary = employee.baseSalary || 4500;
      const hourlyRate = employee.hourlyRate || (baseSalary / (26 * 8));
      const overtimePay = Math.round(totalOvertimeHours * hourlyRate * settings.overtimeMultiplier);
      const lateDeduction = totalLateDays * Math.round(hourlyRate * 0.5); // 0.5 hour wage deduction per late arrival
      const netSalary = Math.round(baseSalary + overtimePay - lateDeduction);

      return {
        employee,
        totalDaysPresent,
        totalLateDays,
        totalWorkingHours,
        totalOvertimeHours,
        baseSalary,
        overtimePay,
        lateDeduction,
        netSalary,
      };
    });

  const totalPayrollCost = payrollItems.reduce((acc, item) => acc + item.netSalary, 0);
  const totalOvertimeCost = payrollItems.reduce((acc, item) => acc + item.overtimePay, 0);

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">{t.payrollCalculator}</h2>
            <p className="text-xs text-slate-400">
              {lang === 'ur'
                ? 'حاضری، ڈیوٹی کے گھنٹوں اور اوور ٹائم کے مطابق خودکار ماہانہ تنخواہ اور سلپ'
                : 'Automated salary computation based on verified attendance, duty hours, & overtime'}
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

          {/* Period selector */}
          <select
            value={payPeriodMonth}
            onChange={(e) => setPayPeriodMonth(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none"
          >
            <option value="October 2026">October 2026</option>
            <option value="September 2026">September 2026</option>
            <option value="August 2026">August 2026</option>
          </select>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{t.printReport}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-1">
          <div className="text-xs text-slate-400 font-medium">Total Staff on Payroll</div>
          <div className="font-mono text-2xl font-bold text-white">{payrollItems.length}</div>
          <div className="text-[11px] text-cyan-400">Jeddah, Riyadh & Dammam</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-1">
          <div className="text-xs text-slate-400 font-medium">Total Overtime Disbursed</div>
          <div className="font-mono text-2xl font-bold text-amber-400">
            {totalOvertimeCost.toLocaleString()} SAR
          </div>
          <div className="text-[11px] text-slate-400">1.5x Approved Rate</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-1">
          <div className="text-xs text-slate-400 font-medium">Total Net Monthly Payroll</div>
          <div className="font-mono text-2xl font-bold text-emerald-400">
            {totalPayrollCost.toLocaleString()} SAR
          </div>
          <div className="text-[11px] text-emerald-400/80">Approved for Disbursal</div>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden print-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5">Branch</th>
                <th className="px-5 py-3.5 text-center">Working Days</th>
                <th className="px-5 py-3.5 text-center">Hours Worked</th>
                <th className="px-5 py-3.5 text-right">Base Salary</th>
                <th className="px-5 py-3.5 text-right">Overtime Pay</th>
                <th className="px-5 py-3.5 text-right">Late Deductions</th>
                <th className="px-5 py-3.5 text-right font-extrabold text-cyan-400">Net Salary</th>
                <th className="px-5 py-3.5 text-center no-print">Payslip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {payrollItems.map((item) => {
                const branch = branches.find((b) => b.id === item.employee.branchId);

                return (
                  <tr key={item.employee.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={item.employee.avatar}
                          alt=""
                          className="w-8 h-8 rounded-xl object-cover border border-slate-700"
                        />
                        <div>
                          <div className="font-bold text-white">
                            {lang === 'ur' ? item.employee.nameUrdu || item.employee.name : item.employee.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            #{item.employee.empNumber} • {item.employee.role}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">
                      {branch ? (lang === 'ur' ? branch.nameUrdu : branch.name) : 'Branch'}
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono font-bold text-white">
                      {item.totalDaysPresent} days
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono text-slate-300">
                      {item.totalWorkingHours} hrs
                      {item.totalOvertimeHours > 0 && (
                        <span className="text-[10px] text-amber-400 ml-1">
                          (+{item.totalOvertimeHours}h OT)
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono">
                      {item.baseSalary} {item.employee.currency}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-emerald-400 font-bold">
                      +{item.overtimePay} {item.employee.currency}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-rose-400">
                      {item.lateDeduction > 0 ? `-${item.lateDeduction} ${item.employee.currency}` : '0'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-sm font-extrabold text-cyan-400">
                      {item.netSalary.toLocaleString()} {item.employee.currency}
                    </td>
                    <td className="px-5 py-3.5 text-center no-print">
                      <button
                        onClick={() => setSelectedPayslipEmp(item)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold text-xs border border-slate-700 transition cursor-pointer flex items-center justify-center gap-1 mx-auto"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{lang === 'ur' ? 'سلپ' : 'Payslip'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Printable Salary Payslip Modal */}
      {selectedPayslipEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-700 p-6 md:p-8 shadow-2xl text-slate-100 my-8 space-y-6 animate-in fade-in">
            <div className="no-print flex items-center justify-between pb-4 border-b border-slate-800">
              <span className="font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>{t.printPayslip}</span>
              </span>
              <button
                onClick={() => setSelectedPayslipEmp(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Official Payslip Template (Formatted for crisp printing) */}
            <div className="print-card p-6 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 space-y-5">
              
              {/* Slip Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="font-extrabold text-lg text-white tracking-wide">
                    {settings.companyName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Headquarters: Riyadh • Branch: {branches.find((b) => b.id === selectedPayslipEmp.employee.branchId)?.name || 'Jeddah'}
                  </p>
                  <p className="text-[11px] font-mono text-cyan-400 mt-0.5">
                    Official Salary Disbursal Voucher • {payPeriodMonth}
                  </p>
                </div>
                <div className="text-right text-xs">
                  <div className="font-mono font-bold text-slate-400">SLIP #{Date.now().toString().slice(-6)}</div>
                  <div className="text-[10px] text-slate-500">Date: {new Date().toISOString().split('T')[0]}</div>
                </div>
              </div>

              {/* Employee Particulars */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-slate-400">Employee Name:</span>
                  <div className="font-bold text-white text-sm">
                    {lang === 'ur' ? selectedPayslipEmp.employee.nameUrdu || selectedPayslipEmp.employee.name : selectedPayslipEmp.employee.name}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Employee ID:</span>
                  <div className="font-mono font-bold text-cyan-400">#{selectedPayslipEmp.employee.empNumber}</div>
                </div>
                <div>
                  <span className="text-slate-400">Role / Designation:</span>
                  <div className="font-semibold text-slate-200">{selectedPayslipEmp.employee.role}</div>
                </div>
                <div>
                  <span className="text-slate-400">Department:</span>
                  <div className="font-semibold text-slate-200">{selectedPayslipEmp.employee.department}</div>
                </div>
              </div>

              {/* Attendance & Time Record */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Days Present</div>
                  <div className="font-mono font-bold text-white text-sm">{selectedPayslipEmp.totalDaysPresent}</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Hours Logged</div>
                  <div className="font-mono font-bold text-white text-sm">{selectedPayslipEmp.totalWorkingHours}h</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Overtime</div>
                  <div className="font-mono font-bold text-amber-400 text-sm">{selectedPayslipEmp.totalOvertimeHours}h</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Late Days</div>
                  <div className="font-mono font-bold text-rose-400 text-sm">{selectedPayslipEmp.totalLateDays}</div>
                </div>
              </div>

              {/* Earnings & Deductions Breakdown */}
              <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                {/* Earnings */}
                <div className="space-y-2 border-r border-slate-800 pr-3">
                  <div className="font-bold text-slate-300 pb-1 border-b border-slate-800">EARNINGS</div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Base Salary</span>
                    <span className="font-mono font-bold text-white">{selectedPayslipEmp.baseSalary} SAR</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Overtime Allowance</span>
                    <span className="font-mono font-bold text-emerald-400">+{selectedPayslipEmp.overtimePay} SAR</span>
                  </div>
                </div>

                {/* Deductions */}
                <div className="space-y-2 pl-1">
                  <div className="font-bold text-slate-300 pb-1 border-b border-slate-800">DEDUCTIONS</div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Late Attendance</span>
                    <span className="font-mono font-bold text-rose-400">-{selectedPayslipEmp.lateDeduction} SAR</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">GOSI / Social Insurance</span>
                    <span className="font-mono font-bold text-slate-400">0.00 SAR</span>
                  </div>
                </div>
              </div>

              {/* Net Payable Highlight */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border border-cyan-500/40 flex items-center justify-between">
                <div>
                  <div className="text-xs text-cyan-300 font-bold uppercase tracking-wider">{t.netPay}</div>
                  <div className="text-[11px] text-slate-400">Disbursed via Direct Bank / Card Transfer</div>
                </div>
                <div className="font-mono text-2xl font-extrabold text-cyan-400">
                  {selectedPayslipEmp.netSalary.toLocaleString()} SAR
                </div>
              </div>

              {/* Authorized Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-800 text-center text-xs text-slate-400">
                <div>
                  <div className="border-b border-slate-700 h-8"></div>
                  <div className="mt-1 font-semibold">HR / Finance Authorized Signatory</div>
                </div>
                <div>
                  <div className="border-b border-slate-700 h-8"></div>
                  <div className="mt-1 font-semibold">Employee Signature & Date</div>
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="no-print flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedPayslipEmp(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{lang === 'ur' ? 'پرنٹ سلپ' : 'Print Payslip'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
