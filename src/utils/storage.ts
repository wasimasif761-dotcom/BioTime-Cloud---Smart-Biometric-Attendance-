import { Branch, Employee, AttendanceRecord, SystemSettings } from '../types';
import { 
  DEFAULT_BRANCHES, 
  DEFAULT_SETTINGS,
  dbGetEmployees,
  dbSaveEmployee,
  dbDeleteEmployee,
  dbGetAttendance,
  dbSaveAttendance,
  dbGetBranches,
  dbSaveBranches,
  dbGetSettings,
  dbSaveSettings
} from './db';

const STORAGE_KEYS = {
  CURRENT_BRANCH: 'biotime_current_branch_v3',
  LANGUAGE: 'biotime_language_v3',
  EMPLOYEES_CACHE: 'biotime_employees_cache_v3',
  ATTENDANCE_CACHE: 'biotime_attendance_cache_v3',
};

export const storage = {
  // Synchronous cache for initial render
  getCachedEmployees(): Employee[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EMPLOYEES_CACHE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  setCachedEmployees(employees: Employee[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES_CACHE, JSON.stringify(employees));
    } catch {
      // Storage quota or private mode safe
    }
  },

  getCachedAttendance(): AttendanceRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE_CACHE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  setCachedAttendance(attendance: AttendanceRecord[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE_CACHE, JSON.stringify(attendance));
    } catch {
      // Storage quota safe
    }
  },

  // Direct Async IndexedDB methods
  async loadEmployees(): Promise<Employee[]> {
    try {
      const list = await dbGetEmployees();
      this.setCachedEmployees(list);
      return list;
    } catch (err) {
      console.warn('IndexedDB loadEmployees error, using cache:', err);
      return this.getCachedEmployees();
    }
  },

  async persistEmployee(emp: Employee): Promise<void> {
    await dbSaveEmployee(emp);
    const updated = await dbGetEmployees();
    this.setCachedEmployees(updated);
  },

  async removeEmployee(id: string): Promise<void> {
    await dbDeleteEmployee(id);
    const updated = await dbGetEmployees();
    this.setCachedEmployees(updated);
  },

  async loadAttendance(): Promise<AttendanceRecord[]> {
    try {
      const records = await dbGetAttendance();
      this.setCachedAttendance(records);
      return records;
    } catch (err) {
      console.warn('IndexedDB loadAttendance error, using cache:', err);
      return this.getCachedAttendance();
    }
  },

  async persistAttendance(record: AttendanceRecord): Promise<void> {
    await dbSaveAttendance(record);
    const updated = await dbGetAttendance();
    this.setCachedAttendance(updated);
  },

  async clearAttendance(): Promise<void> {
    const { dbClearAttendance } = await import('./db');
    await dbClearAttendance();
    this.setCachedAttendance([]);
  },

  async loadBranches(): Promise<Branch[]> {
    try {
      return await dbGetBranches();
    } catch {
      return DEFAULT_BRANCHES;
    }
  },

  async persistBranches(branches: Branch[]): Promise<void> {
    await dbSaveBranches(branches);
  },

  async loadSettings(): Promise<SystemSettings> {
    try {
      return await dbGetSettings();
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  async persistSettings(settings: SystemSettings): Promise<void> {
    await dbSaveSettings(settings);
  },

  getCurrentBranchId(): string {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_BRANCH) || 'br_jeddah';
  },
  setCurrentBranchId(id: string) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_BRANCH, id);
  },

  getLanguage(): 'ur' | 'en' | 'ar' {
    return (localStorage.getItem(STORAGE_KEYS.LANGUAGE) as 'ur' | 'en' | 'ar') || 'ur';
  },
  setLanguage(lang: 'ur' | 'en' | 'ar') {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
  },
};
