"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordVisit = exports.resolveCardToken = exports.replaceCard = exports.blockCard = exports.assignCardToCustomer = exports.generateCardToken = exports.updateBusinessStatus = exports.createBusiness = exports.setUserRole = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("crypto"));
admin.initializeApp();
const db = admin.firestore();
/**
 * Utility to compute SHA-256 hash for Merchant PIN (Flow B).
 */
function hashMerchantPin(pin) {
    return crypto.createHash("sha256").update(pin).digest("hex");
}
/**
 * Callable Cloud Function to assign roles and custom claims to users.
 * Server-side enforced: Only super_admin accounts can set user roles.
 */
exports.setUserRole = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication is required to assign user roles.");
    }
    const callerRole = request.auth.token.role;
    if (callerRole !== "super_admin") {
        throw new https_1.HttpsError("permission-denied", "Only platform super_admin users are authorized to assign roles.");
    }
    const data = request.data;
    const { targetUid, role, businessId } = data;
    if (!targetUid || typeof targetUid !== "string") {
        throw new https_1.HttpsError("invalid-argument", "targetUid string is required.");
    }
    if (!["super_admin", "business_admin", "customer"].includes(role)) {
        throw new https_1.HttpsError("invalid-argument", "Invalid role provided.");
    }
    if (role === "business_admin" && (!businessId || typeof businessId !== "string")) {
        throw new https_1.HttpsError("invalid-argument", "businessId string is required when assigning 'business_admin' role.");
    }
    try {
        const customClaims = {
            role,
            businessId: businessId || null,
        };
        await admin.auth().setCustomUserClaims(targetUid, customClaims);
        const now = admin.firestore.FieldValue.serverTimestamp();
        if (role === "super_admin") {
            await db.collection("platform_users").doc(targetUid).set({
                userId: targetUid,
                role: "super_admin",
                updatedAt: now,
            }, { merge: true });
        }
        else if (role === "business_admin" && businessId) {
            await db
                .collection("businesses")
                .doc(businessId)
                .collection("business_admins")
                .doc(targetUid)
                .set({
                adminId: targetUid,
                businessId,
                role: "business_admin",
                updatedAt: now,
            }, { merge: true });
        }
        return {
            success: true,
            targetUid,
            role,
            businessId: businessId || null,
            message: `Successfully set custom claims for user ${targetUid}`,
        };
    }
    catch (error) {
        console.error("Error setting custom user claims:", error);
        throw new https_1.HttpsError("internal", error.message || "Failed to set custom user claims.");
    }
});
/**
 * Callable Cloud Function for Super Admin to create a new Business Tenant.
 * Provisions the Business document and creates/invites the initial Business Admin.
 */
exports.createBusiness = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required to create a business.");
    }
    if (request.auth.token.role !== "super_admin") {
        throw new https_1.HttpsError("permission-denied", "Only platform super_admin users can create business tenants.");
    }
    const data = request.data;
    const { name, slug, timezone, planId, merchantPin, adminEmail, adminDisplayName } = data;
    if (!name || !name.trim()) {
        throw new https_1.HttpsError("invalid-argument", "Business name is required.");
    }
    if (!slug || !slug.trim()) {
        throw new https_1.HttpsError("invalid-argument", "Business slug is required.");
    }
    if (!merchantPin || merchantPin.length < 4) {
        throw new https_1.HttpsError("invalid-argument", "Merchant PIN must be at least 4 digits.");
    }
    const sanitizedSlug = slug.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const businessId = `biz_${sanitizedSlug}_${Date.now().toString(36)}`;
    const merchantPinHash = hashMerchantPin(merchantPin);
    const now = admin.firestore.FieldValue.serverTimestamp();
    try {
        // 1. Create Business Document strictly following DATA_MODEL.md
        await db.collection("businesses").doc(businessId).set({
            businessId,
            name: name.trim(),
            slug: sanitizedSlug,
            logoUrl: null,
            merchantPinHash,
            timezone: timezone || "UTC",
            planId: planId || "plan_starter",
            status: "active",
            createdAt: now,
            updatedAt: now,
        });
        let adminUid = null;
        // 2. Provision Initial Business Admin if email provided
        if (adminEmail && adminEmail.trim()) {
            const cleanEmail = adminEmail.trim().toLowerCase();
            let userRecord;
            try {
                userRecord = await admin.auth().getUserByEmail(cleanEmail);
            }
            catch (err) {
                if (err.code === "auth/user-not-found") {
                    // Create temporary password for initial invite
                    const tempPassword = `Loyal#${crypto.randomBytes(4).toString("hex")}`;
                    userRecord = await admin.auth().createUser({
                        email: cleanEmail,
                        displayName: adminDisplayName || `${name.trim()} Admin`,
                        password: tempPassword,
                    });
                }
                else {
                    throw err;
                }
            }
            adminUid = userRecord.uid;
            // Assign custom claims for business_admin
            await admin.auth().setCustomUserClaims(adminUid, {
                role: "business_admin",
                businessId,
            });
            // Write business_admins subcollection record
            await db
                .collection("businesses")
                .doc(businessId)
                .collection("business_admins")
                .doc(adminUid)
                .set({
                adminId: adminUid,
                businessId,
                email: cleanEmail,
                displayName: adminDisplayName || `${name.trim()} Admin`,
                role: "business_admin",
                createdAt: now,
                updatedAt: now,
            });
        }
        return {
            success: true,
            businessId,
            name: name.trim(),
            slug: sanitizedSlug,
            adminUid,
            message: `Business tenant '${name}' created successfully.`,
        };
    }
    catch (error) {
        console.error("Error creating business tenant:", error);
        throw new https_1.HttpsError("internal", error.message || "Failed to create business tenant.");
    }
});
/**
 * Callable Cloud Function for Super Admin to update Business Status (active, suspended, pending).
 */
