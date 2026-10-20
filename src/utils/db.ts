import { Employee, AttendanceRecord, Branch, SystemSettings } from '../types';

const DB_NAME = 'BiotimeOfflineDB';
const DB_VERSION = 1;

export const STORES = {
  EMPLOYEES: 'employees',
  ATTENDANCE: 'attendance',
  BRANCHES: 'branches',
  SETTINGS: 'settings',
} as const;

export const DEFAULT_BRANCHES: Branch[] = [
  {
    id: 'br_riyadh',
    name: 'Riyadh Head Office',
    nameUrdu: 'ریاض ہیڈ آفس',
    city: 'Riyadh',
    isHeadOffice: true,
    terminalCode: 'RUH-TERM-01',
    activeKiosks: 1,
  },
  {
    id: 'br_jeddah',
    name: 'Jeddah Branch',
    nameUrdu: 'جدہ برانچ',
    city: 'Jeddah',
    isHeadOffice: false,
    terminalCode: 'JED-TERM-02',
    activeKiosks: 1,
  },
  {
    id: 'br_dammam',
    name: 'Dammam Center',
    nameUrdu: 'دمام مرکز',
    city: 'Dammam',
    isHeadOffice: false,
    terminalCode: 'DMM-TERM-03',
    activeKiosks: 1,
  },
];

export const DEFAULT_SETTINGS: SystemSettings = {
  companyName: 'Isam Economics Company Ltd',
  companyNameUrdu: 'عصام اکنامکس کمپنی لمیٹڈ',
  defaultShiftStart: '09:00',
  defaultShiftEnd: '18:00',
  lateGracePeriodMinutes: 15,
  halfDayThresholdHours: 4.5,
  currency: 'SAR',
  overtimeMultiplier: 1.5,
  autoDetectFace: true,
  soundEnabled: true,
};

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported on this device/browser'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Employees Store
      if (!db.objectStoreNames.contains(STORES.EMPLOYEES)) {
        const empStore = db.createObjectStore(STORES.EMPLOYEES, { keyPath: 'id' });
        empStore.createIndex('empNumber', 'empNumber', { unique: true });
        empStore.createIndex('cardId', 'cardId', { unique: false });
        empStore.createIndex('pinCode', 'pinCode', { unique: false });
        empStore.createIndex('branchId', 'branchId', { unique: false });
      }

      // 2. Attendance Store
      if (!db.objectStoreNames.contains(STORES.ATTENDANCE)) {
        const attStore = db.createObjectStore(STORES.ATTENDANCE, { keyPath: 'id' });
        attStore.createIndex('employeeId', 'employeeId', { unique: false });
        attStore.createIndex('date', 'date', { unique: false });
        attStore.createIndex('branchId', 'branchId', { unique: false });
      }

      // 3. Branches Store
      if (!db.objectStoreNames.contains(STORES.BRANCHES)) {
        db.createObjectStore(STORES.BRANCHES, { keyPath: 'id' });
      }

      // 4. Settings Store
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
      }
    };

    request.onsuccess = async () => {
      const db = request.result;
      // Pre-seed default branches and settings if empty
      await seedInitialDefaults(db);
      resolve(db);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });

  return dbPromise;
}

