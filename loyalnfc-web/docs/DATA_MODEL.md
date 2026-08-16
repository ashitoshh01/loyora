# LoyalNFC — Firestore Data Model Specification

## 1. Architectural Overview & Design Principles

LoyalNFC is a multi-tenant SaaS platform for local business customer loyalty using NFC cards. The database architecture is built around three core non-negotiable principles:

1. **Strict Multi-Tenancy Scoping**:
   - Every business is an isolated tenant.
   - All tenant-scoped collection documents (`Customer`, `NFCCard`, `Visit`, `LoyaltyProgram`, `LoyaltyRule`, `Membership`, `Reward`, `BusinessAdmin`) store a top-level `businessId` field.
   - Access is restricted both in client logic and server-side using **Firestore Security Rules** validated against custom claims (`auth.token.businessId` and `auth.token.role`).

2. **Decoupled Customer & NFC Card Credentials**:
   - `Customer` owns the `Membership` and historical `Visit` records.
   - `NFCCard` is an independent physical credential containing a cryptographically generated token (`crypto.randomBytes(18).toString('hex')`, 36+ chars).
   - If an NFC card is lost or stolen, it is flagged as `"blocked"` or `"replaced"`, and a new `NFCCard` is linked to the `Membership` without affecting the customer's visit counts or rewards.

3. **Server-Enforced Visit Constraints (Flow B - Merchant PIN)**:
   - Calendar day visit enforcement (max 1 visit per customer per business per day) is computed using the business's configured timezone.
   - `Visit` records store `visitDateLocal` (format: `YYYY-MM-DD`) derived server-side inside a Cloud Function.

---

## 2. Entity Specifications (Canonical 11 Entities)

---

### Entity 1: `PlatformUser`
- **Collection Path**: `/platform_users/{userId}`
- **Document ID**: `{userId}` (Matches Firebase Auth UID of `super_admin`)
- **Description**: Stores global platform administrators responsible for onboarding businesses, managing subscriptions, and auditing platform metrics.

#### Schema Fields:
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `userId` | `string` | Firebase Auth UID |
| `email` | `string` | Admin email address |
| `displayName` | `string` | Full name |
| `role` | `string` | Literal `"super_admin"` |
| `createdAt` | `Timestamp` | Record creation timestamp |
| `updatedAt` | `Timestamp` | Record last update timestamp |

#### Denormalization & Rationale:
- None. `PlatformUser` is top-level and managed exclusively by super-admins.

---

### Entity 2: `MembershipPlan`
- **Collection Path**: `/membership_plans/{planId}`
- **Document ID**: `{planId}` (e.g. `plan_starter`, `plan_pro`)
- **Description**: Schema stub for platform subscription plans available to business tenants.

#### Schema Fields:
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `planId` | `string` | Unique plan identifier |
| `name` | `string` | Plan display name (e.g. "Pro Tier") |
| `price` | `number` | Monthly subscription fee |
| `currency` | `string` | ISO currency code (e.g. `"USD"`) |
| `maxCards` | `number` | Card allotment limit |
| `maxCustomers` | `number` | Customer limit |
| `features` | `array<string>` | List of enabled plan feature flags |
| `isActive` | `boolean` | Flag indicating if plan is open for subscription |
| `createdAt` | `Timestamp` | Record creation timestamp |
| `updatedAt` | `Timestamp` | Record last update timestamp |

#### Denormalization & Rationale:
- Schema stub for future subscription billing logic.

---

### Entity 3: `Business`
- **Collection Path**: `/businesses/{businessId}`
- **Document ID**: `{businessId}`
- **Description**: Tenant root entity representing a local business client.

#### Schema Fields:
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `businessId` | `string` | Unique business tenant ID |
| `name` | `string` | Legal / Brand business name |
| `slug` | `string` | Unique URL-safe slug |
| `logoUrl` | `string \| null` | Firebase Storage URL for brand logo |
| `merchantPinHash` | `string` | Server-hashed Merchant PIN (Argon2id or bcrypt digest for Flow B verification, never plain text) |
| `timezone` | `string` | Timezone string (e.g., `"America/New_York"`, `"Asia/Kolkata"`) |
| `planId` | `string` | Reference to `MembershipPlan` |
| `status` | `string` | `"active"` \| `"suspended"` \| `"pending"` |
| `createdAt` | `Timestamp` | Record creation timestamp |
| `updatedAt` | `Timestamp` | Record last update timestamp |

#### Denormalization & Rationale:
- `planId` stored as a scalar reference to avoid nested queries.

---

### Entity 4: `BusinessAdmin`
- **Collection Path**: `/businesses/{businessId}/business_admins/{adminId}`
- **Document ID**: `{adminId}` (Matches Firebase Auth UID of business admin)
- **Description**: Merchant staff/admin account scoped to a single `businessId`.

