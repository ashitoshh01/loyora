import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

admin.initializeApp();

const db = admin.firestore();

interface SetUserRoleData {
  targetUid: string;
  role: "super_admin" | "business_admin" | "customer";
  businessId?: string;
}

interface CreateBusinessData {
  name: string;
  slug: string;
  timezone: string;
  planId?: string;
  merchantPin: string;
  adminEmail?: string;
  adminDisplayName?: string;
}

interface UpdateBusinessStatusData {
  businessId: string;
  status: "active" | "suspended" | "pending";
}

/**
 * Utility to compute SHA-256 hash for Merchant PIN (Flow B).
 */
function hashMerchantPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

/**
 * Callable Cloud Function to assign roles and custom claims to users.
 * Server-side enforced: Only super_admin accounts can set user roles.
 */
export const setUserRole = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Authentication is required to assign user roles."
    );
  }

  const callerRole = request.auth.token.role;
  if (callerRole !== "super_admin") {
    throw new HttpsError(
      "permission-denied",
      "Only platform super_admin users are authorized to assign roles."
    );
  }

  const data = request.data as SetUserRoleData;
  const { targetUid, role, businessId } = data;

  if (!targetUid || typeof targetUid !== "string") {
    throw new HttpsError("invalid-argument", "targetUid string is required.");
  }

  if (!["super_admin", "business_admin", "customer"].includes(role)) {
    throw new HttpsError("invalid-argument", "Invalid role provided.");
  }

  if (role === "business_admin" && (!businessId || typeof businessId !== "string")) {
    throw new HttpsError(
      "invalid-argument",
      "businessId string is required when assigning 'business_admin' role."
    );
  }

  try {
    const customClaims = {
      role,
      businessId: businessId || null,
    };

    await admin.auth().setCustomUserClaims(targetUid, customClaims);

    const now = admin.firestore.FieldValue.serverTimestamp();

    if (role === "super_admin") {
      await db.collection("platform_users").doc(targetUid).set(
        {
          userId: targetUid,
          role: "super_admin",
          updatedAt: now,
        },
        { merge: true }
      );
    } else if (role === "business_admin" && businessId) {
      await db
        .collection("businesses")
        .doc(businessId)
        .collection("business_admins")
        .doc(targetUid)
        .set(
          {
            adminId: targetUid,
            businessId,
            role: "business_admin",
            updatedAt: now,
          },
          { merge: true }
        );
    }

    return {
      success: true,
      targetUid,
      role,
      businessId: businessId || null,
      message: `Successfully set custom claims for user ${targetUid}`,
    };
  } catch (error: any) {
    console.error("Error setting custom user claims:", error);
    throw new HttpsError(
      "internal",
      error.message || "Failed to set custom user claims."
    );
  }
});

/**
 * Callable Cloud Function for Super Admin to create a new Business Tenant.
 * Provisions the Business document and creates/invites the initial Business Admin.
 */
export const createBusiness = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Authentication required to create a business."
    );
  }

  if (request.auth.token.role !== "super_admin") {
    throw new HttpsError(
      "permission-denied",
      "Only platform super_admin users can create business tenants."
    );
  }

  const data = request.data as CreateBusinessData;
  const { name, slug, timezone, planId, merchantPin, adminEmail, adminDisplayName } = data;

  if (!name || !name.trim()) {
    throw new HttpsError("invalid-argument", "Business name is required.");
  }
  if (!slug || !slug.trim()) {
    throw new HttpsError("invalid-argument", "Business slug is required.");
  }
  if (!merchantPin || merchantPin.length < 4) {
    throw new HttpsError("invalid-argument", "Merchant PIN must be at least 4 digits.");
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

    let adminUid: string | null = null;

    // 2. Provision Initial Business Admin if email provided
    if (adminEmail && adminEmail.trim()) {
      const cleanEmail = adminEmail.trim().toLowerCase();
      let userRecord: admin.auth.UserRecord;

      try {
        userRecord = await admin.auth().getUserByEmail(cleanEmail);
      } catch (err: any) {
        if (err.code === "auth/user-not-found") {
          // Create temporary password for initial invite
          const tempPassword = `Loyal#${crypto.randomBytes(4).toString("hex")}`;
          userRecord = await admin.auth().createUser({
            email: cleanEmail,
            displayName: adminDisplayName || `${name.trim()} Admin`,
            password: tempPassword,
          });
        } else {
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
  } catch (error: any) {
    console.error("Error creating business tenant:", error);
    throw new HttpsError(
      "internal",
      error.message || "Failed to create business tenant."
    );
  }
});

/**
 * Callable Cloud Function for Super Admin to update Business Status (active, suspended, pending).
 */
export const updateBusinessStatus = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Authentication required to update business status."
    );
  }

  if (request.auth.token.role !== "super_admin") {
    throw new HttpsError(
      "permission-denied",
      "Only platform super_admin users can update business status."
    );
  }

  const data = request.data as UpdateBusinessStatusData;
  const { businessId, status } = data;

  if (!businessId || typeof businessId !== "string") {
    throw new HttpsError("invalid-argument", "businessId string is required.");
  }

  if (!["active", "suspended", "pending"].includes(status)) {
    throw new HttpsError("invalid-argument", "Invalid status provided.");
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
  } catch (error: any) {
    console.error("Error updating business status:", error);
    throw new HttpsError(
      "internal",
      error.message || "Failed to update business status."
    );
  }
});