exports.updateBusinessStatus = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required to update business status.");
    }
    if (request.auth.token.role !== "super_admin") {
        throw new https_1.HttpsError("permission-denied", "Only platform super_admin users can update business status.");
    }
    const data = request.data;
    const { businessId, status } = data;
    if (!businessId || typeof businessId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "businessId string is required.");
    }
    if (!["active", "suspended", "pending"].includes(status)) {
        throw new https_1.HttpsError("invalid-argument", "Invalid status provided.");
    }
    try {
        await db.collection("businesses").doc(businessId).update({
            status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
            success: true,
            businessId,
            status,
            message: `Updated status of business ${businessId} to ${status}.`,
        };
    }
    catch (error) {
        console.error("Error updating business status:", error);
        throw new https_1.HttpsError("internal", error.message || "Failed to update business status.");
    }
});
/**
 * Helper to validate caller role and get target businessId.
 */
function getCallerBusinessId(request, targetBusinessId) {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const role = request.auth.token.role;
    if (role === "super_admin") {
        if (!targetBusinessId) {
            throw new https_1.HttpsError("invalid-argument", "businessId is required for super_admin.");
        }
        return targetBusinessId;
    }
    if (role === "business_admin") {
        const callerBizId = request.auth.token.businessId;
        if (!callerBizId) {
            throw new https_1.HttpsError("permission-denied", "User custom claim is missing businessId.");
        }
        if (targetBusinessId && targetBusinessId !== callerBizId) {
            throw new https_1.HttpsError("permission-denied", "Cannot access cards of another business.");
        }
        return callerBizId;
    }
    throw new https_1.HttpsError("permission-denied", "Only business_admin or super_admin can manage NFC cards.");
}
/**
 * Cloud Function generateCardToken
 * Creates a new NFCCard document with a random, non-sequential, opaque token (min 24 chars, crypto.randomBytes-based).
 */