#### Schema Fields:
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `adminId` | `string` | Firebase Auth UID |
| `businessId` | `string` | Parent tenant ID |
| `email` | `string` | Admin email address |
| `displayName` | `string` | Staff / Manager display name |
| `role` | `string` | Literal `"business_admin"` |
| `createdAt` | `Timestamp` | Record creation timestamp |
| `updatedAt` | `Timestamp` | Record last update timestamp |

#### Denormalization & Rationale:
- `businessId` explicitly replicated inside the document to simplify Firestore rule validation (`resource.data.businessId`).

---

### Entity 5: `Customer`
- **Collection Path**: `/businesses/{businessId}/customers/{customerId}`
- **Document ID**: `{customerId}`
- **Description**: End customer profile belonging to a business tenant.

#### Schema Fields:
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `customerId` | `string` | Unique customer ID |
| `businessId` | `string` | Parent tenant ID |
| `phoneNumber` | `string` | E.164 formatted phone number |
| `fullName` | `string` | Customer full name |
| `email` | `string \| null` | Optional customer email |
| `createdAt` | `Timestamp` | Record creation timestamp |
| `updatedAt` | `Timestamp` | Record last update timestamp |

#### Denormalization & Rationale:
- Scoped to business tenant via subcollection path and top-level `businessId`.

---

### Entity 6: `Membership`
- **Collection Path**: `/businesses/{businessId}/memberships/{membershipId}`
- **Document ID**: `{membershipId}` (1:1 mapping with `Customer`, using `customerId` as `membershipId`)
- **Description**: Tracks the customer's overall loyalty status, tier, total visits, and membership dates.

#### Schema Fields:
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `membershipId` | `string` | Unique membership ID (matches `customerId`) |
| `customerId` | `string` | Linked `Customer` reference |
| `businessId` | `string` | Parent tenant ID |
| `totalVisits` | `number` | Aggregate successful visit count |
| `tierLevel` | `string` | Derived tier level (e.g. `"Bronze"`, `"Silver"`, `"Gold"`) |
| `status` | `string` | `"active"` \| `"paused"` \| `"cancelled"` |
| `joinedAt` | `Timestamp` | Membership activation date |
| `lastVisitAt` | `Timestamp \| null` | Date/time of most recent visit |
| `updatedAt` | `Timestamp` | Record last update timestamp |

#### Denormalization & Rationale:
- `totalVisits` and `lastVisitAt` are **denormalized metrics** updated atomically via Cloud Functions upon each valid `Visit` log. This eliminates expensive read queries counting historical visit documents for dashboard renders.

---

### Entity 7: `NFCCard`
- **Collection Path**: `/businesses/{businessId}/nfc_cards/{cardId}`
- **Document ID**: `{cardId}`
- **Description**: Physical credential issued by a business tenant. Contains a secure, non-guessable token.

#### Schema Fields:
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `cardId` | `string` | Internal document ID |
| `businessId` | `string` | Parent tenant ID |
| `token` | `string` | Cryptographically random string (min 24 chars, generated server-side) |
| `customerId` | `string \| null` | Reference to assigned `Customer` |
| `membershipId` | `string \| null` | Reference to assigned `Membership` |
| `status` | `string` | `"unassigned"` \| `"active"` \| `"blocked"` \| `"replaced"` |
| `issuedAt` | `Timestamp \| null` | Assignment timestamp |
| `createdAt` | `Timestamp` | Record creation timestamp |
| `updatedAt` | `Timestamp` | Record last update timestamp |

#### Denormalization & Rationale:
- `customerId` and `membershipId` are reference pointers. If a card is blocked or replaced, `status` changes to `"blocked"` and a new `NFCCard` document is issued to the same `membershipId`.

---

### Entity 8: `LoyaltyProgram`
- **Collection Path**: `/businesses/{businessId}/loyalty_programs/{programId}`
- **Document ID**: `{programId}`
- **Description**: Defines a business's active loyalty scheme container.

#### Schema Fields:
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `programId` | `string` | Unique program ID |
| `businessId` | `string` | Parent tenant ID |
| `name` | `string` | Program title (e.g. "VIP Coffee Club") |
| `description` | `string` | Detailed rules explanation |
| `isActive` | `boolean` | State toggle for program execution |
| `createdAt` | `Timestamp` | Record creation timestamp |
| `updatedAt` | `Timestamp` | Record last update timestamp |

#### Denormalization & Rationale:
- Acts as a top-level container for `LoyaltyRule` items.

---

