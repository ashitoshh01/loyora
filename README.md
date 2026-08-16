# 💳 LoyalNFC (Loyora SaaS Platform)

> **A High-Performance, Multi-Tenant NFC Loyalty & Membership Platform for Modern Merchants**

LoyalNFC is an end-to-end multi-tenant SaaS platform that helps brick-and-mortar businesses drive repeat customers through physical NFC membership card taps, automated data-driven loyalty rewards, digital PWA mobile passes, and real-time business telemetry.

---

## ✨ Key Features

### 👑 1. Super Admin Management Portal (`/super-admin`)
- **Tenant Management**: Onboard new merchant businesses, set custom slugs, and manage contact metadata.
- **Role-Based Access Control**: Provision Business Admin accounts with strict `businessId` claim scoping.
- **Subscription Tiering**: Assign and update business membership plans (`Basic`, `Pro`, `Enterprise`).
- **Account Controls**: Instant tenant suspension and reactivation controls.

### 🏢 2. Business Admin Operations Dashboard (`/admin`)
- **Real-Time Analytics Overview**: Server-side Firestore `.count()` aggregations for total customers, active passes, daily/monthly visits, card statuses, and 30-day visit trend SVG charts.
- **Customer Directory**: Searchable & filterable customer directory, detail profiles, creation, editing, and soft-deactivation.
- **Decoupled NFC Card Inventory**: Manage opaque NFC card tokens, assign cards to pending customer accounts, block lost cards, and issue replacement cards without losing customer visit history.
- **Configurable Loyalty Rules Engine**: Define data-driven rules (e.g. *Visits 1-5 → 10% Off*, *Visits 6-10 → Free Beverage*) supporting percentage discounts, fixed amounts, free items, and tier upgrades.

### 📲 3. Merchant Counter NFC Tap Check-in (`/t/:token`)
- **Instant Tap Resolution**: Public, unauthenticated NFC tap route resolves card status in milliseconds via `resolveCardToken` Cloud Function.
- **Merchant PIN Verification**: Secure counter check-in backed by bcrypt-hashed PIN validation (`recordVisit`).
- **Same-Day Rate Limiting**: Timezone-aware enforcement of maximum 1 visit per customer per calendar day.
- **Atomic Loyalty Calculation**: Visits automatically recalculate membership levels and unlock milestone rewards in real-time.

### 📱 4. Customer Mobile PWA Loyalty Pass (`/c`)
- **Installable Mobile PWA**: Configured with Web App Manifest (`manifest.json`) and service worker (`sw.js`) for app-shell caching.
- **Phone SMS OTP Authentication**: Quick customer sign-in powered by Firebase Authentication.
- **Brand-Forward Digital Pass**: Glossy digital card UI displaying member tier badges (*Bronze*, *Silver*, *Gold*, *VIP Platinum*), milestone progress bars, active shop offers, and chronological visit history logs.

### 🌐 5. Public Business QR Landing Page (`/b/:businessSlug`)
- **Branded Merchant Microsite**: Unauthenticated public QR landing page for storefront or marketing materials.
- **Quick Action Links**: Single-click access to **Google Reviews**, **Google Maps Directions**, official website, store contact details, and member reward sign-in.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Vanilla CSS & TailwindCSS, Lucide Icons
- **Backend / Infrastructure**: Firebase Cloud Functions (v2 Node.js runtime), Firebase Authentication, Cloud Firestore
- **Security & Hardening**: Firebase Security Rules (`firestore.rules`), Firebase App Check (`ReCaptchaV3Provider`), bcrypt PIN hashing
- **Hosting**: Firebase Hosting with Single-Page Application (SPA) routing

---

## 📁 Repository Structure

```text
loyora/
├── firebase.json                 # Firebase project deployment & hosting configuration
├── firestore.indexes.json        # Firestore composite indexes
├── docs/                         # Architecture, Security & Deployment Documentation
│   ├── DATA_MODEL.md             # Complete Firestore schema & data architecture
│   ├── SECURITY_AUDIT_CHECKLIST.md # 17-point manual emulator test checklist
│   └── DEPLOY.md                 # Production deployment step-by-step guide
└── loyalnfc-web/                 # Main Web Application & Firebase Cloud Functions
    ├── public/                   # Static assets, PWA manifest, service worker
    ├── src/                      # React frontend source code
    │   ├── components/           # UI components (Business Admin, Super Admin, PWA)
    │   ├── context/              # AuthContext & custom claims management
    │   ├── lib/                  # Firebase SDK client initialization
    │   ├── pages/                # App views (/super-admin, /admin, /c, /t/:token, /b/:slug)
    │   └── services/             # Firestore & Cloud Function service layers
    └── functions/                # Firebase Cloud Functions (TypeScript backend)
        └── src/index.ts          # Server-side APIs & aggregations
```

---

## 🚀 Quick Start (Local Development)

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/ashitoshh01/loyora.git
cd loyora/loyalnfc-web

# Install frontend dependencies
npm install

# Install Cloud Functions dependencies
cd functions
npm install
cd ..
```

### 2. Configure Local Environment

Create `loyalnfc-web/.env.local`:

```env
VITE_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
```

### 3. Run Development Server

```bash
# Start Vite development server
npm run dev
```

---

## 🧪 Testing & Security Audit

### 1. Build Verification
Run TypeScript type-checking and linting:
```bash
npx tsc --noEmit && npm run lint
```

### 2. Production Build
Test production web and function bundles:
```bash
# Build Web bundle
npm run build

# Build Functions bundle
cd functions && npm run build
```

### 3. Firebase Emulator Suite & Security Audit
Run the Firebase Emulator Suite locally to execute the 17-point security test plan:
```bash
firebase emulators:start
```
Refer to [`docs/SECURITY_AUDIT_CHECKLIST.md`](./docs/SECURITY_AUDIT_CHECKLIST.md) for step-by-step manual test cases covering tenant isolation, customer data scoping, and PII protection.

---

## 📦 Production Deployment

For complete instructions on setting up Firebase Auth providers, configuring secrets, applying custom claims, and executing `firebase deploy`, see the [Deployment Guide (`docs/DEPLOY.md`)](./docs/DEPLOY.md).

```bash
# Build and deploy everything to production
cd loyalnfc-web && npm run build && cd ..
firebase deploy
```

---

## 📄 License

This project is proprietary and confidential. All rights reserved.
