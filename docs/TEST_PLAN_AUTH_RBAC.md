# LoyalNFC — Manual Verification Test Plan: Authentication & RBAC Isolation

This test plan provides step-by-step instructions to manually verify that **Role-Based Access Control (RBAC)** and **Multi-Tenant Isolation** are properly enforced both in the UI via custom claims and server-side via Firestore Security Rules.

---

## Prerequisites & Environment Setup

1. **Firebase Emulator Suite / Staging Environment**:
   - Ensure Firebase Auth and Firestore Emulators are running, or access a test Firebase project.
   - Run the frontend: `cd loyalnfc-web && npm run dev`.

---

## Verification Test Cases

### Test Case 1: Role Assignment via `setUserRole` Cloud Function
* **Objective**: Confirm that custom claims (`role` and `businessId`) are correctly assigned and enforced on user tokens.

#### Steps:
1. **Super Admin Invocation**:
   - Log in as a `super_admin` account at `/staff-login`.
   - Open the **Super Admin Console** at `/super-admin`.
   - In the "Assign Custom User Claims" form, enter a target user UID `user_admin_a`, select role `business_admin`, and enter business ID `biz_alpha`.
   - Click **Assign User Claims**.
   - **Expected Result**: Cloud Function returns success (`200 OK`) and custom claims `{ role: "business_admin", businessId: "biz_alpha" }` are set.

2. **Non-Super Admin Authorization Guard**:
   - Log in as a `business_admin` account.
   - Execute a direct callable request to `setUserRole`.
   - **Expected Result**: Function invocation throws `permission-denied` ("Only platform super_admin users are authorized to assign roles.").

---

### Test Case 2: Multi-Tenant Data Isolation (Business Admin A vs Business Admin B)
* **Objective**: Verify that `business_admin` for `biz_alpha` cannot read or write data belonging to `biz_beta`.

#### Setup:
- **User A**: `business_admin` with claims `{ role: "business_admin", businessId: "biz_alpha" }`.
- **User B**: `business_admin` with claims `{ role: "business_admin", businessId: "biz_beta" }`.
- **Database State**:
  - `/businesses/biz_alpha/customers/cust_001` exists.
  - `/businesses/biz_beta/customers/cust_002` exists.

#### Steps:
1. **Valid Tenant Access**:
   - Log in as **User A**.
   - Issue Firestore read for `/businesses/biz_alpha/customers/cust_001`.
   - **Expected Result**: **ALLOW** (200 OK — document returned).

2. **Cross-Tenant Unauthorized Read**:
   - Remaining logged in as **User A**, issue Firestore read for `/businesses/biz_beta/customers/cust_002`.
   - **Expected Result**: **DENY** (Firestore Error: `Missing or insufficient permissions`).

3. **Cross-Tenant Unauthorized Write**:
   - Remaining logged in as **User A**, attempt to create or write `/businesses/biz_beta/visits/visit_999`.
   - **Expected Result**: **DENY** (Firestore Error: `Missing or insufficient permissions`).

---

### Test Case 3: Customer Read-Only & Ownership Scoping
* **Objective**: Confirm that `customer` accounts have strictly read-only access to their own records and zero write access.

#### Setup:
- **Customer User**: Phone-authenticated customer with claims `{ role: "customer", businessId: "biz_alpha" }` and Auth `uid = cust_100`.

#### Steps:
1. **Own Record Read**:
   - Log in as **Customer User** via Phone OTP at `/customer-login`.
   - Read `/businesses/biz_alpha/customers/cust_100` and `/businesses/biz_alpha/memberships/cust_100`.
   - **Expected Result**: **ALLOW** (Document returned).

2. **Other Customer Record Read**:
   - Attempt to read `/businesses/biz_alpha/customers/cust_999`.
   - **Expected Result**: **DENY** (Firestore Error: `Missing or insufficient permissions`).

3. **Customer Write Prohibition**:
   - Attempt to update `/businesses/biz_alpha/customers/cust_100` or insert a new visit into `/businesses/biz_alpha/visits/visit_001`.
   - **Expected Result**: **DENY** (Firestore Rules prohibit all customer writes).

---

### Test Case 4: Route Guard Client UX Verification
* **Objective**: Verify that UI client route guards redirect unauthorized users cleanly.

#### Steps:
1. **Unauthenticated Redirect**:
   - Open browser in incognito mode and navigate to `http://localhost:5173/admin`.
   - **Expected Result**: Redirected to `/login`.

2. **Role Mismatch Redirect**:
   - Log in as `business_admin`.
   - Manually navigate to `http://localhost:5173/super-admin`.
   - **Expected Result**: Redirected to `/unauthorized` (403 Access Denied page displayed).

---

## Verification Matrix Summary

| User Role | Document Path | Action | Expected Outcome |
| :--- | :--- | :--- | :--- |
| `super_admin` | `/businesses/biz_any/*` | Read/Write | **ALLOW** |
| `business_admin` (`biz_alpha`) | `/businesses/biz_alpha/*` | Read/Write | **ALLOW** |
| `business_admin` (`biz_alpha`) | `/businesses/biz_beta/*` | Read/Write | **DENY** |
| `customer` (`cust_100`, `biz_alpha`) | `/businesses/biz_alpha/customers/cust_100` | Read | **ALLOW** |
| `customer` (`cust_100`, `biz_alpha`) | `/businesses/biz_alpha/customers/cust_999` | Read | **DENY** |
| `customer` (`cust_100`, `biz_alpha`) | `/businesses/biz_alpha/*` | Write | **DENY** |
