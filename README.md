# BioTime Cloud - Smart Biometric Attendance & Payroll System
### عصام اکنامکس کمپنی لمیٹڈ (Isam Economics Company Ltd)

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-purple.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-cyan.svg)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Offline--Ready-success.svg)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

**BioTime Cloud** is a modern, enterprise-grade biometric attendance kiosk and human resource management system built for multi-branch organizations. Designed with an **Offline-First** philosophy, it performs real-time client-side face recognition, smartphone biometric authentication (WebAuthn / Touch ID / Face ID), dynamic QR code badge scanning, and automated multi-branch payroll calculations directly in the browser—with zero reliance on external hardware biometric servers.

---

## 🌟 Key Features

### 1. 📷 100% Offline AI Face Recognition
* **Edge-Powered AI**: Powered by `@vladmandic/face-api` (TinyFaceDetector, FaceLandmark68Net, and FaceRecognitionNet).
* **Zero Cloud Latency**: Models load locally from cached assets. Face embeddings (128-dimensional biometric vectors) are extracted and compared in real time against stored profiles.
* **Smart Matching**: Euclidean distance matching with liveness detection and confidence scores.

### 2. 📱 Phone Biometric & WebAuthn Integration
* Native support for device biometrics (Fingerprint / Touch ID / Face ID) via the standard W3C WebAuthn Credential API.
* Safe, hardware-backed verification fallback for employees punching in via personal or kiosk mobile devices.

### 3. 🏷️ Smart QR Code Employee Badges
* Instant SVG/PNG QR badge generator embedded with encrypted employee identification tokens.
* Live camera QR code barcode scanner using `jsqr` with continuous targeting overlay.
* Printable badge sheets ready for physical thermal or card printers.

### 4. 🏢 Multi-Branch Management
* Seamless multi-branch operations (e.g., **Jeddah Main Branch**, **Riyadh Regional Office**, **Eastern Province**).
* Branch-filtered reporting, geofencing coordinates, and branch-specific shift schedules.

### 5. 💰 Automated Payroll & Overtime Calculator
* Saudi Riyal (SAR) payroll engine.
* Calculates regular hours, overtime pay, late arrival penalties, and unexcused absence deductions.
* One-click summary breakdown with salary slip print view and direct Excel/CSV export.

### 6. 💾 Offline-First Local Database (IndexedDB)
* High-performance browser storage powered by native `IndexedDB` (`BiotimeOfflineDB`).
* Persists employee profiles, face vectors, branch records, settings, and full historical attendance logs.
* Full CSV export with **UTF-8 BOM** ensuring complete compatibility with Urdu, Arabic, and English characters in Microsoft Excel.

### 7. 🌐 Trilingual Localization & RTL
* Complete native support for:
  - **اردو (Urdu)** with RTL layout support
  - **English (EN)**
  - **العربية (Arabic)** with RTL layout support
* Instant live language switching across kiosk and administration screens.

### 8. 📲 Progressive Web App (PWA)
* Installable as a standalone desktop or mobile application on Windows, macOS, Android, and iOS.
* Service worker caching caches all models, scripts, styles, and audio chimes for operation without internet.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 19, TypeScript |
| **Build & Tooling** | Vite 8, PostCSS, `@tailwindcss/vite` |
| **Styling & Icons** | Tailwind CSS v4, Lucide React Icons |
| **Face Recognition** | `@vladmandic/face-api` (TensorFlow.js edge runtime) |
| **QR Code Scanner & Gen** | `jsqr`, `qrcode` |
| **Audio Feedback** | Web Audio API synthetic chime synthesis |
| **Data Storage** | Native HTML5 `IndexedDB` & LocalStorage |
| **Export Formats** | CSV (UTF-8 BOM), Print CSS media stylesheets |

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) version `18.0.0` or higher
* `npm`, `pnpm`, or `bun`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/saadwaseem6161/biotime-cloud.git
   cd biotime-cloud
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000`.

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Preview production build:**
   ```bash
   npm run preview
   ```

---

## 📁 Project Structure

```
├── public/
│   ├── favicon.ico
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── manifest.json            # PWA Web App Manifest
│   └── models/                  # Offline TensorFlow face recognition models
│       ├── face_landmark_68_model-*
│       ├── face_recognition_model-*
│       └── tiny_face_detector_model-*
├── src/
│   ├── components/
│   │   ├── AdminDashboard.tsx   # HQ administrative control panel & KPIs
│   │   ├── AttendanceLogs.tsx   # Filterable timesheets & CSV export
│   │   ├── KioskTerminal.tsx    # Live kiosk camera & punch methods
│   │   ├── OfflineIndicator.tsx # Offline status notifier
│   │   ├── PayrollCalculator.tsx# SAR payroll, overtime & deduction engine
│   │   ├── PWAInstallButton.tsx # One-click browser install prompt
│   │   ├── SettingsView.tsx     # System rules, branch configs & DB tools
│   │   └── StaffManagement.tsx  # Employee enrollment & biometric capture
│   ├── types/                   # TypeScript interfaces & types
│   ├── utils/
│   │   ├── audio.ts             # Web Audio API chime sounds
│   │   ├── db.ts                # IndexedDB store implementation & CSV export
│   │   ├── faceRecognition.ts   # Edge face-api model loader & matchers
│   │   ├── i18n.ts              # Urdu, Arabic & English translation dictionaries
│   │   ├── qrBadge.ts           # QR code generation & WebAuthn biometrics
│   │   └── storage.ts           # Sync & storage cache layer
│   ├── App.tsx                  # Root application router & state manager
│   ├── index.css                # Global styles & Tailwind CSS v4 imports
│   └── main.tsx                 # React entrypoint
├── index.html                   # HTML entry point with meta tags
├── metadata.json                # Project manifest & capability permissions
├── package.json
├── tsconfig.json
└── vite.config.ts               # Vite configuration with PWA workbox caching
```

---

## ⚙️ Camera & Hardware Permissions

To utilize facial recognition and QR badge scanning:
* Ensure camera permissions are allowed in your browser settings.
* In production, the application must be served over **HTTPS** (or `localhost` during development) for the browser MediaDevices API and WebAuthn credentials to be accessible.

---

## 📄 License

This project is open-source software licensed under the **[MIT License](LICENSE)**.

---

## 👨‍💻 Author & Credits

* **Developed by**: Waseem Asif
* **Email**: [saadwaseem6161@gmail.com](mailto:saadwaseem6161@gmail.com)
* **Organization**: Isam Economics Company Ltd (عصام اکنامکس کمپنی لمیٹڈ)
