# LoyalNFC Production Deployment Guide

This guide details the step-by-step procedure for deploying the **LoyalNFC** multi-tenant SaaS platform to Google Cloud & Firebase production infrastructure.

---

## 📋 Prerequisites

Ensure you have the following installed on your deployment workstation:
- **Node.js**: `v18.x` or `v20.x` LTS
- **npm**: `v9.x` or higher
- **Firebase CLI**: `npm install -g firebase-tools`
- **Google Cloud SDK** (optional, for advanced Secret Manager configuration)

Log in to Firebase CLI:
```bash
firebase login
```

---

## 1. Firebase Project Creation

1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and enter your desired project name (e.g., `<YOUR_FIREBASE_PROJECT_ID>`).
3. Enable Google Analytics (recommended for web telemetry) and click **Create Project**.
4. Upgrade your project plan to **Blaze (Pay-as-you-go)**. *Note: Blaze plan is required for Firebase Cloud Functions (Node.js 18/20 runtime) and outbound HTTP requests.*
5. Link your local codebase to the Firebase project:
   ```bash
   firebase use --add <YOUR_FIREBASE_PROJECT_ID>
   ```

---

## 2. Firebase Authentication Setup

1. In Firebase Console, navigate to **Build > Authentication > Sign-in method**.
2. **Enable Email / Password Provider**:
   - Click **Email/Password**.
   - Toggle **Enable** and click **Save**. *(Used for Super Admins and Business Admins)*.
3. **Enable Phone Authentication Provider**:
   - Click **Phone**.
   - Toggle **Enable** and click **Save**. *(Used for Customer PWA Login via SMS OTP)*.
4. **Authorized Domains**:
   - Under **Settings > Authorized domains**, add your production domain(s):
     - `<YOUR_FIREBASE_PROJECT_ID>.web.app`
     - `<YOUR_FIREBASE_PROJECT_ID>.firebaseapp.com`
     - `<YOUR_CUSTOM_DOMAIN>` (e.g., `app.yourdomain.com`)

---

## 3. Cloud Firestore Initialization

1. Navigate to **Build > Firestore Database** in the console.
2. Click **Create database**.
3. Select **Start in production mode**.
4. Choose a Cloud Firestore location closest to your user base (e.g., `us-central1` or `asia-south1`).

---

## 4. Firebase App Check Configuration

Firebase App Check protects your Cloud Functions and Firestore from non-app traffic and scraping.

1. Navigate to **Build > App Check** in the Firebase Console.
2. Register your Web App with **reCAPTCHA v3** (or **reCAPTCHA Enterprise**):
   - Obtain a **reCAPTCHA v3 Site Key** (`<YOUR_RECAPTCHA_V3_SITE_KEY>`) and **Secret Key** from the [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin).
   - Enter the secret key in the Firebase App Check configuration.
3. Under **Apps**, select your Web App and enforce App Check for Cloud Firestore and Cloud Functions.

---

## 5. Frontend Environment Configuration

Create a production environment file at `loyalnfc-web/.env.production`:

```env
# loyalnfc-web/.env.production
VITE_FIREBASE_API_KEY=<YOUR_FIREBASE_API_KEY>
VITE_FIREBASE_AUTH_DOMAIN=<YOUR_FIREBASE_PROJECT_ID>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<YOUR_FIREBASE_PROJECT_ID>
VITE_FIREBASE_STORAGE_BUCKET=<YOUR_FIREBASE_PROJECT_ID>.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=<YOUR_FIREBASE_MESSAGING_SENDER_ID>
VITE_FIREBASE_APP_ID=<YOUR_FIREBASE_APP_ID>

# App Check reCAPTCHA v3 Public Site Key
VITE_FIREBASE_APPCHECK_KEY=<YOUR_RECAPTCHA_V3_SITE_KEY>
```

---

## 6. Cloud Functions & Secret Manager Setup

Business PINs are hashed using bcrypt before storage. Configure secrets or environment variables for Cloud Functions.

1. Navigate to `loyalnfc-web/functions`.
2. Set Cloud Secret for bcrypt salt rounds (or custom secret key):
   ```bash
   firebase functions:secrets:set BCRYPTSALT
   # Enter value: 10
   ```
3. If using `.env` for Functions runtime configuration, create `loyalnfc-web/functions/.env`:
   ```env
   ENFORCE_APP_CHECK=true
   BUSINESS_PIN_SALT_ROUNDS=10
   ```

---

## 7. Super Admin Initial Bootstrapping

To create the initial Super Admin account with custom claims (`role: "super_admin"`):

1. Create the user in Firebase Authentication (console or script).
2. Set custom claims using Firebase Admin SDK:
   ```bash
   # Run local bootstrap script or Firebase Admin CLI
   node -e "
     const admin = require('firebase-admin');
     admin.initializeApp();
     admin.auth().setCustomUserClaims('<YOUR_SUPER_ADMIN_UID>', { role: 'super_admin' });
   "
   ```

---

## 8. Build & Deploy Strategy

### Step-by-Step Deployment Commands

1. **Build the Production Web Client**:
   ```bash
   cd loyalnfc-web
   npm run build
   cd ..
   ```

2. **Deploy Firestore Rules and Indexes**:
   ```bash
   firebase deploy --only firestore
   ```

3. **Deploy Cloud Functions**:
   ```bash
   firebase deploy --only functions
   ```

4. **Deploy Firebase Hosting**:
   ```bash
   firebase deploy --only hosting
   ```

5. **Complete One-Step Deployment**:
   ```bash
   firebase deploy
   ```

---

## 9. Verification & Post-Deployment Checklist

After running `firebase deploy`, perform the following smoke tests:

- [ ] **Public QR Landing**: Visit `https://<YOUR_CUSTOM_DOMAIN>/b/<SAMPLE_SLUG>` — Verify public microsite loads unauthenticated.
- [ ] **Public NFC Tap**: Visit `https://<YOUR_CUSTOM_DOMAIN>/t/<SAMPLE_TOKEN>` — Verify token resolution UI renders without exposing PII.
- [ ] **Customer PWA**: Visit `https://<YOUR_CUSTOM_DOMAIN>/customer-login` — Test phone SMS OTP sign-in.
- [ ] **Staff / Admin Portal**: Visit `https://<YOUR_CUSTOM_DOMAIN>/login` — Test Business Admin & Super Admin email login.
- [ ] **PWA Manifest & Service Worker**: Inspect browser devtools to verify `/sw.js` and `/manifest.json` are served with proper headers.

---