async function seedInitialDefaults(db: IDBDatabase): Promise<void> {
  return new Promise((resolve) => {
    const tx = db.transaction([STORES.BRANCHES, STORES.SETTINGS], 'readwrite');
    const branchStore = tx.objectStore(STORES.BRANCHES);
    const settingsStore = tx.objectStore(STORES.SETTINGS);

    const countReq = branchStore.count();
    countReq.onsuccess = () => {
      if (countReq.result === 0) {
        DEFAULT_BRANCHES.forEach((b) => branchStore.put(b));
      }
    };

    const setReq = settingsStore.get('system_settings');
    setReq.onsuccess = () => {
      if (!setReq.result) {
        settingsStore.put({ id: 'system_settings', ...DEFAULT_SETTINGS });
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve(); // Non-blocking
  });
}

// ----------------------------------------------------
// EMPLOYEES CRUD
// ----------------------------------------------------

export async function dbGetEmployees(): Promise<Employee[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.EMPLOYEES, 'readonly');
    const store = tx.objectStore(STORES.EMPLOYEES);
    const req = store.getAll();

    req.onsuccess = () => resolve((req.result as Employee[]) || []);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGetEmployeeById(id: string): Promise<Employee | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.EMPLOYEES, 'readonly');
    const store = tx.objectStore(STORES.EMPLOYEES);
    const req = store.get(id);

    req.onsuccess = () => resolve(req.result as Employee | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function dbSaveEmployee(employee: Employee): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.EMPLOYEES, 'readwrite');
    const store = tx.objectStore(STORES.EMPLOYEES);
    const req = store.put(employee);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbDeleteEmployee(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.EMPLOYEES, 'readwrite');
    const store = tx.objectStore(STORES.EMPLOYEES);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ----------------------------------------------------
// ATTENDANCE LOGS CRUD
// ----------------------------------------------------

export async function dbGetAttendance(): Promise<AttendanceRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ATTENDANCE, 'readonly');
    const store = tx.objectStore(STORES.ATTENDANCE);
    const req = store.getAll();

    req.onsuccess = () => {
      const records = (req.result as AttendanceRecord[]) || [];
      // Sort newest to oldest
      records.sort((a, b) => `${b.date} ${b.timeIn}`.localeCompare(`${a.date} ${a.timeIn}`));
      resolve(records);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function dbSaveAttendance(record: AttendanceRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ATTENDANCE, 'readwrite');
    const store = tx.objectStore(STORES.ATTENDANCE);
    const req = store.put(record);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbDeleteAttendance(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ATTENDANCE, 'readwrite');
    const store = tx.objectStore(STORES.ATTENDANCE);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbClearAttendance(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ATTENDANCE, 'readwrite');
    const store = tx.objectStore(STORES.ATTENDANCE);
    const req = store.clear();

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ----------------------------------------------------
// BRANCHES & SETTINGS
// ----------------------------------------------------

export async function dbGetBranches(): Promise<Branch[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.BRANCHES, 'readonly');
    const store = tx.objectStore(STORES.BRANCHES);
    const req = store.getAll();

    req.onsuccess = () => {
      const list = (req.result as Branch[]) || [];
      resolve(list.length > 0 ? list : DEFAULT_BRANCHES);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function dbSaveBranches(branches: Branch[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.BRANCHES, 'readwrite');
    const store = tx.objectStore(STORES.BRANCHES);
    store.clear();
    branches.forEach((b) => store.put(b));

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function dbGetSettings(): Promise<SystemSettings> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SETTINGS, 'readonly');
    const store = tx.objectStore(STORES.SETTINGS);
    const req = store.get('system_settings');

    req.onsuccess = () => {
      if (req.result) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...settings } = req.result;
        resolve(settings as SystemSettings);
      } else {
        resolve(DEFAULT_SETTINGS);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function dbSaveSettings(settings: SystemSettings): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SETTINGS, 'readwrite');
    const store = tx.objectStore(STORES.SETTINGS);
    const req = store.put({ id: 'system_settings', ...settings });

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ----------------------------------------------------
// CSV EXPORT UTILITY
// ----------------------------------------------------

export function exportAttendanceToCSV(records: AttendanceRecord[]): string {
  const headers = [
    'Date',
    'Employee ID',
    'Employee Name',
    'Branch',
    'Time IN',
    'Time OUT',
    'Method IN',
    'Method OUT',
    'Status',
    'Hours Worked',
    'Overtime Hours',
    'Late Minutes',
    'Face Confidence (%)',
  ];

  const rows = records.map((r) => [
    `"${r.date}"`,
    `"${r.empNumber}"`,
    `"${r.employeeName.replace(/"/g, '""')}"`,
    `"${(r.branchName || '').replace(/"/g, '""')}"`,
    `"${r.timeIn}"`,
    `"${r.timeOut || 'Still IN'}"`,
    `"${r.methodIn}"`,
    `"${r.methodOut || ''}"`,
    `"${r.status}"`,
    `"${r.hoursWorked}"`,
    `"${r.overtimeHours}"`,
    `"${r.lateMinutes}"`,
    `"${r.faceConfidence ?? ''}"`,
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

export function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