/**
 * Helper to validate caller role and get target businessId.
 */
function getCallerBusinessId(request: any, targetBusinessId?: string): string {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const role = request.auth.token.role;
  if (role === "super_admin") {
    if (!targetBusinessId) {
      throw new HttpsError("invalid-argument", "businessId is required for super_admin.");
    }
    return targetBusinessId;
  }
  if (role === "business_admin") {
    const callerBizId = request.auth.token.businessId;
    if (!callerBizId) {
      throw new HttpsError("permission-denied", "User custom claim is missing businessId.");
    }
    if (targetBusinessId && targetBusinessId !== callerBizId) {
      throw new HttpsError("permission-denied", "Cannot access cards of another business.");
    }
    return callerBizId;
  }
  throw new HttpsError(
    "permission-denied",
    "Only business_admin or super_admin can manage NFC cards."
  );
}

/**
 * Cloud Function generateCardToken
 * Creates a new NFCCard document with a random, non-sequential, opaque token (min 24 chars, crypto.randomBytes-based).
 */
export const generateCardToken = onCall(async (request) => {
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
export const assignCardToCustomer = onCall(async (request) => {
  const data = request.data || {};
  const { cardId, customerId } = data;
  if (!cardId || typeof cardId !== "string") {
    throw new HttpsError("invalid-argument", "cardId string is required.");
  }
  if (!customerId || typeof customerId !== "string") {
    throw new HttpsError("invalid-argument", "customerId string is required.");
  }

  const businessId = getCallerBusinessId(request, data.businessId);

  const cardRef = db
    .collection("businesses")
    .doc(businessId)
    .collection("nfc_cards")
    .doc(cardId);

  const cardSnap = await cardRef.get();
  if (!cardSnap.exists) {
    throw new HttpsError("not-found", `NFC Card ${cardId} not found.`);
  }

  const membershipRef = db
    .collection("businesses")
    .doc(businessId)
    .collection("memberships")
    .doc(customerId);

  const membershipSnap = await membershipRef.get();
  if (!membershipSnap.exists) {
    throw new HttpsError("not-found", `Membership for customer ${customerId} not found.`);
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
export const blockCard = onCall(async (request) => {
  const data = request.data || {};
  const { cardId } = data;
  if (!cardId || typeof cardId !== "string") {
    throw new HttpsError("invalid-argument", "cardId string is required.");
  }

  const businessId = getCallerBusinessId(request, data.businessId);

  const cardRef = db
    .collection("businesses")
    .doc(businessId)
    .collection("nfc_cards")
    .doc(cardId);

  const cardSnap = await cardRef.get();
  if (!cardSnap.exists) {
    throw new HttpsError("not-found", `NFC Card ${cardId} not found.`);
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
export const replaceCard = onCall(async (request) => {
  const data = request.data || {};
  const { oldCardId, customerId } = data;
  if (!oldCardId || typeof oldCardId !== "string") {
    throw new HttpsError("invalid-argument", "oldCardId string is required.");
  }
  if (!customerId || typeof customerId !== "string") {
    throw new HttpsError("invalid-argument", "customerId string is required.");
  }

  const businessId = getCallerBusinessId(request, data.businessId);

  const oldCardRef = db
    .collection("businesses")
    .doc(businessId)
    .collection("nfc_cards")
    .doc(oldCardId);

  const oldCardSnap = await oldCardRef.get();
  if (!oldCardSnap.exists) {
    throw new HttpsError("not-found", `Old NFC Card ${oldCardId} not found.`);
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
 * Placeholder Cloud Function for Flow B - Merchant PIN visit recording.
 */
export const recordVisit = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated to record a visit."
    );
  }
  return { success: false, message: "Not implemented yet" };
});