exports.generateCardToken = (0, https_1.onCall)(async (request) => {
    const data = request.data || {};
    const businessId = getCallerBusinessId(request, data.businessId);
    // Opaque random token (32 hex characters = 16 random bytes)
    const token = crypto.randomBytes(16).toString("hex");
    const cardId = `card_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
    const now = admin.firestore.FieldValue.serverTimestamp();
    const cardRef = db
        .collection("businesses")
        .doc(businessId)
        .collection("nfc_cards")
        .doc(cardId);
    await cardRef.set({
        cardId,
        businessId,
        token,
        status: "unassigned",
        customerId: null,
        createdAt: now,
        updatedAt: now,
    });
    return {
        success: true,
        cardId,
        token,
        businessId,
    };
});
/**
 * Cloud Function assignCardToCustomer(cardId, customerId)
 * Assigns an unassigned card to a customer, sets activation date/expiry date on membership, and updates membership status to active.
 */
exports.assignCardToCustomer = (0, https_1.onCall)(async (request) => {
    const data = request.data || {};
    const { cardId, customerId } = data;
    if (!cardId || typeof cardId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "cardId string is required.");
    }
    if (!customerId || typeof customerId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "customerId string is required.");
    }
    const businessId = getCallerBusinessId(request, data.businessId);
    const cardRef = db
        .collection("businesses")
        .doc(businessId)
        .collection("nfc_cards")
        .doc(cardId);
    const cardSnap = await cardRef.get();
    if (!cardSnap.exists) {
        throw new https_1.HttpsError("not-found", `NFC Card ${cardId} not found.`);
    }
    const membershipRef = db
        .collection("businesses")
        .doc(businessId)
        .collection("memberships")
        .doc(customerId);
    const membershipSnap = await membershipRef.get();
    if (!membershipSnap.exists) {
        throw new https_1.HttpsError("not-found", `Membership for customer ${customerId} not found.`);
    }
    // Calculate default membership duration (1 year = 365 days from now)
    const now = admin.firestore.Timestamp.now();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    const expiryDate = admin.firestore.Timestamp.fromMillis(now.toMillis() + oneYearMs);
    const batch = db.batch();
    // 1. Update Card status and customerId
    batch.update(cardRef, {
        customerId,
        status: "active",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // 2. Update Membership status, activationDate, and expiresAt
    batch.update(membershipRef, {
        status: "active",
        activationDate: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: expiryDate,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return {
        success: true,
        cardId,
        customerId,
        businessId,
    };
});
/**
 * Cloud Function blockCard(cardId)
 * Sets card status to blocked.
 */
exports.blockCard = (0, https_1.onCall)(async (request) => {
    const data = request.data || {};
    const { cardId } = data;
    if (!cardId || typeof cardId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "cardId string is required.");
    }
    const businessId = getCallerBusinessId(request, data.businessId);
    const cardRef = db
        .collection("businesses")
        .doc(businessId)
        .collection("nfc_cards")
        .doc(cardId);
    const cardSnap = await cardRef.get();
    if (!cardSnap.exists) {
        throw new https_1.HttpsError("not-found", `NFC Card ${cardId} not found.`);
    }
    await cardRef.update({
        status: "blocked",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
        success: true,
        cardId,
        businessId,
    };
});
/**
 * Cloud Function replaceCard(oldCardId, customerId)
 * Blocks old card, generates a NEW card+token, assigns it to the same customer,
 * and MUST NOT touch customer visit history or loyalty level in any way.
 */
exports.replaceCard = (0, https_1.onCall)(async (request) => {
    const data = request.data || {};
    const { oldCardId, customerId } = data;
    if (!oldCardId || typeof oldCardId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "oldCardId string is required.");
    }
    if (!customerId || typeof customerId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "customerId string is required.");
    }
    const businessId = getCallerBusinessId(request, data.businessId);
    const oldCardRef = db
        .collection("businesses")
        .doc(businessId)
        .collection("nfc_cards")
        .doc(oldCardId);
    const oldCardSnap = await oldCardRef.get();
    if (!oldCardSnap.exists) {
        throw new https_1.HttpsError("not-found", `Old NFC Card ${oldCardId} not found.`);
    }
    // Generate new card & opaque token (32 hex characters)
    const newToken = crypto.randomBytes(16).toString("hex");
    const newCardId = `card_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
    const now = admin.firestore.FieldValue.serverTimestamp();
    const newCardRef = db
        .collection("businesses")
        .doc(businessId)
        .collection("nfc_cards")
        .doc(newCardId);
    const batch = db.batch();
    // 1. Block old card
    batch.update(oldCardRef, {
        status: "blocked",
        updatedAt: now,
    });
    // 2. Create new active card assigned to customer
    batch.set(newCardRef, {
        cardId: newCardId,
        businessId,
        token: newToken,
        status: "active",
        customerId,
        createdAt: now,
        updatedAt: now,
    });
    // NOTE: Customer visit history and loyalty tier levels are strictly preserved/untouched.
    await batch.commit();
    return {
        success: true,
        oldCardId,
        newCardId,
        newToken,
        customerId,
        businessId,
    };
});
/**
 * Helper to compute YYYY-MM-DD date key in configured timezone (default: Asia/Kolkata).
 */