### Entity 9: `LoyaltyRule`
- **Collection Path**: `/businesses/{businessId}/loyalty_programs/{programId}/loyalty_rules/{ruleId}`
- **Document ID**: `{ruleId}`
- **Description**: Configurable milestone rule within a loyalty program (e.g., "5 visits -> Free Espresso").

#### Schema Fields:
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `ruleId` | `string` | Unique rule ID |
| `programId` | `string` | Parent program ID |
| `businessId` | `string` | Parent tenant ID |
| `visitThreshold` | `number` | Visit count required to trigger reward |
| `rewardTitle` | `string` | Display name of reward |
| `rewardDescription` | `string` | Reward details |
| `isActive` | `boolean` | State toggle |
| `createdAt` | `Timestamp` | Record creation timestamp |
| `updatedAt` | `Timestamp` | Record last update timestamp |

#### Denormalization & Rationale:
- Business-configured rule objects stored as data (never hardcoded in application logic).

---

### Entity 10: `Visit`
- **Collection Path**: `/businesses/{businessId}/visits/{visitId}`
- **Document ID**: `{visitId}`
- **Description**: An immutable audit log of a validated customer visit.

#### Schema Fields:
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `visitId` | `string` | Unique visit record ID |
| `businessId` | `string` | Parent tenant ID |
| `customerId` | `string` | Linked customer ID |
| `membershipId` | `string` | Linked membership ID |
| `cardId` | `string \| null` | NFC card ID present during visit |
| `visitedAt` | `Timestamp` | UTC server timestamp of visit |
| `visitDateLocal` | `string` | Format `YYYY-MM-DD` in business timezone (for 1-visit/day check) |
| `verificationMethod` | `string` | `"merchant_pin"` (MVP default, extensible) |
| `staffUserId` | `string \| null` | Admin ID who validated PIN |
| `createdAt` | `Timestamp` | Log creation timestamp |

#### Denormalization & Rationale:
- `visitDateLocal` is **denormalized** from UTC `visitedAt` using the business's timezone. This allows standard Firestore equality queries (`where("visitDateLocal", "==", currentDate)`) for single-visit daily restriction enforcement without timezone calculation overhead on every read.

---

### Entity 11: `Reward`
- **Collection Path**: `/businesses/{businessId}/rewards/{rewardId}`
- **Document ID**: `{rewardId}`
- **Description**: Resolved reward earned or redeemed by a customer at a specific point in time.

#### Schema Fields:
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `rewardId` | `string` | Unique reward record ID |
| `businessId` | `string` | Parent tenant ID |
| `customerId` | `string` | Linked customer ID |
| `membershipId` | `string` | Linked membership ID |
| `ruleId` | `string` | Originating `LoyaltyRule` ID |
| `rewardTitle` | `string` | Snapshot of reward title at earning time |
| `rewardDescription` | `string` | Snapshot of reward description |
| `status` | `string` | `"unlocked"` \| `"claimed"` \| `"expired"` |
| `unlockedAt` | `Timestamp` | Timestamp when threshold was met |
| `claimedAt` | `Timestamp \| null` | Timestamp when merchant fulfilled reward |
| `createdAt` | `Timestamp` | Record creation timestamp |
| `updatedAt` | `Timestamp` | Record last update timestamp |

#### Denormalization & Rationale:
- `rewardTitle` and `rewardDescription` are **snapshotted** from `LoyaltyRule`. If a merchant subsequently edits or deletes a `LoyaltyRule`, the customer's historical earned/claimed `Reward` retains its original title and terms.

---

## 3. Core Technical & Architectural Assumptions

Before proceeding to Phase 2, the following assumptions are established:

1. **Merchant PIN Hashing**: `merchantPinHash` in the `Business` document will be stored as a cryptographic hash (e.g., Argon2id or salted SHA-256) and verified exclusively inside Cloud Functions. The plain-text PIN will never exist in client memory or Firestore reads.
2. **NFC Token Lookup Indexing**: Card URLs format: `https://<domain>/t/<token>`. Finding an NFC card via token will rely on a single-field Firestore index on `nfc_cards` collection matching `token`.
3. **Calendar Day Computation**: Business timezone strings follow IANA standard names (e.g., `"America/New_York"`, `"Asia/Kolkata"`). Server-side Cloud Functions use `Intl.DateTimeFormat` with the business timezone to evaluate `visitDateLocal`.
4. **Phone OTP Auth for Customers**: Customers authenticate via Firebase Auth Phone Provider. Customer UIDs map to Firebase Auth users, with access constrained to their own `customerId` via Security Rules.
5. **Membership Plan Billing**: `MembershipPlan` entity is established as a stub for future billing integration (Stripe/RevenueCat), requiring no active billing SDK in Phase 1/2.
