import React, { useState, useRef, useEffect } from 'react';
import { 
  UserPlus, 
  User,
  Search, 
  Fingerprint, 
  CreditCard, 
  Camera, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  X, 
  ShieldCheck, 
  Building2, 
  Briefcase, 
  DollarSign, 
  RefreshCw,
  Sparkles,
  Printer,
  QrCode,
  Smartphone
} from 'lucide-react';
import { Employee, Branch, EnrolledFinger } from '../types';
import { sound } from '../utils/audio';
import { translations, Language } from '../utils/i18n';
import { detectAndComputeFaceDescriptor } from '../utils/faceRecognition';
import { generateQrBadgeUrl, registerPhoneBiometrics, isPlatformBiometricsAvailable } from '../utils/qrBadge';

interface StaffManagementProps {
  employees: Employee[];
  branches: Branch[];
  lang: Language;
  onSaveEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  autoOpenAdd?: boolean;
  onResetAutoOpen?: () => void;
}

export const StaffManagement: React.FC<StaffManagementProps> = ({
  employees,
  branches,
  lang,
  onSaveEmployee,
  onDeleteEmployee,
  autoOpenAdd,
  onResetAutoOpen,
}) => {
  const t = translations[lang];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [nameUrdu, setNameUrdu] = useState('');
  const [empNumber, setEmpNumber] = useState('');
  const [branchId, setBranchId] = useState(branches[0]?.id || '');
  const [department, setDepartment] = useState('Sales');
  const [role, setRole] = useState('');
  const [roleUrdu, setRoleUrdu] = useState('');
  const [baseSalary, setBaseSalary] = useState(4500);
  const [hourlyRate, setHourlyRate] = useState(25);
  const [currency, setCurrency] = useState('SAR');
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('18:00');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');
  const [cardId, setCardId] = useState('');
  const [pinCode, setPinCode] = useState('');

  // Real Face Recognition & QR State
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [isDetectingFace, setIsDetectingFace] = useState(false);
  const [faceStatusText, setFaceStatusText] = useState<string | null>(null);
  const [hasPlatformBiometrics, setHasPlatformBiometrics] = useState(false);
  const [webAuthnRegistered, setWebAuthnRegistered] = useState(false);
  const [isRegisteringWebAuthn, setIsRegisteringWebAuthn] = useState(false);

  // Check phone platform biometrics (TouchID / FaceID)
  useEffect(() => {
    isPlatformBiometricsAvailable().then(setHasPlatformBiometrics);
  }, []);

  // Auto-open modal if requested from Kiosk or Top Navbar
  useEffect(() => {
    if (autoOpenAdd) {
      handleOpenAdd();
      onResetAutoOpen?.();
    }
  }, [autoOpenAdd]);

  // 3-Fingerprint Enrollment state
  const [fingers, setFingers] = useState<EnrolledFinger[]>([
    { id: 'f_1', fingerIndex: 1, name: 'Right Thumb', enrolledAt: new Date().toISOString().split('T')[0], quality: 98, hash: 'FP_THUMB_R' },
  ]);
  const [enrollingFingerIndex, setEnrollingFingerIndex] = useState<1 | 2 | 3 | null>(null);

  // Printable badge modal
  const [printingBadgeEmp, setPrintingBadgeEmp] = useState<Employee | null>(null);

  // Modal step state (Step 1: Name, Role & Camera; Step 2: Salary, Shift & 3-Fingers)
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [formError, setFormError] = useState<string | null>(null);

  const QUICK_ROLES = [
    { label: 'Tea Boy / آفس بوائے', role: 'Tea Boy', roleUrdu: 'آفس بوائے / ٹی بوائے', dept: 'Pantry & Hospitality' },
    { label: 'Sales / سیلز مین', role: 'Sales Executive', roleUrdu: 'سیلز ایگزیکٹو', dept: 'Sales & Store' },
    { label: 'Cashier / کیشیئر', role: 'Cashier', roleUrdu: 'کیشیئر', dept: 'Accounts & Billing' },
    { label: 'Manager / منیجر', role: 'Store Manager', roleUrdu: 'اسٹور منیجر', dept: 'Store Operations' },
    { label: 'Kitchen / کچن ورکر', role: 'Kitchen Lead', roleUrdu: 'باورچی / کچن ورکر', dept: 'Kitchen' },
    { label: 'Cleaner / ہیلپر', role: 'Helper / Cleaner', roleUrdu: 'ہیلپر / صفائی عملہ', dept: 'Support Staff' },
    { label: 'Driver / ڈرائیور', role: 'Driver', roleUrdu: 'ڈرائیور', dept: 'Logistics' },
  ];

  // Real Camera Capture State
  const [isLiveCameraActive, setIsLiveCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [staffCameraStream, setStaffCameraStream] = useState<MediaStream | null>(null);
  const staffVideoRef = useRef<HTMLVideoElement | null>(null);
  const staffStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Wire video stream whenever stream state changes or active status toggles
  useEffect(() => {
    if (staffVideoRef.current && staffCameraStream) {
      staffVideoRef.current.srcObject = staffCameraStream;
      staffVideoRef.current.play().catch((err) => {
        console.warn('Staff video stream play warning:', err);
      });
    }
  }, [staffCameraStream, isLiveCameraActive]);

  const startLiveCamera = async () => {
    setCameraLoading(true);
    setCameraError(null);
    try {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      staffStreamRef.current = stream;
      setStaffCameraStream(stream);
      setIsLiveCameraActive(true);
      setCameraLoading(false);
    } catch (err) {
      console.warn('Camera error:', err);
      setCameraLoading(false);
      setCameraError(
        lang === 'ur'
          ? 'براؤزر نے ویڈیو بلاک کی۔ نیچے "موبائل کیمرے سے تصویر لیں" کا بٹن دبائیں!'
          : 'Direct stream blocked. Tap "Snap with Phone Camera" below!'
      );
    }
  };

  const stopLiveCamera = () => {
    if (staffStreamRef.current) {
      staffStreamRef.current.getTracks().forEach((t) => t.stop());
      staffStreamRef.current = null;
    }
    if (staffCameraStream) {
      staffCameraStream.getTracks().forEach((t) => t.stop());
      setStaffCameraStream(null);
    }
    setIsLiveCameraActive(false);
  };

  const takeLiveSnapshot = async () => {
    if (!staffVideoRef.current) return;
    const video = staffVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // mirror horizontal
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setAvatar(dataUrl);
      sound.playCameraSnap();
      stopLiveCamera();

      // Extract real facial embedding descriptor (128 floats)
      setIsDetectingFace(true);
      setFaceStatusText(lang === 'ur' ? 'چہرے کے فیچرز اسکین ہو رہے ہیں...' : 'Extracting 128D facial vector...');
      try {
        const detection = await detectAndComputeFaceDescriptor(canvas);
        if (detection) {
          setFaceDescriptor(detection.descriptorArray);
          setFaceStatusText(
            lang === 'ur'
              ? `✓ چہرہ تصدیق شدہ! بائیو میٹرک ویکٹر محفوظ (اسکور: ${detection.score}%)`
              : `✓ Face Verified! 128D Biometric vector saved (Score: ${detection.score}%)`
          );
        } else {
          setFaceDescriptor(null);
          setFaceStatusText(
            lang === 'ur'
              ? '⚠️ تصویر میں چہرہ واضح نہیں ملا۔ براہ کرم اچھے روشنی میں دوبارہ تصویر لیں'
              : '⚠️ Face not clearly detected. Please retake photo facing camera with good lighting.'
          );
        }
      } catch (err) {
        console.warn('Face detection error:', err);
      } finally {
        setIsDetectingFace(false);
      }
    }
  };

  const handleDeviceCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setAvatar(result);
          sound.playCameraSnap();

          // Extract facial descriptor from image
          const img = new Image();
          img.onload = async () => {
            setIsDetectingFace(true);
            setFaceStatusText(lang === 'ur' ? 'چہرے کے فیچرز اسکین ہو رہے ہیں...' : 'Extracting 128D facial vector...');
            try {
              const detection = await detectAndComputeFaceDescriptor(img);
              if (detection) {
                setFaceDescriptor(detection.descriptorArray);
                setFaceStatusText(
                  lang === 'ur'
                    ? `✓ چہرہ تصدیق شدہ! بائیو میٹرک ویکٹر محفوظ (اسکور: ${detection.score}%)`
                    : `✓ Face Verified! 128D Biometric vector saved (Score: ${detection.score}%)`
                );
              } else {
                setFaceDescriptor(null);
                setFaceStatusText(
                  lang === 'ur'
                    ? '⚠️ تصویر میں چہرہ واضح نہیں ملا۔ براہ کرم دوبارہ تصویر لیں'
                    : '⚠️ Face not clearly detected. Please retake photo facing camera.'
                );
              }
            } catch (err) {
              console.warn('Face detection error:', err);
            } finally {
              setIsDetectingFace(false);
            }
          };
          img.src = result;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Open modal for add
  const handleOpenAdd = () => {
    const nextNumber = String(1000 + employees.length + 1);
    setEditingEmployee(null);
    setModalStep(1);
    setFormError(null);
    setName('');
    setNameUrdu('');
    setEmpNumber(nextNumber);
    setBranchId(branches[0]?.id || '');
    setDepartment('Store Operations');
    setRole('Sales Associate');
    setRoleUrdu('سیلز ایسوسی ایٹ');
    setBaseSalary(4200);
    setHourlyRate(22);
    setCurrency('SAR');
    setShiftStart('09:00');
    setShiftEnd('18:00');
    setPhone('');
    setAvatar('');
    setFaceDescriptor(null);
    setFaceStatusText(null);
    setWebAuthnRegistered(false);
    setCardId(`QR-${nextNumber}`);
    setPinCode(nextNumber);
    setFingers([
      { id: `f_${Date.now()}_1`, fingerIndex: 1, name: 'Right Thumb', enrolledAt: new Date().toISOString().split('T')[0], quality: 98, hash: `FP_1_${nextNumber}` },
    ]);
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setModalStep(1);
    setFormError(null);
    setName(emp.name);
    setNameUrdu(emp.nameUrdu || '');
    setEmpNumber(emp.empNumber);
    setBranchId(emp.branchId);
    setDepartment(emp.department);
    setRole(emp.role);
    setRoleUrdu(emp.roleUrdu || '');
    setBaseSalary(emp.baseSalary);
    setHourlyRate(emp.hourlyRate);
    setCurrency(emp.currency);
    setShiftStart(emp.shiftStart);
    setShiftEnd(emp.shiftEnd);
    setPhone(emp.phone);
    setAvatar(emp.avatar);
    setFaceDescriptor(emp.faceDescriptor || null);
    setFaceStatusText(emp.faceDescriptor ? (lang === 'ur' ? '✓ چہرے کا بائیو میٹرک ویکٹر محفوظ ہے' : '✓ Real Face Biometric Embedding Enrolled (128D)') : null);
    setWebAuthnRegistered(Boolean(emp.webAuthnId));
    setCardId(emp.cardId);
    setPinCode(emp.pinCode);
    setFingers(emp.fingers || []);
    setIsModalOpen(true);
  };

  // Mobile keyboard auto-scroll helper: smoothly scroll any focused input into clear center view above keyboard
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const el = e.currentTarget;
    setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 280);
  };

  // Register phone hardware biometrics (TouchID / FaceID)
  const handleRegisterPhoneBiometrics = async () => {
    setIsRegisteringWebAuthn(true);
    try {
      const credId = await registerPhoneBiometrics(empNumber || `emp_${Date.now()}`, name || 'Employee');
      if (credId) {
        setWebAuthnRegistered(true);
        sound.playSuccessIn();
      } else {
        alert(lang === 'ur' ? 'فون بائیو میٹرک کینسل یا سپورٹڈ نہیں ہے' : 'Biometric pairing cancelled or unsupported');
      }
    } finally {
      setIsRegisteringWebAuthn(false);
    }
  };

  // Simulate fingerprint enrollment
  const handleEnrollFinger = (fingerIdx: 1 | 2 | 3) => {
    setEnrollingFingerIndex(fingerIdx);
    sound.playFingerSweep();

    setTimeout(() => {
      sound.playSuccessIn();
      const fingerName = fingerIdx === 1 ? 'Right Thumb' : fingerIdx === 2 ? 'Right Index' : 'Left Thumb';
      const existingFiltered = fingers.filter((f) => f.fingerIndex !== fingerIdx);
      const newFinger: EnrolledFinger = {
        id: `f_${Date.now()}_${fingerIdx}`,
        fingerIndex: fingerIdx,
        name: fingerName,
        enrolledAt: new Date().toISOString().split('T')[0],
        quality: Math.floor(92 + Math.random() * 7),
        hash: `FP_${fingerIdx}_${empNumber}`,
      };

      setFingers([...existingFiltered, newFinger]);
      setEnrollingFingerIndex(null);
    }, 1200);
  };

  // Generate new Card ID
  const handleGenerateCard = () => {
    sound.playCardBeep();
    setCardId(`QR-${empNumber || Math.floor(1000 + Math.random() * 9000)}`);
  };

  // Save handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError(lang === 'ur' ? '⚠️ براہ کرم ملازم کا نام درج کریں!' : '⚠️ Please enter employee name!');
      setModalStep(1);
      return;
    }
    if (!role.trim()) {
      setFormError(lang === 'ur' ? '⚠️ براہ کرم عہدہ / پوسٹ درج کریں!' : '⚠️ Please enter employee role / post!');
      setModalStep(1);
      return;
    }
    setFormError(null);

    const finalEmpNum = empNumber.trim() || String(1000 + employees.length + 1);
    const finalAvatar = avatar.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=0284c7&color=ffffff&size=256&bold=true`;
    
    // Generate QR code data URL for employee
    const qrBadgeUrl = await generateQrBadgeUrl(finalEmpNum);

    const employeeObj: Employee = {
      id: editingEmployee ? editingEmployee.id : `emp_${Date.now()}`,
      empNumber: finalEmpNum,
      name: name.trim(),
      nameUrdu: nameUrdu.trim() || name.trim(),
      branchId,
      department,
      role: role.trim() || 'Staff',
      roleUrdu: roleUrdu.trim() || role.trim(),
      avatar: finalAvatar,
      cardId: cardId.trim() || `QR-${finalEmpNum}`,
      qrCodeDataUrl: qrBadgeUrl,
      pinCode: pinCode.trim() || finalEmpNum,
      fingers,
      faceRegistered: Boolean(faceDescriptor && faceDescriptor.length === 128),
      facePhoto: finalAvatar,
      faceDescriptor: faceDescriptor ? faceDescriptor : undefined,
      webAuthnId: webAuthnRegistered ? (editingEmployee?.webAuthnId || `webauthn_${Date.now()}`) : undefined,
      baseSalary: Number(baseSalary),
      hourlyRate: Number(hourlyRate),
      currency,
      shiftStart,
      shiftEnd,
      status: 'active',
      phone,
      joinedDate: editingEmployee ? editingEmployee.joinedDate : new Date().toISOString().split('T')[0],
    };

    onSaveEmployee(employeeObj);
    setIsModalOpen(false);
    sound.playSuccessIn();
  };

  // Filtered employees
  const filtered = employees.filter((emp) => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.empNumber.includes(searchQuery) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesBranch = selectedBranchFilter === 'ALL' || emp.branchId === selectedBranchFilter;
    return matchesSearch && matchesBranch;
  });

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">{t.staffManagement}</h2>
            <p className="text-xs text-slate-400">
              {lang === 'ur'
                ? 'تمام برانچز کے ملازمین کا مکمل ریکارڈ، فنگر پرنٹ اندراج اور اسمارٹ کارڈز'
                : 'Manage workforce across all branches, 3-fingerprint enrollment, & RFID badges'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Branch filter */}
          <select
            value={selectedBranchFilter}
            onChange={(e) => setSelectedBranchFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none"
          >
            <option value="ALL">{t.allBranches}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {lang === 'ur' ? b.nameUrdu : b.name}
              </option>
            ))}
          </select>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t.searchStaff}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 w-48 md:w-60"
            />
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs md:text-sm shadow-lg shadow-cyan-500/20 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t.addNewEmployee}</span>
          </button>
        </div>
      </div>

      {/* Staff Grid */}
      {filtered.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900 border-2 border-dashed border-slate-700 text-center flex flex-col items-center justify-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
            <UserPlus className="w-8 h-8 animate-pulse text-cyan-400" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-lg font-extrabold text-white">
              {lang === 'ur' ? 'ابھی کوئی ملازم شامل نہیں ہے' : 'No Employees Enrolled Yet'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {lang === 'ur'
                ? 'نیا ملازم شامل کریں تاکہ وہ لائیو کیمرہ، چہرہ شناخت اور فون بائیو میٹرک سے حاضری لگا سکے!'
                : 'Click the button below to enroll your first employee with live camera face scanning and QR badge!'}
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm shadow-xl shadow-cyan-500/25 transition cursor-pointer transform active:scale-95"
          >
            <UserPlus className="w-5 h-5" />
            <span>{lang === 'ur' ? '+ نیا ملازم شامل کریں (Add First Staff)' : '+ Add First Employee'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((emp) => {
            const branch = branches.find((b) => b.id === emp.branchId);
            const enrolledFingerCount = emp.fingers ? emp.fingers.length : 0;

            return (
              <div
                key={emp.id}
                className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl hover:border-slate-700 transition space-y-4 relative flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-4">
                    <img
                      src={emp.avatar}
                      alt={emp.name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-500/40 shadow-md flex-shrink-0"
                    />
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/40 font-bold">
                          #{emp.empNumber}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/40 font-medium">
                          {branch ? (lang === 'ur' ? branch.nameUrdu : branch.name) : 'Branch'}
                        </span>
                      </div>

                      <h3 className="font-extrabold text-base text-white truncate">
                        {lang === 'ur' ? emp.nameUrdu || emp.name : emp.name}
                      </h3>
                      <p className="text-xs text-slate-400 truncate">
                        {lang === 'ur' ? emp.roleUrdu || emp.role : emp.role} • {emp.department}
                      </p>
                    </div>
                  </div>

                  {/* Biometric Credentials Badge Strip */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                    <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                      <div className="text-slate-400 text-[10px]">{lang === 'ur' ? 'چہرہ' : 'Face'}</div>
                      <div className="text-cyan-400 font-bold flex items-center justify-center gap-1 mt-0.5">
                        <Camera className="w-3 h-3" />
                        <span>{emp.faceRegistered ? 'OK' : 'No'}</span>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                      <div className="text-slate-400 text-[10px]">{lang === 'ur' ? 'انگلیاں' : 'Fingers'}</div>
                      <div className="text-cyan-400 font-bold flex items-center justify-center gap-1 mt-0.5">
                        <Fingerprint className="w-3 h-3" />
                        <span>{enrolledFingerCount}/3</span>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                      <div className="text-slate-400 text-[10px]">{lang === 'ur' ? 'کارڈ' : 'Card'}</div>
                      <div className="text-cyan-400 font-mono font-bold truncate mt-0.5">
                        {emp.cardId.split('-')[1] || emp.cardId}
                      </div>
                    </div>
                  </div>

                  {/* Salary details */}
                  <div className="flex items-center justify-between text-xs text-slate-300 bg-slate-950/40 p-2.5 rounded-xl">
                    <span>{lang === 'ur' ? 'ماہانہ تنخواہ:' : 'Base Salary:'}</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {emp.baseSalary} {emp.currency}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                  <button
                    onClick={() => setPrintingBadgeEmp(emp)}
                    className="inline-flex items-center gap-1.5 text-slate-300 hover:text-cyan-400 transition cursor-pointer"
                    title="Print Employee Smart Badge"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{lang === 'ur' ? 'کارڈ پرنٹ' : 'Badge'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(emp)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(lang === 'ur' ? 'کیا آپ اس ملازم کو حذف کرنا چاہتے ہیں؟' : 'Delete this employee?')) {
                          onDeleteEmployee(emp.id);
                        }
                      }}
                      className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Employee Biometric Modal - Stepped & Mobile Keyboard Friendly */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-start sm:justify-center p-1 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border-2 border-slate-700 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col my-1 sm:my-auto max-h-[96vh] sm:max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            
            {/* STICKY COMPACT MODAL HEADER (Ultra slim so mobile keyboard doesn't squeeze the screen) */}
            <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-20 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                    <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-white">
                      {editingEmployee ? t.editEmployee : t.addNewEmployee}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      ID: #{empNumber} • {branches.find((b) => b.id === branchId)?.name || 'Branch'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    stopLiveCamera();
                    setIsModalOpen(false);
                  }}
                  className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 2 Clear Step Navigation Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setModalStep(1)}
                  className={`py-2 px-2 rounded-lg transition text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                    modalStep === 1
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>1. {lang === 'ur' ? 'نام، عہدہ اور کیمرہ' : '1. Name, Role & Photo'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!name.trim()) {
                      setFormError(lang === 'ur' ? '⚠️ پہلے ملازم کا نام لکھیں!' : '⚠️ Please enter employee name first!');
                      return;
                    }
                    if (!role.trim()) {
                      setFormError(lang === 'ur' ? '⚠️ پہلے ملازم کا عہدہ منتخب کریں!' : '⚠️ Please enter employee role first!');
                      return;
                    }
                    setFormError(null);
                    setModalStep(2);
                  }}
                  className={`py-2 px-2 rounded-lg transition text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                    modalStep === 2
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>2. {lang === 'ur' ? 'تنخواہ اور فنگر پرنٹس' : '2. Salary & 3-Fingers'}</span>
                </button>
              </div>
            </div>

            {/* SCROLLABLE FORM BODY (Generous bottom padding so focused inputs scroll fully above keyboard) */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 pb-44 sm:pb-12 overscroll-contain">
              
              {/* Error Banner */}
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border-2 border-rose-500 text-rose-200 text-xs font-bold flex items-center gap-2 animate-bounce">
                  <span>{formError}</span>
                </div>
              )}

              {/* REAL-TIME LIVE TYPING PREVIEW BADGE (Inside scrollable body so it stays visible while scrolling) */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-cyan-400 shadow-xl flex items-center gap-3">
                <div className="relative w-15 h-15 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-slate-950 border-2 border-cyan-400 flex items-center justify-center flex-shrink-0 shadow-md">
                  {avatar ? (
                    <img src={avatar} alt="Employee preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-cyan-400 p-1 text-center">
                      <Camera className="w-5 h-5 mb-0.5 text-cyan-400 animate-pulse" />
                      <span className="text-[8px] font-bold">اصلی تصویر</span>
                    </div>
                  )}
                  {avatar && (
                    <span className="absolute bottom-0 inset-x-0 bg-emerald-500 text-slate-950 text-[8px] font-black text-center py-0.5 uppercase tracking-wider">
                      PHOTO OK
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold">
                      #{empNumber}
                    </span>
                    <span className="text-[10px] font-extrabold text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>{lang === 'ur' ? 'لائیو پریویو' : 'Live Preview'}</span>
                    </span>
                  </div>

                  {/* High contrast dynamic name */}
                  <div className="text-base sm:text-lg font-black text-white truncate">
                    {name ? (
                      <span className="text-white">{name}</span>
                    ) : (
                      <span className="text-amber-400 italic text-xs sm:text-sm">👈 نیچے نام لکھیں (Type name below)...</span>
                    )}
                  </div>

                  {/* High contrast dynamic role */}
                  <div className="text-xs sm:text-sm font-bold text-cyan-300 truncate">
                    {role ? (
                      <span>{role} {roleUrdu && roleUrdu !== role ? `(${roleUrdu})` : ''}</span>
                    ) : (
                      <span className="text-slate-400 italic text-xs">👈 نیچے عہدہ منتخب کریں (Select role below)</span>
                    )}
                    <span className="text-slate-400 font-normal"> • {branches.find((b) => b.id === branchId)?.name || 'Branch'}</span>
                  </div>
                </div>
              </div>
              
              {/* STEP 1: نام، عہدہ، برانچ اور اصلی کیمرہ تصویر */}
              {modalStep === 1 && (
                <div className="space-y-5 animate-in fade-in">
                  
                  {/* REAL CAMERA CAPTURE SECTION (FRONT & CENTER - PIC 2 REQUIREMENT) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border-2 border-cyan-500/60 shadow-xl space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2 text-cyan-300 font-extrabold text-sm">
                        <Camera className="w-5 h-5 text-cyan-400" />
                        <span>{lang === 'ur' ? 'ملازم کی اصلی تصویر (Real Camera Capture) *' : 'Capture Real Employee Photo *'}</span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/60">
                        {avatar ? '✓ Photo Ready' : 'Camera Required'}
                      </span>
                    </div>

                    {/* Hidden device camera input */}
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      ref={fileInputRef}
                      onChange={handleDeviceCameraCapture}
                      className="hidden"
                    />

                    {/* Live Stream Viewfinder */}
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="relative w-40 h-40 sm:w-44 sm:h-44 rounded-2xl overflow-hidden border-2 border-cyan-400 bg-slate-900 shadow-2xl flex items-center justify-center flex-shrink-0">
                        <video
                          ref={staffVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className={`w-full h-full object-cover scale-x-[-1] ${isLiveCameraActive ? 'block' : 'hidden'}`}
                        />

                        {!isLiveCameraActive && (
                          avatar ? (
                            <img src={avatar} alt="Captured preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-center p-3 text-cyan-400">
                              <Camera className="w-8 h-8 mb-1 animate-pulse" />
                              <span className="text-[10px] font-bold">Live Cam Frame</span>
                            </div>
                          )
                        )}

                        {isLiveCameraActive && (
                          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-950/90 border border-emerald-500 text-[9px] font-bold text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                            <span>WEBCAM ON</span>
                          </div>
                        )}
                      </div>

                      {/* Camera Controls */}
                      <div className="flex-1 space-y-2.5 w-full">
                        <p className="text-xs text-slate-300">
                          {lang === 'ur'
                            ? 'حاضری مشین کے لیے ملازم کے چہرے کی اصلی تصویر ضروری ہے تاکہ Face AI خودکار تصدیق کر سکے۔'
                            : 'Real photo is required so Face AI biometric matcher can verify this worker automatically.'}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {isLiveCameraActive ? (
                            <button
                              type="button"
                              onClick={takeLiveSnapshot}
                              className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition cursor-pointer"
                            >
                              <Camera className="w-4 h-4" />
                              <span>{lang === 'ur' ? 'ابھی تصویر کھینچیں (Snap Photo)' : 'Snap Photo Now'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={startLiveCamera}
                              disabled={cameraLoading}
                              className="py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition cursor-pointer"
                            >
                              <Camera className="w-4 h-4" />
                              <span>{cameraLoading ? 'Starting...' : (lang === 'ur' ? 'لائیو کیمرہ آن کریں' : 'Start Live Webcam')}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border-2 border-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4 text-cyan-400" />
                            <span>{lang === 'ur' ? 'موبائل کیمرے سے لیں' : 'Snap with Phone Camera'}</span>
                          </button>
                        </div>

                        {cameraError && (
                          <p className="text-[11px] text-amber-300 font-medium">{cameraError}</p>
                        )}

                        {isDetectingFace && (
                          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-xs font-semibold animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                            <span>{lang === 'ur' ? 'چہرے کے 128 فیچرز اسکین ہو رہے ہیں (Face-API)...' : 'Extracting 128D facial vectors with Face-API...'}</span>
                          </div>
                        )}

                        {faceStatusText && (
                          <div className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                            faceDescriptor
                              ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300'
                              : 'bg-amber-950/40 border-amber-500/60 text-amber-300'
                          }`}>
                            {faceDescriptor ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                            <span>{faceStatusText}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 1. EMPLOYEE NAME - ULTRA VISIBLE & HIGH CONTRAST */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border-2 border-cyan-500 shadow-xl space-y-3">
                    <label className="block text-sm sm:text-base font-black text-white flex items-center gap-2">
                      <User className="w-5 h-5 text-cyan-400" />
                      <span>{lang === 'ur' ? 'ملازم کا پورا نام درج کریں (Employee Full Name) *' : 'Employee Full Name (English) *'}</span>
                    </label>
                    <p className="text-xs text-cyan-300 font-semibold">
                      {lang === 'ur' ? 'یہاں کلک کریں اور کی بورڈ سے ملازم کا نام لکھیں:' : 'Tap below and type employee full name with keyboard:'}
                    </p>
                    <input
                      type="text"
                      value={name}
                      onFocus={handleInputFocus}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      placeholder="مثال: Ali Ahmed / طارق محمود / Muhammad"
                      className="w-full px-4 py-3.5 rounded-xl bg-slate-900 border-2 border-cyan-400 focus:border-emerald-400 text-white font-black text-base sm:text-xl shadow-inner focus:ring-4 focus:ring-cyan-500/30 outline-none placeholder:text-slate-500"
                      autoFocus
                    />

                    {/* Optional Urdu / Native Name */}
                    <div className="pt-1">
                      <span className="block text-xs font-bold text-slate-300 mb-1">
                        {lang === 'ur' ? 'نام اردو میں (اختیاری):' : 'Name in Urdu / Arabic (Optional):'}
                      </span>
                      <input
                        type="text"
                        value={nameUrdu}
                        onFocus={handleInputFocus}
                        onChange={(e) => setNameUrdu(e.target.value)}
                        placeholder="مثال: علی احمد"
                        className="w-full px-4 py-3 rounded-xl bg-slate-900 border-2 border-slate-700 text-white font-bold text-base focus:border-cyan-400 outline-none placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  {/* 2. ROLE / POST - WITH 1-TAP QUICK BUTTONS & CUSTOM INPUT */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border-2 border-cyan-500 shadow-xl space-y-3">
                    <label className="block text-sm sm:text-base font-black text-white flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-cyan-400" />
                      <span>{lang === 'ur' ? 'عہدہ یا پوسٹ درج / منتخب کریں (Job Position / Role) *' : 'Job Position / Role *'}</span>
                    </label>
                    <p className="text-xs text-cyan-300 font-semibold">
                      {lang === 'ur' ? 'نیچے سے 1 کلک میں عہدہ منتخب کریں یا کی بورڈ سے لکھیں:' : 'Tap a quick role below or type custom:'}
                    </p>

                    {/* 1-Tap Role Buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {QUICK_ROLES.map((qr) => (
                        <button
                          key={qr.role}
                          type="button"
                          onClick={() => {
                            setRole(qr.role);
                            setRoleUrdu(qr.roleUrdu);
                            setDepartment(qr.dept);
                            if (formError) setFormError(null);
                          }}
                          className={`p-3 rounded-xl text-xs font-bold border-2 transition text-center cursor-pointer ${
                            role.toLowerCase() === qr.role.toLowerCase()
                              ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black shadow-lg shadow-cyan-500/30'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          {qr.label}
                        </button>
                      ))}
                    </div>

                    {/* Custom text typing box */}
                    <div className="pt-2 space-y-1">
                      <span className="block text-xs font-bold text-slate-300">
                        {lang === 'ur' ? 'یا کی بورڈ سے کوئی دوسرا عہدہ لکھیں:' : 'Or type a custom job role:'}
                      </span>
                      <input
                        type="text"
                        value={role}
                        onFocus={handleInputFocus}
                        onChange={(e) => {
                          setRole(e.target.value);
                          if (formError) setFormError(null);
                        }}
                        placeholder="مثال: Tea Boy / کیشیئر / سیلز / منیجر / سپروائزر"
                        className="w-full px-4 py-3.5 rounded-xl bg-slate-900 border-2 border-cyan-400/80 text-white font-black text-base sm:text-lg focus:border-cyan-400 outline-none placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  {/* Branch & Employee Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        {lang === 'ur' ? 'برانچ منتخب کریں (Assigned Branch)' : 'Assigned Branch'}
                      </label>
                      <select
                        value={branchId}
                        onFocus={handleInputFocus}
                        onChange={(e) => setBranchId(e.target.value)}
                        className="w-full px-3.5 py-3 rounded-xl bg-slate-900 border-2 border-slate-700 text-white text-base focus:border-cyan-500 outline-none font-bold"
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id} className="bg-slate-950 text-white">
                            {lang === 'ur' ? b.nameUrdu : b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                      <label className="block text-xs font-bold text-slate-300 mb-1">{t.employeeNumber}</label>
                      <input
                        type="text"
                        value={empNumber}
                        onFocus={handleInputFocus}
                        onChange={(e) => setEmpNumber(e.target.value)}
                        className="w-full px-3.5 py-3 rounded-xl bg-slate-900 border-2 border-slate-700 text-cyan-400 font-mono font-bold text-base focus:border-cyan-500 outline-none"
                      />
                    </div>
                  </div>

                </div>
              )}

              {/* STEP 2: تنخواہ، اوقات کار اور 3 فنگر پرنٹس */}
              {modalStep === 2 && (
                <div className="space-y-4 animate-in fade-in">
                  
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                    <span>مرحلہ 2: تنخواہ، اوقات اور بائیو میٹرک فنگر پرنٹس (Step 2: Salary & Biometrics)</span>
                  </div>

                  {/* Base Salary & Hourly Rate */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                      <label className="block text-xs font-bold text-slate-200 mb-1">
                        {lang === 'ur' ? 'ماہانہ بنیادی تنخواہ (Base Salary)' : 'Base Monthly Salary'} (SAR)
                      </label>
                      <input
                        type="number"
                        value={baseSalary}
                        onFocus={handleInputFocus}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setBaseSalary(val);
                          setHourlyRate(Number((val / (26 * 8)).toFixed(2)));
                        }}
                        className="w-full px-3 py-3 rounded-xl bg-slate-900 border-2 border-slate-700 text-emerald-400 font-mono font-bold text-base focus:border-cyan-500 outline-none"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {lang === 'ur' ? 'ماہانہ سیلری سلپ میں درج ہوگی' : 'Used for automated payroll slip'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                      <label className="block text-xs font-bold text-slate-200 mb-1">
                        {lang === 'ur' ? 'اوور ٹائم ریٹ (Hourly Rate)' : 'Hourly Rate'} (SAR)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={hourlyRate}
                        onFocus={handleInputFocus}
                        onChange={(e) => setHourlyRate(Number(e.target.value))}
                        className="w-full px-3 py-3 rounded-xl bg-slate-900 border-2 border-slate-700 text-white font-mono font-bold text-base focus:border-cyan-500 outline-none"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {lang === 'ur' ? 'اضافی گھنٹوں کے حساب کے لیے' : 'Used for overtime computation'}
                      </span>
                    </div>
                  </div>

                  {/* Shift Timings */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <label className="block text-xs font-bold text-slate-200">
                      {lang === 'ur' ? 'ڈیوٹی کے اوقات (آمد تا روانگی)' : 'Duty Hours (Shift In - Out)'}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">آمد کا وقت (Start Time)</span>
                        <input
                          type="time"
                          value={shiftStart}
                          onFocus={handleInputFocus}
                          onChange={(e) => setShiftStart(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-base focus:border-cyan-500 outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">چھٹی کا وقت (End Time)</span>
                        <input
                          type="time"
                          value={shiftEnd}
                          onFocus={handleInputFocus}
                          onChange={(e) => setShiftEnd(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-base focus:border-cyan-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3-Fingerprint Enrollment Section */}
                  <div className="p-4 rounded-2xl bg-slate-950 border-2 border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs sm:text-sm">
                        <Fingerprint className="w-5 h-5" />
                        <span>{t.fingerEnrollment}</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {lang === 'ur' ? '3 انگلیاں محفوظ کریں (اگر 1 خراب ہو تو دوسری چلے)' : '3 Fingerprint backup'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {[1, 2, 3].map((idx) => {
                        const fingerIndex = idx as 1 | 2 | 3;
                        const enrolled = fingers.find((f) => f.fingerIndex === fingerIndex);
                        const isScanningThis = enrollingFingerIndex === fingerIndex;

                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border flex flex-col justify-between space-y-2 transition ${
                              enrolled
                                ? 'bg-cyan-950/20 border-cyan-500/40'
                                : 'bg-slate-900 border-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-white">
                                {idx === 1 ? t.finger1 : idx === 2 ? t.finger2 : t.finger3}
                              </span>
                              {enrolled ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {enrolled.quality}%
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500">{t.fingerNotEnrolled}</span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleEnrollFinger(fingerIndex)}
                              disabled={isScanningThis}
                              className={`w-full py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                enrolled
                                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md'
                              }`}
                            >
                              <Fingerprint className="w-3.5 h-3.5" />
                              <span>
                                {isScanningThis
                                  ? (lang === 'ur' ? 'اسکیننگ...' : 'Scanning...')
                                  : enrolled
                                  ? (lang === 'ur' ? 'دوبارہ درج کریں' : 'Re-scan')
                                  : t.enrollNow}
                              </span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Smart Card RFID & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">{t.smartCardCode}</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={cardId}
                          onChange={(e) => setCardId(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-cyan-400 font-mono text-sm focus:border-cyan-500 outline-none font-bold"
                        />
                        <button
                          type="button"
                          onClick={handleGenerateCard}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold transition cursor-pointer"
                          title="Generate New Card ID"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {lang === 'ur' ? '4 ہندسوں کا پن کوڈ (Offline PIN Code) *' : '4-Digit PIN Passcode *'}
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={pinCode}
                        onFocus={handleInputFocus}
                        onChange={(e) => setPinCode(e.target.value)}
                        placeholder="مثال: 1234"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 font-mono font-bold text-sm focus:border-cyan-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Phone Native Biometrics (WebAuthn TouchID / FaceID) */}
                  {hasPlatformBiometrics && (
                    <div className="p-3.5 rounded-2xl bg-slate-950 border-2 border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                          <Smartphone className="w-4 h-4 text-cyan-400" />
                          <span>{lang === 'ur' ? 'موبائل فون بائیو میٹرک سنسر (TouchID / FaceID)' : 'Phone Hardware Biometrics (TouchID / FaceID)'}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${webAuthnRegistered ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'}`}>
                          {webAuthnRegistered ? '✓ Linked' : 'Optional'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {lang === 'ur'
                          ? 'ملازم اپنے فون کا فنگر پرنٹ یا فیس ان لاک استعمال کر کے 1 سیکنڈ میں حاضر ہو سکتا ہے۔'
                          : 'Pair employee with phone hardware sensor for secure touch attendance.'}
                      </p>
                      <button
                        type="button"
                        disabled={isRegisteringWebAuthn}
                        onClick={handleRegisterPhoneBiometrics}
                        className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <Fingerprint className="w-4 h-4 text-cyan-400" />
                        <span>{isRegisteringWebAuthn ? 'Prompting Phone Sensor...' : (webAuthnRegistered ? '✓ Phone Biometric Linked (Tap to Re-pair)' : 'Link Phone TouchID / FaceID')}</span>
                      </button>
                    </div>
                  )}

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {lang === 'ur' ? 'موبائل نمبر (اختیاری)' : 'Phone Number (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+966 50 000 0000"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-cyan-500 outline-none"
                    />
                  </div>

                </div>
              )}

            </form>

            {/* STICKY MODAL FOOTER */}
            <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-900 sticky bottom-0 z-10 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  stopLiveCamera();
                  setIsModalOpen(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm transition cursor-pointer"
              >
                {t.cancel}
              </button>

              <div className="flex items-center gap-2">
                {modalStep === 2 && (
                  <button
                    type="button"
                    onClick={() => setModalStep(1)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm transition cursor-pointer"
                  >
                    {lang === 'ur' ? '← پچھلا مرحلہ (نام و تصویر)' : '← Back to Name & Photo'}
                  </button>
                )}

                {modalStep === 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!name.trim()) {
                        setFormError(lang === 'ur' ? '⚠️ براہ کرم پہلے ملازم کا نام درج کریں!' : '⚠️ Please enter employee name first!');
                        return;
                      }
                      if (!role.trim()) {
                        setFormError(lang === 'ur' ? '⚠️ براہ کرم ملازم کا عہدہ / پوسٹ منتخب یا درج کریں!' : '⚠️ Please select or type employee role first!');
                        return;
                      }
                      setFormError(null);
                      setModalStep(2);
                    }}
                    className="px-5 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-cyan-500/25 transition cursor-pointer"
                  >
                    {lang === 'ur' ? 'اگلا مرحلہ: تنخواہ اور فنگر پرنٹس →' : 'Next Step: Salary & Biometrics →'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => handleSave(e as unknown as React.FormEvent)}
                    className="px-5 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t.saveEmployee}</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Printable Smart Card Badge Preview */}
      {printingBadgeEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100 space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-cyan-400" />
                <span>Smart RFID Badge Card</span>
              </span>
              <button
                onClick={() => setPrintingBadgeEmp(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Smart Card Visual for printing */}
            <div className="print-card p-6 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 border-2 border-cyan-500/40 shadow-2xl flex flex-col items-center text-center space-y-4">
              <div className="flex items-center justify-between w-full">
                <span className="font-extrabold text-cyan-400 text-xs tracking-wider">BIOTIME CLOUD PASS</span>
                <span className="font-mono text-[10px] text-slate-400">{printingBadgeEmp.empNumber}</span>
              </div>

              <img
                src={printingBadgeEmp.avatar}
                alt={printingBadgeEmp.name}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-cyan-400 shadow-lg"
              />

              <div className="space-y-1">
                <h4 className="font-extrabold text-lg text-white">
                  {lang === 'ur' ? printingBadgeEmp.nameUrdu || printingBadgeEmp.name : printingBadgeEmp.name}
                </h4>
                <p className="text-xs text-cyan-300 font-semibold">{printingBadgeEmp.role}</p>
                <p className="text-[11px] text-slate-400">{printingBadgeEmp.department}</p>
              </div>

              {/* Genuine Scannable QR Code Badge */}
              <div className="w-full pt-3 border-t border-slate-800 flex flex-col items-center space-y-2">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{lang === 'ur' ? 'حاضری کے لیے اسمارٹ کیو آر کوڈ' : 'Official Attendance QR Pass'}</span>
                </span>

                {printingBadgeEmp.qrCodeDataUrl ? (
                  <img
                    src={printingBadgeEmp.qrCodeDataUrl}
                    alt="Employee QR Pass"
                    className="w-36 h-36 bg-white p-2 rounded-2xl border-2 border-cyan-400 shadow-xl object-contain"
                  />
                ) : (
                  <div className="w-32 h-32 bg-white rounded-xl flex items-center justify-center p-2 text-slate-950 font-mono font-bold text-xs text-center">
                    QR: {printingBadgeEmp.empNumber}
                  </div>
                )}

                <div className="font-mono text-xs tracking-widest text-cyan-300 font-bold bg-slate-900/90 px-3 py-1 rounded-lg border border-slate-700">
                  ID: #{printingBadgeEmp.empNumber} • {printingBadgeEmp.cardId}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPrintingBadgeEmp(null)}
                className="py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{lang === 'ur' ? 'پرنٹ کریں' : 'Print Card'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