function getTodayDateKey(timezoneStr = "Asia/Kolkata") {
    try {
        const formatter = new Intl.DateTimeFormat("en-CA", {
            timeZone: timezoneStr,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
        return formatter.format(new Date());
    }
    catch (_err) {
        const formatter = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
        return formatter.format(new Date());
    }
}
/**
 * Modular visit verification logic.
 * Structured so verification (Flow B: Merchant PIN) can later be swapped for
 * alternative verification flows (e.g. merchant dashboard websocket, dynamic OTP)
 * without altering the Visit schema or visit recording logic.
 */
async function verifyVisitAuthorization(businessData, verificationData) {
    if (verificationData.method === "merchant_pin") {
        if (!verificationData.pin)
            return false;
        const inputPinHash = hashMerchantPin(verificationData.pin);
        return inputPinHash === businessData.merchantPinHash;
    }
    return false;
}
/**
 * Public Cloud Function: resolveCardToken(token)
 * Unauthenticated callable function for NFC tap resolution.
 * Returns ONLY minimal information required to render tap UI:
 * - businessName
 * - customerFirstName
 * - totalVisits
 * - tierLevel
 * - alreadyVisitedToday
 * Does NOT expose raw token, phone numbers, or other customer data.
 */
exports.resolveCardToken = (0, https_1.onCall)(async (request) => {
    const token = request.data?.token;
    if (!token || typeof token !== "string") {
        throw new https_1.HttpsError("invalid-argument", "Token string is required.");
    }
    const cleanToken = token.trim();
    // 1. Lookup Card by token across collection group
    const cardSnap = await db
        .collectionGroup("nfc_cards")
        .where("token", "==", cleanToken)
        .limit(1)
        .get();
    if (cardSnap.empty) {
        return {
            status: "invalid_card",
            message: "This NFC card token is invalid or unrecognized.",
        };
    }
    const cardDoc = cardSnap.docs[0];
    const cardData = cardDoc.data();
    const { businessId, customerId, status: cardStatus } = cardData;
    if (cardStatus !== "active") {
        return {
            status: "card_blocked",
            cardStatus,
            message: `This NFC card status is currently ${cardStatus}.`,
        };
    }
    if (!customerId) {
        return {
            status: "unassigned_card",
            message: "This NFC card has not been assigned to a customer yet.",
        };
    }
    // 2. Fetch Business Document
    const bizSnap = await db.collection("businesses").doc(businessId).get();
    if (!bizSnap.exists) {
        return {
            status: "business_not_found",
            message: "Associated business tenant was not found.",
        };
    }
    const bizData = bizSnap.data() || {};
    if (bizData.status === "suspended") {
        return {
            status: "business_suspended",
            message: "This merchant account is currently suspended.",
        };
    }
    // 3. Fetch Customer Document
    const customerSnap = await db
        .collection("businesses")
        .doc(businessId)
        .collection("customers")
        .doc(customerId)
        .get();
    if (!customerSnap.exists) {
        return {
            status: "customer_not_found",
            message: "Associated customer profile not found.",
        };
    }
    const customerData = customerSnap.data() || {};
    // 4. Fetch Membership Document
    const memSnap = await db
        .collection("businesses")
        .doc(businessId)
        .collection("memberships")
        .doc(customerId)
        .get();
    const memData = memSnap.data() || {};
    if (memData.status === "cancelled") {
        return {
            status: "membership_cancelled",
            message: "Customer membership pass has been deactivated.",
        };
    }
    // Check Expiry
    if (memData.expiresAt) {
        const expiresAt = memData.expiresAt.toDate
            ? memData.expiresAt.toDate()
            : new Date(memData.expiresAt);
        if (expiresAt < new Date()) {
            return {
                status: "membership_expired",
                message: "Customer membership pass has expired.",
            };
        }
    }
    // 5. Check if visit already recorded today in business timezone
    const timezone = bizData.timezone || "Asia/Kolkata";
    const todayDateKey = getTodayDateKey(timezone);
    const visitsSnap = await db
        .collection("businesses")
        .doc(businessId)
        .collection("visits")
        .where("customerId", "==", customerId)
        .where("dateKey", "==", todayDateKey)
        .limit(1)
        .get();
    const alreadyVisitedToday = !visitsSnap.empty;
    const fullName = customerData.fullName || "Valued Customer";
    const customerFirstName = fullName.split(" ")[0];
    return {
        status: "valid",
        businessName: bizData.name || "Merchant Partner",
        customerFirstName,
        totalVisits: memData.totalVisits || 0,
        tierLevel: memData.tierLevel || "Bronze",
        alreadyVisitedToday,
    };
});
/**
 * Public Cloud Function: recordVisit(token, businessPin)
 * Server-side execution only:
 * - Verifies businessPin hash against stored merchantPinHash.
 * - Enforces max 1 visit per customer per business per calendar day in configured timezone.
 * - Creates Visit document and increments Membership.totalVisits.
 * - Same-day duplicate taps return "already_visited" status without duplicating counts.
 */
exports.recordVisit = (0, https_1.onCall)(async (request) => {
    const data = request.data || {};
    const { token, businessPin } = data;
    if (!token || typeof token !== "string") {
        throw new https_1.HttpsError("invalid-argument", "token is required.");
    }
    if (!businessPin || typeof businessPin !== "string") {
        throw new https_1.HttpsError("invalid-argument", "businessPin is required.");
    }
    const cleanToken = token.trim();
    // 1. Lookup Card
    const cardSnap = await db
        .collectionGroup("nfc_cards")
        .where("token", "==", cleanToken)
        .limit(1)
        .get();
    if (cardSnap.empty) {
        throw new https_1.HttpsError("not-found", "Invalid NFC card token.");
    }
    const cardDoc = cardSnap.docs[0];
    const cardData = cardDoc.data();
    const { cardId, businessId, customerId, status: cardStatus } = cardData;
    if (cardStatus !== "active") {
        throw new https_1.HttpsError("failed-precondition", `NFC card status is currently ${cardStatus}.`);
    }
    if (!customerId) {
        throw new https_1.HttpsError("failed-precondition", "NFC card is not assigned to a customer.");
    }
    // 2. Fetch Business & Verify PIN via modular verification helper
    const bizRef = db.collection("businesses").doc(businessId);
    const bizSnap = await bizRef.get();
    if (!bizSnap.exists) {
        throw new https_1.HttpsError("not-found", "Associated business tenant not found.");
    }
    const bizData = bizSnap.data() || {};
    if (bizData.status === "suspended") {
        throw new https_1.HttpsError("permission-denied", "Business account is suspended.");
    }
    const isVerified = await verifyVisitAuthorization(bizData, {
        method: "merchant_pin",
        pin: businessPin.trim(),
    });
    if (!isVerified) {
        throw new https_1.HttpsError("permission-denied", "Incorrect Merchant PIN.");
    }
    // 3. Fetch Customer & Membership
    const customerSnap = await db
        .collection("businesses")
        .doc(businessId)
        .collection("customers")
        .doc(customerId)
        .get();
    const customerData = customerSnap.data() || {};
    const customerFirstName = (customerData.fullName || "Customer").split(" ")[0];
    const memRef = db
        .collection("businesses")
        .doc(businessId)
        .collection("memberships")
        .doc(customerId);
    const memSnap = await memRef.get();
    if (!memSnap.exists) {
        throw new https_1.HttpsError("not-found", "Customer membership record not found.");
    }
    const memData = memSnap.data() || {};
    if (memData.status === "cancelled") {
        throw new https_1.HttpsError("failed-precondition", "Customer membership is deactivated.");
    }
    if (memData.expiresAt) {
        const expiresAt = memData.expiresAt.toDate
            ? memData.expiresAt.toDate()
            : new Date(memData.expiresAt);
        if (expiresAt < new Date()) {
            throw new https_1.HttpsError("failed-precondition", "Customer membership pass has expired.");
        }
    }
    // 4. Calendar Day Same-Day Visit Enforcement
    const timezone = bizData.timezone || "Asia/Kolkata";
    const todayDateKey = getTodayDateKey(timezone);
    const visitsColl = db
        .collection("businesses")
        .doc(businessId)
        .collection("visits");
    const existingVisits = await visitsColl
        .where("customerId", "==", customerId)
        .where("dateKey", "==", todayDateKey)
        .limit(1)
        .get();
    if (!existingVisits.empty) {
        return {
            success: false,
            status: "already_visited",
            message: "Visit already recorded today for this customer.",
            customerFirstName,
            totalVisits: memData.totalVisits || 0,
        };
    }
    // 5. Atomic Creation of Visit Document & Increment Total Visits
    const visitId = `visit_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
    const visitRef = visitsColl.doc(visitId);
    const now = admin.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();
    batch.set(visitRef, {
        visitId,
        businessId,
        customerId,
        cardId,
        dateKey: todayDateKey,
        verificationMethod: "merchant_pin",
        recordedAt: now,
    });
    const updatedVisits = (memData.totalVisits || 0) + 1;
    batch.update(memRef, {
        totalVisits: admin.firestore.FieldValue.increment(1),
        lastVisitAt: now,
        updatedAt: now,
    });
    await batch.commit();
    return {
        success: true,
        status: "visit_recorded",
        message: "Visit recorded successfully!",
        customerFirstName,
        totalVisits: updatedVisits,
    };
});
//# sourceMappingURL=index.js.map