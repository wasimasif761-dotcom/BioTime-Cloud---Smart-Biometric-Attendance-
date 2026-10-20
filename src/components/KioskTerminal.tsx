import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Fingerprint, 
  CreditCard, 
  KeyRound, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Building2, 
  Sparkles, 
  UserCheck, 
  LogOut, 
  LogIn, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  ScanLine, 
  ShieldCheck, 
  ChevronRight, 
  User, 
  Radio, 
  LayoutDashboard,
  QrCode,
  Smartphone,
  AlertCircle,
  UserPlus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Employee, AttendanceRecord, Branch, SystemSettings } from '../types';
import { sound } from '../utils/audio';
import { translations, Language } from '../utils/i18n';
import { 
  detectAndComputeFaceDescriptor, 
  matchFaceAgainstEmployees, 
  loadFaceModels 
} from '../utils/faceRecognition';
import { scanQrFromVideoFrame, verifyPhoneBiometrics, isPlatformBiometricsAvailable } from '../utils/qrBadge';

interface KioskTerminalProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  branches: Branch[];
  currentBranchId: string;
  onBranchChange: (branchId: string) => void;
  settings: SystemSettings;
  lang: Language;
  onPunchSuccess: (record: AttendanceRecord, isNewIn: boolean) => void;
  onOpenAdmin?: () => void;
  onAddStaff?: () => void;
}

