export interface EnrolledFinger {
  id: string;
  fingerIndex: 1 | 2 | 3;
  name: string; // e.g. 'Right Thumb', 'Right Index', 'Left Thumb'
  enrolledAt: string;
  quality: number; // e.g. 96%
  hash: string;
}

export interface Employee {
  id: string;
  empNumber: string;
  name: string;
  nameUrdu: string;
  branchId: string;
  department: string;
  role: string;
  roleUrdu: string;
  avatar: string;
  cardId: string; // QR / RFID Smart badge identifier
  qrCodeDataUrl?: string; // Generated local QR code image
  pinCode: string; // 4-digit passcode for instant offline punch
  fingers: EnrolledFinger[];
  faceRegistered: boolean;
  facePhoto?: string;
  faceDescriptor?: number[]; // 128-float facial vector from @vladmandic/face-api
  webAuthnId?: string; // WebAuthn credential ID for phone fingerprint/FaceID
  baseSalary: number; // Monthly in SAR or local currency
  hourlyRate: number;
  currency: string;
  shiftStart: string; // "09:00"
  shiftEnd: string; // "18:00"
  status: 'active' | 'on_leave' | 'inactive';
  phone: string;
  joinedDate: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  empNumber: string;
  employeeName: string;
  branchId: string;
  branchName: string;
  date: string; // YYYY-MM-DD
  timeIn: string; // HH:MM:SS
  timeOut: string | null; // HH:MM:SS
  methodIn: 'face' | 'qr' | 'pin' | 'webauthn' | 'fingerprint' | 'card';
  methodOut?: 'face' | 'qr' | 'pin' | 'webauthn' | 'fingerprint' | 'card';
  photoIn?: string;
  photoOut?: string;
  status: 'present' | 'late' | 'half_day' | 'overtime';
  hoursWorked: number;
  overtimeHours: number;
  lateMinutes: number;
  faceConfidence?: number; // e.g. 96%
  fingerUsed?: string;
}

export interface Branch {
  id: string;
  name: string;
  nameUrdu: string;
  city: string;
  isHeadOffice: boolean;
  terminalCode: string;
  activeKiosks: number;
}

export interface SystemSettings {
  companyName: string;
  companyNameUrdu: string;
  defaultShiftStart: string;
  defaultShiftEnd: string;
  lateGracePeriodMinutes: number;
  halfDayThresholdHours: number;
  currency: string;
  overtimeMultiplier: number;
  autoDetectFace: boolean;
  soundEnabled: boolean;
}

export interface SalaryReportItem {
  employee: Employee;
  totalDaysPresent: number;
  totalLateDays: number;
  totalWorkingHours: number;
  totalOvertimeHours: number;
  baseSalary: number;
  overtimePay: number;
  lateDeduction: number;
  netSalary: number;
}
