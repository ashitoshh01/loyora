# LoyalNFC - Security Audit & Tenant Isolation Manual Testing Checklist

This document provides a step-by-step manual test checklist to run against the **Firebase Emulator Suite** (`firebase emulators:start`) to verify multi-tenant isolation, security rules, PII protection, and Cloud Function authorization.

---

## Prerequisites
1. Start the Firebase Emulator Suite:
   ```bash
   npm run emulators
   # or: firebase emulators:start --only firestore,auth,functions
   ```
2. Open the Firebase Emulator UI at `http://127.0.0.1:4000`.

---

## 1. Tenant Isolation Verification (Business Admin Scoping)

| Test ID | Test Description | Action / Payload | Expected Result | Pass / Fail |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **Business Admin Cross-Tenant Read** | Log in as Business Admin A (`businessId: biz_alpha`). Attempt to fetch Firestore documents at `businesses/biz_beta/customers`. | ❌ **Permission Denied** (`FirebaseError: Missing or insufficient permissions`). | [ ] |
| **SEC-02** | **Business Admin Cross-Tenant Write** | Log in as Business Admin A. Attempt to add a document to `businesses/biz_beta/memberships/cust_999`. | ❌ **Permission Denied** (`FirebaseError: Missing or insufficient permissions`). | [ ] |
| **SEC-03** | **Business Admin NFC Inventory Scoping** | Log in as Business Admin A. Attempt to view `businesses/biz_beta/nfc_cards`. | ❌ **Permission Denied**. Admin can only view cards under their assigned `businessId`. | [ ] |
| **SEC-04** | **Business Admin Loyalty Rules Scoping** | Log in as Business Admin A. Attempt to update rules under `businesses/biz_beta/loyalty_rules`. | ❌ **Permission Denied**. | [ ] |

---

## 2. Customer Scoping & Immutable History

| Test ID | Test Description | Action / Payload | Expected Result | Pass / Fail |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-05** | **Customer Own Profile Access** | Log in as Customer X (`uid: cust_101`, `businessId: biz_alpha`). Fetch `businesses/biz_alpha/customers/cust_101`. | ✅ **Allowed**. Customer can read their own profile document. | [ ] |
| **SEC-06** | **Customer Cross-Customer Read** | Log in as Customer X (`uid: cust_101`). Attempt to read `businesses/biz_alpha/customers/cust_102`. | ❌ **Permission Denied**. | [ ] |
| **SEC-07** | **Customer Write Prevention on Visits** | Log in as Customer X. Attempt to write directly to Firestore `businesses/biz_alpha/visits/visit_fake`. | ❌ **Permission Denied**. All visit writes must go through `recordVisit` Cloud Function. | [ ] |
| **SEC-08** | **Customer Profile Mutation Block** | Log in as Customer X. Attempt to edit total visits in `businesses/biz_alpha/memberships/cust_101`. | ❌ **Permission Denied**. Memberships are read-only for customers. | [ ] |

---

## 3. Unauthenticated Access & Public Route Isolation

| Test ID | Test Description | Action / Payload | Expected Result | Pass / Fail |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-09** | **Direct Unauthenticated Firestore Access** | Send a Firestore read request without an `Authorization` bearer token to `businesses/` or `customers/`. | ❌ **Permission Denied**. Unauthenticated users cannot read raw Firestore. | [ ] |
| **SEC-10** | **Public NFC Tap Token Resolution (`resolveCardToken`)** | Call `resolveCardToken({ token: "valid_nfc_token_123" })` unauthenticated. | ✅ **Success**. Returns ONLY `businessName`, `customerFirstName`, `totalVisits`, `tierLevel`, `alreadyVisitedToday`. **Zero PII (phone number, full name, email) exposed.** | [ ] |
| **SEC-11** | **Public QR Microsite Resolution (`getPublicBusinessProfile`)** | Call `getPublicBusinessProfile({ businessSlug: "cafe-central" })` unauthenticated. | ✅ **Success**. Returns public store info, address, review link, and active offers. Internal PIN hashes and merchant settings are withheld. | [ ] |

---

## 4. NFC Tap & Visit Recording Security

| Test ID | Test Description | Action / Payload | Expected Result | Pass / Fail |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-12** | **Invalid Merchant PIN Authorization** | Call `recordVisit({ token: "valid_token", businessPin: "0000" })` with an incorrect PIN. | ❌ **Error: permission-denied** (`Incorrect Merchant PIN`). | [ ] |
| **SEC-13** | **Valid Visit Recording** | Call `recordVisit({ token: "valid_token", businessPin: "1234" })` with valid PIN. | ✅ **Visit Recorded**. `totalVisits` incremented by 1, loyalty tier recomputed atomically. | [ ] |
| **SEC-14** | **Same-Day Duplicate Tap Rate Limiting** | Call `recordVisit({ token: "valid_token", businessPin: "1234" })` a second time on the same calendar day. | ⚠️ **Returns `already_visited`**. No duplicate visit document created, `totalVisits` count remains unchanged. | [ ] |
| **SEC-15** | **Blocked Card Prevention** | Set NFC card `status = "blocked"`. Attempt `recordVisit` or `resolveCardToken`. | ❌ **Failed Precondition**. Resolution blocked due to card status. | [ ] |

---

## 5. Decoupled Identity & App Check Protection

| Test ID | Test Description | Action / Payload | Expected Result | Pass / Fail |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-16** | **Card Replacement Identity Preservation** | Call `replaceCard(oldCardId, customerId)`. | ✅ **New Card Issued**. A new opaque token is assigned to the customer. Visit count and loyalty status remain intact. | [ ] |
| **SEC-17** | **App Check Script Execution Block** | Invoke `recordVisit` or `resolveCardToken` Cloud Functions without a valid App Check token (in production environment with `ENFORCE_APP_CHECK=true`). | ❌ **Failed Precondition / Unauthorized**. Call rejected before function execution. | [ ] |

---