export const KioskTerminal: React.FC<KioskTerminalProps> = ({
  employees,
  attendance,
  branches,
  currentBranchId,
  onBranchChange,
  settings,
  lang,
  onPunchSuccess,
  onOpenAdmin,
  onAddStaff,
}) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'face' | 'fingerprint' | 'card' | 'pin'>('face');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanningFace, setIsScanningFace] = useState(false);
  const [faceScanStatus, setFaceScanStatus] = useState<string | null>(null);
  const [faceErrorNotice, setFaceErrorNotice] = useState<string | null>(null);

  // Phone Biometrics & PIN state
  const [hasPhoneSensor, setHasPhoneSensor] = useState(false);
  const [isVerifyingPhoneBio, setIsVerifyingPhoneBio] = useState(false);
  const [cardInput, setCardInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [qrScanningActive, setQrScanningActive] = useState(false);

  // Selected Employee for simulation/testing
  const [selectedEmpId, setSelectedEmpId] = useState<string>(() => employees[0]?.id || '');
  const selectedEmployeeObj = employees.find((e) => e.id === selectedEmpId) || employees[0];

  useEffect(() => {
    if (!selectedEmpId && employees.length > 0) {
      setSelectedEmpId(employees[0].id);
    }
  }, [employees, selectedEmpId]);

  // Modal / Feedback state
  const [lastPunchResult, setLastPunchResult] = useState<{
    employee: Employee;
    action: 'IN' | 'OUT';
    time: string;
    record: AttendanceRecord;
    message: string;
  } | null>(null);

  const [promptOutEmployee, setPromptOutEmployee] = useState<{
    employee: Employee;
    existingRecord: AttendanceRecord;
  } | null>(null);

  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled);

  const currentBranch = branches.find((b) => b.id === currentBranchId) || branches[0];

  // Clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync sound setting
  useEffect(() => {
    sound.enabled = soundEnabled;
  }, [soundEnabled]);

  // Check phone platform biometrics
  useEffect(() => {
    isPlatformBiometricsAvailable().then(setHasPhoneSensor);
  }, []);

  // Camera stream state & native shutter
  const streamRef = useRef<MediaStream | null>(null);
  const faceFileInputRef = useRef<HTMLInputElement | null>(null);
  const [capturedRealFacePhoto, setCapturedRealFacePhoto] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Attach camera stream to video element whenever stream changes or video is ready
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch((err) => {
        console.warn('Video play warning:', err);
      });
    }
  }, [cameraStream, cameraActive, activeTab]);

  // Robust Camera Starter
  const startCameraStream = async () => {
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

      streamRef.current = stream;
      setCameraStream(stream);
      setCameraActive(true);
      setCameraLoading(false);
    } catch (err: unknown) {
      console.warn('Camera stream error:', err);
      setCameraActive(false);
      setCameraLoading(false);
      setCameraError(
        lang === 'ur'
          ? 'براؤزر نے کیمرہ بلاک کیا۔ براہ کرم براؤزر کی اجازت دیں یا نیچے دیے گئے بٹن سے تصویر کھینچیں!'
          : 'Browser camera permission required. Tap "Start Live Camera" or use device camera below!'
      );
    }
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  // Keep camera running for Face AI and QR Code Badge Scanner
  useEffect(() => {
    if (activeTab === 'face' || activeTab === 'card') {
      startCameraStream();
    } else {
      stopCameraStream();
    }

    return () => {
      stopCameraStream();
    };
  }, [activeTab]);

  // Real-time camera QR scanner loop when 'card' tab is active
  useEffect(() => {
    if (activeTab !== 'card' || !cameraActive) return;

    let animFrame: number;
    let lastScanTime = 0;
    const qrCanvas = document.createElement('canvas');

    const scanQrLoop = (time: number) => {
      // Throttle to every 200ms for smooth performance
      if (time - lastScanTime > 200) {
        lastScanTime = time;
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          const decoded = scanQrFromVideoFrame(videoRef.current, qrCanvas);
          if (decoded) {
            handleCardSwipe(decoded);
            // cooldown pause
            setTimeout(() => {
              animFrame = requestAnimationFrame(scanQrLoop);
            }, 2000);
            return;
          }
        }
      }
      animFrame = requestAnimationFrame(scanQrLoop);
    };

    animFrame = requestAnimationFrame(scanQrLoop);

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [activeTab, cameraActive, employees, attendance]);

  // Handle native mobile device camera snap with real face-api recognition
  const handleNativeFaceCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const photoData = event.target?.result as string;
        if (photoData) {
          setCapturedRealFacePhoto(photoData);
          setIsScanningFace(true);
          setFaceScanStatus(lang === 'ur' ? 'چہرہ شناخت ہو رہا ہے...' : 'Verifying face photo...');
          setFaceErrorNotice(null);
          sound.playCameraSnap();

          const img = new Image();
          img.onload = async () => {
            try {
              const detected = await detectAndComputeFaceDescriptor(img);
              setIsScanningFace(false);
              setFaceScanStatus(null);

              if (!detected) {
                sound.playError();
                setFaceErrorNotice(
                  lang === 'ur'
                    ? '❌ تصویر میں چہرہ واضح نہیں ملا۔ براہ کرم کیمرے کے سامنے سیدھا رکھ کر تصویر لیں۔'
                    : '❌ No face detected in the photo. Please face camera clearly in good light.'
                );
                return;
              }

              const match = matchFaceAgainstEmployees(detected.descriptor, employees, 0.52);
              if (match) {
                executePunch(
                  match.employee, 
                  'face', 
                  `Phone Camera AI (${match.confidencePercent}%)`, 
                  photoData,
                  match.confidencePercent
                );
              } else {
                sound.playError();
                setFaceErrorNotice(
                  lang === 'ur'
                    ? '❌ نامعلوم چہرہ! تصویر سسٹم کے رجسٹرڈ ملازمین سے میچ نہیں ہوئی۔'
                    : '❌ Unknown Face! Photo does not match any enrolled employee in database.'
                );
              }
            } catch (err) {
              console.warn('Native face error:', err);
              setIsScanningFace(false);
              setFaceScanStatus(null);
            }
          };
          img.src = photoData;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper to format date & time string
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(lang === 'ur' ? 'ur-PK' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(lang === 'ur' ? 'ur-PK' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Find today's record for employee in current branch / enterprise
  const getTodayRecordForEmployee = (empId: string): AttendanceRecord | undefined => {
    const todayStr = new Date().toISOString().split('T')[0];
    return attendance.find((r) => r.employeeId === empId && r.date === todayStr);
  };

  // Process Punch Execution
  const executePunch = (
    employee: Employee, 
    method: 'face' | 'qr' | 'pin' | 'webauthn' | 'fingerprint' | 'card', 
    extraDetails?: string,
    photoSnapshot?: string,
    faceConfidence?: number
  ) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const nowTimeStr = new Date().toTimeString().split(' ')[0]; // HH:MM:SS
    const existing = getTodayRecordForEmployee(employee.id);

    // Case 1: Employee already punched IN today and has not punched OUT yet -> Prompt or auto Out
    if (existing && !existing.timeOut) {
      setPromptOutEmployee({
        employee,
        existingRecord: existing,
      });
      return;
    }

    // Case 2: Employee already punched both IN and OUT today
    if (existing && existing.timeOut) {
      sound.playError();
      alert(
        lang === 'ur'
          ? `${employee.nameUrdu || employee.name} کا آج کا پورا ریکارڈ (ان: ${existing.timeIn}، آؤٹ: ${existing.timeOut}) پہلے سے مکمل ہے۔`
          : `${employee.name} has already completed attendance today! (In: ${existing.timeIn}, Out: ${existing.timeOut})`
      );
      return;
    }

    // Case 3: Fresh PUNCH IN
    // Calculate if late based on employee's actual shiftStart saved in IndexedDB
    const [shiftHour, shiftMinute] = (employee.shiftStart || settings.defaultShiftStart).split(':').map(Number);
    const punchDate = new Date();
    const shiftStartDate = new Date();
    shiftStartDate.setHours(shiftHour, shiftMinute + settings.lateGracePeriodMinutes, 0, 0);

    const isLate = punchDate > shiftStartDate;
    const lateMinutes = isLate ? Math.max(0, Math.floor((punchDate.getTime() - (shiftStartDate.getTime() - settings.lateGracePeriodMinutes * 60000)) / 60000)) : 0;

    const newRecord: AttendanceRecord = {
      id: `att_${Date.now()}_${employee.empNumber}`,
      employeeId: employee.id,
      empNumber: employee.empNumber,
      employeeName: employee.name,
      branchId: currentBranch.id,
      branchName: currentBranch.name,
      date: todayStr,
      timeIn: nowTimeStr,
      timeOut: null,
      methodIn: method,
      status: isLate ? 'late' : 'present',
      hoursWorked: 0,
      overtimeHours: 0,
      lateMinutes,
      fingerUsed: extraDetails,
      faceConfidence,
      photoIn: photoSnapshot || (method === 'face' ? (capturedRealFacePhoto || employee.avatar) : undefined),
    };

    sound.playSuccessIn();
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#06b6d4', '#3b82f6', '#10b981'],
    });

    setLastPunchResult({
      employee,
      action: 'IN',
      time: nowTimeStr,
      record: newRecord,
      message: isLate
        ? (lang === 'ur' ? `خوش آمدید! آپ ${lateMinutes} منٹ تاخیر سے آئے ہیں۔` : `Welcome! You are ${lateMinutes}m late.`)
        : (lang === 'ur' ? 'خوش آمدید! وقت پر حاضری درج ہوگئی۔' : 'Welcome! Clocked in on time.'),
    });

    onPunchSuccess(newRecord, true);
  };

  // Confirm Punch OUT
  const confirmPunchOut = (employee: Employee, existingRecord: AttendanceRecord) => {
    const nowTimeStr = new Date().toTimeString().split(' ')[0];
    
    // Calculate hours worked
    const [inH, inM, inS] = existingRecord.timeIn.split(':').map(Number);
    const [outH, outM, outS] = nowTimeStr.split(':').map(Number);
    
    const inTotalHours = inH + inM / 60 + inS / 3600;
    const outTotalHours = outH + outM / 60 + outS / 3600;
    const hoursWorked = Math.max(0.1, Number((outTotalHours - inTotalHours).toFixed(2)));

    // Standard shift length e.g. 9 hours
    const standardHours = 9.0;
    const overtimeHours = hoursWorked > standardHours ? Number((hoursWorked - standardHours).toFixed(2)) : 0;

    const updatedRecord: AttendanceRecord = {
      ...existingRecord,
      timeOut: nowTimeStr,
      methodOut: activeTab === 'card' ? 'qr' : (activeTab as any),
      hoursWorked,
      overtimeHours,
      status: overtimeHours > 0 ? 'overtime' : existingRecord.status,
    };

    sound.playSuccessOut();
    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.7 },
      colors: ['#10b981', '#f59e0b', '#3b82f6'],
    });

    setPromptOutEmployee(null);
    setLastPunchResult({
      employee,
      action: 'OUT',
      time: nowTimeStr,
      record: updatedRecord,
      message: lang === 'ur'
        ? `الوداع! کل وقت: ${hoursWorked} گھنٹے ${overtimeHours > 0 ? `(${overtimeHours} گھنٹے اوور ٹائم)` : ''}`
        : `Goodbye! Worked: ${hoursWorked} hrs ${overtimeHours > 0 ? `(${overtimeHours}h OT)` : ''}`,
    });

    onPunchSuccess(updatedRecord, false);
  };

  // Trigger Real Offline Face Scan
  const handleFaceScan = async () => {
    setFaceErrorNotice(null);

    if (employees.length === 0) {
      sound.playError();
      setFaceErrorNotice(
        lang === 'ur'
          ? 'ڈیٹا بیس میں کوئی ملازم درج نہیں ہے۔ پہلے ایڈمن میں ملازم کا اندراج کریں!'
          : 'No employees enrolled in database yet. Please enroll staff in Admin first!'
      );
      return;
    }

    if (!cameraActive) {
      await startCameraStream();
    }

    if (!videoRef.current) {
      setFaceErrorNotice(lang === 'ur' ? 'کیمرہ لوڈ نہیں ہوا' : 'Camera not initialized');
      return;
    }

    setIsScanningFace(true);
    setFaceScanStatus(lang === 'ur' ? 'چہرہ شناخت ہو رہا ہے...' : 'Detecting face & computing vector...');
    sound.playFingerSweep();

    try {
      // Real Face Detection & Embedding Computation
      const detected = await detectAndComputeFaceDescriptor(videoRef.current);

      if (!detected) {
        sound.playError();
        setIsScanningFace(false);
        setFaceScanStatus(null);
        setFaceErrorNotice(
          lang === 'ur'
            ? '❌ کوئی چہرہ نظر نہیں آیا! براہ کرم چہرہ کیمرے کے بالکل سامنے رکھیں اور روشنی چیک کریں۔'
            : '❌ No face detected! Please face the camera directly in clear lighting.'
        );
        return;
      }

      // Snapshot to canvas
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 480;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      let snappedPhoto: string | undefined = undefined;
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        snappedPhoto = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedRealFacePhoto(snappedPhoto);
      }

      // Match against all saved employees in IndexedDB
      setFaceScanStatus(lang === 'ur' ? 'ملازمین کے بائیو میٹرک ریکارڈ سے میچنگ...' : 'Matching against IndexedDB...');
      const match = matchFaceAgainstEmployees(detected.descriptor, employees, 0.52);

      sound.playCameraSnap();
      setIsScanningFace(false);
      setFaceScanStatus(null);

      if (match) {
        executePunch(
          match.employee, 
          'face', 
          `Face AI (${match.confidencePercent}% match)`, 
          snappedPhoto,
          match.confidencePercent
        );
      } else {
        sound.playError();
        setFaceErrorNotice(
          lang === 'ur'
            ? '❌ نامعلوم چہرہ! یہ شخص ملازمین کے ریکارڈ میں رجسٹرڈ نہیں ہے۔'
            : '❌ Unknown Face! This person is not registered in the employee database.'
        );
      }
    } catch (err) {
      console.error('Face recognition error:', err);
      sound.playError();
      setIsScanningFace(false);
      setFaceScanStatus(null);
      setFaceErrorNotice(lang === 'ur' ? 'چہرہ اسکین کرنے میں ایرر آیا' : 'Face recognition error');
    }
  };

  // Trigger Phone Native Biometric Punch (WebAuthn TouchID / FaceID)
  const handlePhoneBiometricScan = async () => {
    setIsVerifyingPhoneBio(true);
    sound.playFingerSweep();

    try {
      const verified = await verifyPhoneBiometrics();
      if (verified) {
        // Find employee with webauthn or single active employee
        const paired = employees.filter((e) => e.webAuthnId);
        if (paired.length > 0) {
          executePunch(paired[0], 'webauthn', 'Phone Biometric TouchID Verified');
        } else if (employees.length > 0) {
          executePunch(employees[0], 'webauthn', 'Phone Biometric Verified');
        } else {
          sound.playError();
          alert(lang === 'ur' ? 'ڈیٹا بیس میں کوئی ملازم نہیں ملا' : 'No employee found in database');
        }
      } else {
        sound.playError();
        alert(lang === 'ur' ? 'فون بائیو میٹرک کینسل یا تصدیق ناکام' : 'Phone biometric cancelled or failed');
      }
    } catch {
      sound.playError();
    } finally {
      setIsVerifyingPhoneBio(false);
    }
  };

  // Trigger QR Code / RFID Card Scan
  const handleCardSwipe = (cardCode: string) => {
    sound.playCardBeep();
    const codeToSearch = cardCode.trim().toUpperCase();
    
    // Match against empNumber or cardId in IndexedDB
    const matched = employees.find(
      (e) => e.cardId.toUpperCase() === codeToSearch || e.empNumber.toUpperCase() === codeToSearch
    );
    
    if (matched) {
      executePunch(matched, 'qr', `QR Pass: ${codeToSearch}`);
      setCardInput('');
    } else {
      sound.playError();
      alert(lang === 'ur' ? 'کیو آر بیج نہیں ملا! براہ کرم ملازم نمبر چیک کریں۔' : 'QR Badge not recognized! Check employee number.');
    }
  };

  // Trigger PIN Punch
  const handlePinSubmit = (pin: string) => {
    const code = pin.trim();
    const matched = employees.find((e) => e.pinCode === code || e.empNumber === code);
    if (matched) {
      executePunch(matched, 'pin', `PIN Code: ${code}`);
      setPinInput('');
    } else {
      sound.playError();
      alert(lang === 'ur' ? 'ملازم نمبر یا پن کوڈ غلط ہے!' : 'Invalid Employee ID or PIN Passcode!');
    }
  };

  // Live Stats for Today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecords = attendance.filter((r) => r.date === todayStr);
  const clockedInCount = todayRecords.filter((r) => !r.timeOut).length;
  const clockedOutCount = todayRecords.filter((r) => r.timeOut).length;
  const lateCount = todayRecords.filter((r) => r.status === 'late').length;

  return (
    <div className="relative w-full max-w-7xl mx-auto space-y-6">
      {/* Top Biometric Kiosk Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex-shrink-0">
            <ScanLine className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sm sm:text-base md:text-lg tracking-tight text-white truncate">
                {lang === 'ur' ? currentBranch.nameUrdu : currentBranch.name}
              </h2>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800/50 flex-shrink-0">
                {currentBranch.terminalCode}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></span>
              <span className="truncate">{t.onlineNotice}</span>
            </p>
          </div>
        </div>

        {/* Live Digital Clock HUD */}
        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
          <div className="text-left sm:text-right">
            <div className="font-mono text-xl sm:text-2xl md:text-3xl font-extrabold text-cyan-400 tracking-wider">
              {formatTime(currentTime)}
            </div>
            <div className="text-[10px] sm:text-xs text-slate-400 font-medium truncate">
              {formatDate(currentTime)}
            </div>
          </div>

          <div className="flex items-center gap-2 pl-2 sm:pl-4 border-l border-slate-800">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition flex-shrink-0"
              title={soundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />}
            </button>

            {/* Direct Admin Access Button */}
            {onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 font-bold text-xs border border-cyan-800/60 shadow-sm transition cursor-pointer flex-shrink-0"
                title="Go to Headquarters Admin"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>{lang === 'ur' ? 'ایڈمن ڈیش بورڈ' : 'Admin HQ'}</span>
              </button>
            )}

            {/* Quick Add Staff Button on Kiosk Header - Always Visible */}
            <button
              onClick={() => {
                if (onAddStaff) onAddStaff();
                else if (onOpenAdmin) onOpenAdmin();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-md shadow-cyan-500/25 transition cursor-pointer flex-shrink-0"
              title="Add New Employee"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{lang === 'ur' ? '+ نیا ملازم' : '+ Add Staff'}</span>
            </button>

            {/* Branch Switcher for multi-branch operation */}
            <div className="relative">
              <select
                value={currentBranchId}
                onChange={(e) => onBranchChange(e.target.value)}
                className="appearance-none bg-slate-800/90 border border-slate-700 hover:border-slate-600 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 pr-7 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer max-w-[130px] sm:max-w-none truncate"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                    {lang === 'ur' ? b.nameUrdu : b.name}
                  </option>
                ))}
              </select>
              <Building2 className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Terminal Frame */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Biometric Punch Station (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Method Selection Tabs */}
          <div className="grid grid-cols-4 gap-2 p-1.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <button
              onClick={() => setActiveTab('face')}
              className={`flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-2 py-3 px-2 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                activeTab === 'face'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>{lang === 'ur' ? 'چہرہ شناخت' : 'Face AI'}</span>
            </button>

            <button
              onClick={() => setActiveTab('fingerprint')}
              className={`flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-2 py-3 px-2 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                activeTab === 'fingerprint'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Fingerprint className="w-4 h-4" />
              <span>{lang === 'ur' ? 'فنگر پرنٹ' : 'Fingerprint'}</span>
            </button>

            <button
              onClick={() => setActiveTab('card')}
              className={`flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-2 py-3 px-2 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                activeTab === 'card'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>{lang === 'ur' ? 'اسمارٹ کارڈ' : 'RFID Card'}</span>
            </button>

            <button
              onClick={() => setActiveTab('pin')}
              className={`flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-2 py-3 px-2 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                activeTab === 'pin'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>{lang === 'ur' ? 'ملازم کوڈ / پن' : 'PIN / Code'}</span>
            </button>
          </div>

          {/* Interactive Biometric Screen Container */}
          <div className="relative rounded-3xl bg-slate-900 border-2 border-slate-800 p-6 md:p-8 min-h-[460px] flex flex-col items-center justify-center overflow-hidden shadow-2xl">
            {/* Ambient background glow */}
            <div className="absolute inset-0 bg-radial from-cyan-500/5 via-transparent to-transparent pointer-events-none" />

            {/* TAB 1: Face Recognition Scanner */}
            {activeTab === 'face' && (
              <div className="w-full max-w-md flex flex-col items-center space-y-4">
                
                {/* Hidden native mobile camera input (100% works across all phones) */}
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  ref={faceFileInputRef}
                  onChange={handleNativeFaceCapture}
                  className="hidden"
                />

                <div className="relative w-64 h-64 md:w-72 md:h-72 rounded-3xl overflow-hidden border-2 border-cyan-500/50 shadow-2xl bg-slate-950 flex items-center justify-center">
                  
                  {/* The video element is ALWAYS mounted in DOM so ref and srcObject are never lost */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover scale-x-[-1] ${cameraActive ? 'block' : 'hidden'}`}
                  />

                  {/* Active Live Indicator Badge */}
                  {cameraActive && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 border border-emerald-500/40 text-[10px] font-bold text-emerald-400 backdrop-blur-md">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>LIVE CAMERA ACTIVE</span>
                    </div>
                  )}

                  {!cameraActive && (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-slate-950 space-y-2.5">
                      {capturedRealFacePhoto ? (
                        <div className="relative">
                          <img
                            src={capturedRealFacePhoto}
                            alt="Real captured face"
                            className="w-24 h-24 rounded-2xl object-cover border-2 border-emerald-400 shadow-md"
                          />
                          <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500 text-slate-950">
                            REAL PHOTO
                          </span>
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-slate-900 border-2 border-dashed border-cyan-500/40 flex flex-col items-center justify-center text-cyan-400">
                          <Camera className="w-7 h-7 mb-1 animate-pulse" />
                          <span className="text-[10px] font-bold">Face Cam</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={startCameraStream}
                        disabled={cameraLoading}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>{cameraLoading ? 'Starting...' : (lang === 'ur' ? 'کیمرہ آن کریں' : 'Start Live Camera')}</span>
                      </button>

                      <span className="text-[11px] text-slate-400">
                        {lang === 'ur' ? 'یا نیچے موبائل کیمرہ استعمال کریں' : 'Or use device camera below'}
                      </span>
                    </div>
                  )}

                  {/* High Tech Face HUD Brackets */}
                  <div className="absolute inset-4 pointer-events-none">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan-400 rounded-tl-xl"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan-400 rounded-tr-xl"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan-400 rounded-bl-xl"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan-400 rounded-br-xl"></div>
                  </div>

                  {/* Sweeping Laser Line when scanning */}
                  <div className={`absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] pointer-events-none ${
                    isScanningFace ? 'animate-scanline' : 'top-1/2 opacity-30'
                  }`} />

                  {/* Face Mesh Center Circle */}
                  <div className="absolute w-20 h-20 rounded-full border border-cyan-400/40 border-dashed animate-spin pointer-events-none" />
                </div>

                {/* Subtitle / Instructions */}
                <div className="text-center space-y-1">
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>{t.alignFace}</span>
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs">
                    {lang === 'ur'
                      ? 'AI چہرہ ملا کر فورا حاضری یا روانگی درج کر دے گا'
                      : 'AI facial matching automatically verifies staff profile & logs entry'}
                  </p>
                </div>

                {/* Camera Control Action Buttons */}
                <div className="w-full max-w-sm space-y-2">
                  {/* Primary Scan Button */}
                  <button
                    onClick={handleFaceScan}
                    disabled={isScanningFace}
                    className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-sm shadow-xl shadow-cyan-500/25 transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                    <span>
                      {isScanningFace 
                        ? (lang === 'ur' ? 'اسکین جاری ہے...' : 'Verifying Face...') 
                        : (lang === 'ur' ? 'چہرہ اسکین کریں (Scan Face)' : 'Scan Face (AI Punch)')}
                    </span>
                  </button>

                  {/* Secondary buttons: Turn on live stream or take phone photo */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={startCameraStream}
                      disabled={cameraLoading}
                      className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{cameraLoading ? 'Starting...' : (lang === 'ur' ? 'لائیو کیمرہ آن کریں' : 'Open Live Camera')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => faceFileInputRef.current?.click()}
                      className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{lang === 'ur' ? 'موبائل کیمرہ کھولیں' : 'Phone Camera Snap'}</span>
                    </button>
                  </div>

                  {cameraError && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-center text-[11px] leading-relaxed">
                      {cameraError}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 2: Phone Native Biometrics (WebAuthn TouchID / FaceID) */}
            {activeTab === 'fingerprint' && (
              <div className="w-full max-w-md flex flex-col items-center space-y-6">
                
                {/* Hardware Sensor Status Banner */}
                <div className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-1">
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-white">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>{lang === 'ur' ? 'موبائل فون کا اپنا بائیو میٹرک سینسر (Touch ID / Face ID)' : 'Phone Built-in Biometric Sensor (Touch ID / Face ID)'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {hasPhoneSensor
                      ? (lang === 'ur' ? '✓ آپ کے فون کا بائیو میٹرک سینسر تیار ہے' : '✓ Hardware biometric sensor is available on this phone')
                      : (lang === 'ur' ? 'ویب آتھن / فون ان لاک سینسر یا نیچے پن کوڈ استعمال کریں' : 'WebAuthn biometric or 4-digit PIN fallback')}
                  </p>
                </div>

                {/* Tactile Touch Sensor Glass Prism */}
                <div
                  onClick={handlePhoneBiometricScan}
                  className={`relative group flex flex-col items-center justify-center w-52 h-52 rounded-3xl border-2 transition-all duration-300 cursor-pointer ${
                    isVerifyingPhoneBio
                      ? 'border-emerald-400 bg-emerald-950/40 shadow-[0_0_35px_rgba(16,185,129,0.4)] scale-105'
                      : 'border-slate-700 bg-slate-950 hover:border-emerald-500/70 hover:bg-slate-900 shadow-xl'
                  }`}
                >
                  {isVerifyingPhoneBio && (
                    <div className="absolute inset-0 rounded-3xl border-2 border-emerald-400 animate-ripple pointer-events-none" />
                  )}

                  <Fingerprint className={`w-28 h-28 transition-all duration-300 ${
                    isVerifyingPhoneBio ? 'text-emerald-400 scale-110 drop-shadow-[0_0_15px_#10b981]' : 'text-slate-400 group-hover:text-emerald-400'
                  }`} />

                  {isVerifyingPhoneBio ? (
                    <div className="absolute bottom-3 text-xs font-mono font-bold text-emerald-300 animate-pulse">
                      VERIFYING SENSOR...
                    </div>
                  ) : (
                    <span className="absolute bottom-3 text-[11px] text-slate-400 group-hover:text-emerald-300 font-semibold">
                      {lang === 'ur' ? 'تصدیق کے لیے ٹیپ کریں' : 'Tap to Verify Sensor'}
                    </span>
                  )}
                </div>

                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-white">
                    {lang === 'ur' ? 'فون کا فنگر پرنٹ یا چہرہ لاک استعمال کریں' : 'Scan Phone Biometric (Touch ID / Face ID)'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {lang === 'ur'
                      ? 'کسی بیرونی مشین کی ضرورت نہیں، فون کے اپنے بائیو میٹرک سینسر سے حاضری درج ہوتی ہے'
                      : 'Secure, offline WebAuthn phone verification without external hardware'}
                  </p>
                </div>

                <div className="w-full max-w-xs space-y-2">
                  <button
                    onClick={handlePhoneBiometricScan}
                    disabled={isVerifyingPhoneBio}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-500 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-500/25 transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Fingerprint className="w-5 h-5" />
                    <span>
                      {isVerifyingPhoneBio 
                        ? (lang === 'ur' ? 'سینسر چیک ہو رہا ہے...' : 'Checking Sensor...') 
                        : (lang === 'ur' ? 'موبائل فنگر پرنٹ سے حاضری لگائیں' : 'Punch with Phone Biometric')}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('pin')}
                    className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>{lang === 'ur' ? 'یا 4 ہندسوں کا پن کوڈ استعمال کریں' : 'Or use 4-digit PIN Code'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: Real Camera QR Code Badge Scanner */}
            {activeTab === 'card' && (
              <div className="w-full max-w-md flex flex-col items-center space-y-4">
                
                {/* Camera Viewfinder with QR Reticle Box */}
                <div className="relative w-64 h-64 md:w-72 md:h-72 rounded-3xl overflow-hidden border-2 border-purple-500/50 shadow-2xl bg-slate-950 flex items-center justify-center">
                  
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                  />

                  {/* Active Live Indicator Badge */}
                  {cameraActive && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 border border-purple-500/40 text-[10px] font-bold text-purple-400 backdrop-blur-md">
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
                      <span>QR SCANNER ACTIVE</span>
                    </div>
                  )}

                  {!cameraActive && (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-slate-950 space-y-2.5">
                      <div className="w-20 h-20 rounded-2xl bg-slate-900 border-2 border-dashed border-purple-500/40 flex flex-col items-center justify-center text-purple-400">
                        <QrCode className="w-8 h-8 mb-1 animate-pulse" />
                        <span className="text-[10px] font-bold">QR Camera</span>
                      </div>

                      <button
                        type="button"
                        onClick={startCameraStream}
                        disabled={cameraLoading}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-purple-500/20 transition cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>{cameraLoading ? 'Starting...' : (lang === 'ur' ? 'کیمرہ آن کریں' : 'Start Camera')}</span>
                      </button>
                    </div>
                  )}

                  {/* High Tech QR Scanner Viewfinder Box */}
                  <div className="absolute w-44 h-44 rounded-2xl border-2 border-purple-400/80 flex items-center justify-center pointer-events-none shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                    {/* Corner Target Markers */}
                    <div className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-purple-300 rounded-tl"></div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-purple-300 rounded-tr"></div>
                    <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-purple-300 rounded-bl"></div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-purple-300 rounded-br"></div>
                    
                    {/* Laser line moving across QR box */}
                    <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-purple-300 to-transparent shadow-[0_0_8px_#c084fc] animate-scanline" />
                    
                    <QrCode className="w-12 h-12 text-purple-400/30" />
                  </div>
                </div>

                {/* Subtitle / Instructions */}
                <div className="text-center space-y-1">
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center justify-center gap-2">
                    <QrCode className="w-4 h-4 text-purple-400" />
                    <span>{lang === 'ur' ? 'ملازم کا کیو آر بیج کیمرے کے سامنے لائیں' : 'Point Camera at Employee QR Badge'}</span>
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs">
                    {lang === 'ur'
                      ? 'کیمرہ کیو آر کوڈ خود بخود اسکین کر کے حاضری درج کرے گا'
                      : 'Camera auto-detects employee QR code and logs attendance instantly'}
                  </p>
                </div>

                {/* Manual Badge ID Input & Quick Tap fallback */}
                <div className="w-full space-y-3 pt-1">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="QR Badge / ID (e.g. 1001)"
                      value={cardInput}
                      onChange={(e) => setCardInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && cardInput && handleCardSwipe(cardInput)}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-purple-500 text-white font-mono text-xs uppercase tracking-wider outline-none"
                    />
                    <button
                      onClick={() => cardInput && handleCardSwipe(cardInput)}
                      className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer"
                    >
                      {lang === 'ur' ? 'حاضری لگائیں' : 'Punch'}
                    </button>
                  </div>

                  {/* Quick-tap employee badges */}
                  {employees.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] text-slate-400 text-center font-medium">
                        {lang === 'ur' ? 'یا ملازم کے کیو آر بیج پر کلک کریں:' : 'Or tap an employee badge:'}
                      </div>
                      <div className="grid grid-cols-2 gap-2 max-h-28 overflow-y-auto pr-1">
                        {employees.map((emp) => (
                          <button
                            key={emp.id}
                            onClick={() => handleCardSwipe(emp.cardId || emp.empNumber)}
                            className="p-2 rounded-xl bg-slate-950/80 hover:bg-purple-950/40 border border-slate-800 hover:border-purple-500/50 text-left flex items-center justify-between text-xs transition cursor-pointer"
                          >
                            <span className="font-medium text-white truncate text-[11px]">{emp.name}</span>
                            <span className="font-mono text-[10px] text-purple-400 font-bold">{emp.cardId}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: PIN / Employee ID Quick Keypad */}
            {activeTab === 'pin' && (
              <div className="w-full max-w-sm flex flex-col items-center space-y-4">
                
                {/* PIN Display */}
                <div className="w-full p-4 rounded-xl bg-slate-950 border border-slate-700 text-center">
                  <div className="text-xs text-slate-400 mb-1">{t.enterPin}</div>
                  <div className="font-mono text-2xl font-extrabold text-cyan-400 tracking-widest min-h-[32px]">
                    {pinInput || '— — — —'}
                  </div>
                </div>

                {/* Keypad Grid */}
                <div className="grid grid-cols-3 gap-2.5 w-full">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'].map((key) => (
                    <button
                      key={key}
                      onClick={() => {
                        sound.playCardBeep();
                        if (key === 'C') {
                          setPinInput('');
                        } else if (key === 'OK') {
                          if (pinInput) handlePinSubmit(pinInput);
                        } else {
                          if (pinInput.length < 6) setPinInput((prev) => prev + key);
                        }
                      }}
                      className={`py-3.5 rounded-xl font-mono text-base font-bold transition active:scale-95 cursor-pointer ${
                        key === 'OK'
                          ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                          : key === 'C'
                          ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30'
                          : 'bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700/60'
                      }`}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right Column: Worker Profile Simulation & Live Branch Status (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Active Employee Selector Card */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <User className="w-4 h-4 text-cyan-400" />
                <span>{lang === 'ur' ? 'ٹیسٹ / منتخب ملازم' : 'Selected Employee'}</span>
              </div>
              <span className="text-[11px] text-slate-400">
                {employees.length} {lang === 'ur' ? 'ملازمین دستیاب' : 'Staff Members'}
              </span>
            </div>

            {employees.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-950 border-2 border-dashed border-cyan-500/30 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mx-auto">
                  <UserPlus className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">
                    {lang === 'ur' ? 'ابھی کوئی ملازم رجسٹرڈ نہیں ہے' : 'No Staff Registered Yet'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {lang === 'ur'
                      ? 'چہرہ شناخت اور بائیو میٹرک حاضری شروع کرنے کے لیے پہلے ملازم کا اندراج کریں۔'
                      : 'Enroll your first employee with camera face recognition to start attendance.'}
                  </p>
                </div>
                {/* Always visible Add First Employee button */}
                <button
                  onClick={() => {
                    if (onAddStaff) onAddStaff();
                    else if (onOpenAdmin) onOpenAdmin();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/25 transition cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{lang === 'ur' ? '+ نیا ملازم شامل کریں (Add First Staff)' : '+ Add First Employee'}</span>
                </button>
              </div>
            ) : (
              <>
                {/* Quick staff select */}
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white font-semibold focus:outline-none focus:border-cyan-500"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.empNumber} - {lang === 'ur' ? emp.nameUrdu : emp.name} ({emp.role})
                    </option>
                  ))}
                </select>

                {/* Selected Employee Card details */}
                {selectedEmployeeObj && (
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                    <img
                      src={selectedEmployeeObj.avatar}
                      alt={selectedEmployeeObj.name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-500/50 shadow-md flex-shrink-0"
                    />
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-white text-base truncate">
                          {lang === 'ur' ? selectedEmployeeObj.nameUrdu : selectedEmployeeObj.name}
                        </h4>
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                          #{selectedEmployeeObj.empNumber}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        {lang === 'ur' ? selectedEmployeeObj.roleUrdu : selectedEmployeeObj.role} • {selectedEmployeeObj.department}
                      </p>
                      
                      {/* Today's punch badge for this employee */}
                      <div className="pt-1 flex items-center gap-2">
                        {(() => {
                          const rec = getTodayRecordForEmployee(selectedEmployeeObj.id);
                          if (!rec) {
                            return (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                                <Clock className="w-3 h-3 text-slate-500" />
                                {lang === 'ur' ? 'آج ابھی تک کوئی پنج نہیں' : 'Not clocked in yet today'}
                              </span>
                            );
                          }
                          if (rec.timeIn && !rec.timeOut) {
                            return (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                                <LogIn className="w-3 h-3" />
                                {lang === 'ur' ? `حاضر (آمد: ${rec.timeIn})` : `Clocked IN at ${rec.timeIn}`}
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400">
                              <CheckCircle2 className="w-3 h-3" />
                              {lang === 'ur' ? `مکمل (آؤٹ: ${rec.timeOut})` : `Shift Completed (Out: ${rec.timeOut})`}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick 1-Click Punch Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => selectedEmployeeObj && executePunch(selectedEmployeeObj, activeTab)}
                    className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition cursor-pointer active:scale-95"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{t.punchIn}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (!selectedEmployeeObj) return;
                      const rec = getTodayRecordForEmployee(selectedEmployeeObj.id);
                      if (rec && !rec.timeOut) {
                        confirmPunchOut(selectedEmployeeObj, rec);
                      } else if (rec && rec.timeOut) {
                        alert(lang === 'ur' ? 'یہ ملازم پہلے ہی آؤٹ ہوچکا ہے۔' : 'Already clocked out!');
                      } else {
                        alert(lang === 'ur' ? 'پہلے پنج ان ہونا ضروری ہے!' : 'Must Clock IN before Clock OUT!');
                      }
                    }}
                    className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-900/30 transition cursor-pointer active:scale-95"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t.punchOut}</span>
                  </button>
                </div>

                {/* Add Another Employee Button - Always Visible */}
                <button
                  onClick={() => {
                    if (onAddStaff) onAddStaff();
                    else if (onOpenAdmin) onOpenAdmin();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 border border-cyan-800/50 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{lang === 'ur' ? '+ مزید نیا ملازم شامل کریں' : '+ Add Another Employee'}</span>
                </button>
              </>
            )}
          </div>

          {/* Real-time Branch Live Feed */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                <span>{t.liveAttendanceFeed}</span>
              </h3>
              <span className="text-[11px] text-cyan-400 font-mono">LIVE FEED</span>
            </div>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {attendance.slice(0, 5).map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${rec.timeOut ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {rec.timeOut ? <LogOut className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{rec.employeeName}</div>
                      <div className="text-[10px] text-slate-400">{rec.branchName} • {rec.methodIn.toUpperCase()}</div>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-cyan-400 font-bold">{rec.timeOut ? rec.timeOut : rec.timeIn}</div>
                    <div className={`text-[10px] font-semibold ${rec.status === 'late' ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {rec.status === 'late' ? t.late : t.present}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Enterprise Hardware Bottom Plate: Isam Economics company Ltd & Developed by: Waseem Asif (English, Urdu & Arabic) */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-cyan-500/30 p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex items-center gap-3.5">
          <div className="w-13 h-13 rounded-2xl bg-cyan-500/10 border-2 border-cyan-400/50 flex items-center justify-center text-cyan-400 font-black text-lg shadow-lg shadow-cyan-500/10 flex-shrink-0">
            IE
          </div>
          <div>
            <div className="text-base sm:text-lg font-black text-white tracking-wide flex items-center justify-center sm:justify-start gap-2">
              <span>Isam Economics company Ltd</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-cyan-300 flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <span>شركة عصام الاقتصادية المحدودة</span>
              <span className="text-slate-600">•</span>
              <span>عصام اکنامکس کمپنی لمیٹڈ</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:items-end text-xs space-y-1">
          <div className="text-slate-200 font-bold flex items-center justify-center sm:justify-end gap-2 flex-wrap">
            <span className="text-slate-400 text-xs">Developed by / تیار کردہ / تطوير:</span>
            <span className="px-3 py-1 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 font-black text-sm tracking-wide shadow-sm">
              Waseem Asif (وسیم آصف)
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Riyadh & Jeddah Branches • Enterprise Cloud Time Attendance
          </div>
        </div>
      </div>

      {/* Confirmation Modal when Employee already clocked IN and tries to punch again */}
      {promptOutEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border-2 border-cyan-500/40 p-6 shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 space-y-5">
            <div className="flex items-center gap-3 text-cyan-400">
              <AlertTriangle className="w-7 h-7 text-amber-400 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-extrabold text-white">
                  {lang === 'ur' ? 'پہلے سے حاضری درج ہے' : 'Already Clocked IN!'}
                </h3>
                <p className="text-xs text-slate-400">
                  {t.alreadyPunchedIn}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-4">
              <img
                src={promptOutEmployee.employee.avatar}
                alt={promptOutEmployee.employee.name}
                className="w-14 h-14 rounded-xl object-cover border border-cyan-500/40"
              />
              <div className="space-y-0.5 text-xs">
                <div className="font-bold text-white text-sm">{promptOutEmployee.employee.name}</div>
                <div className="text-slate-400">{lang === 'ur' ? 'آمد کا وقت:' : 'Clock In Time:'} <span className="font-mono text-cyan-400">{promptOutEmployee.existingRecord.timeIn}</span></div>
                <div className="text-slate-400">{lang === 'ur' ? 'برانچ:' : 'Branch:'} {promptOutEmployee.existingRecord.branchName}</div>
              </div>
            </div>

            <p className="text-sm font-semibold text-slate-200 text-center">
              {t.wantToPunchOut}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setPromptOutEmployee(null)}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => confirmPunchOut(promptOutEmployee.employee, promptOutEmployee.existingRecord)}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-400 hover:to-amber-500 text-white font-extrabold text-sm shadow-lg shadow-rose-900/30 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>{t.punchOut}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Punch Notification Modal / Toast Card */}
      {lastPunchResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border-2 border-emerald-500/60 p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border-2 border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-white">
                {lastPunchResult.action === 'IN' ? t.punchIn : t.punchOut} {t.success}
              </h3>
              <p className="text-xs text-slate-400 font-medium">{lastPunchResult.message}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3 text-left">
              <img
                src={lastPunchResult.employee.avatar}
                alt={lastPunchResult.employee.name}
                className="w-12 h-12 rounded-xl object-cover border border-cyan-500/40"
              />
              <div className="text-xs space-y-0.5 flex-1">
                <div className="font-bold text-white text-sm">{lastPunchResult.employee.name}</div>
                <div className="text-slate-400">#{lastPunchResult.employee.empNumber} • {lastPunchResult.employee.department}</div>
                <div className="font-mono text-cyan-400 font-bold">{lastPunchResult.time}</div>
              </div>
            </div>

            <button
              onClick={() => setLastPunchResult(null)}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-sm shadow-md transition cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
