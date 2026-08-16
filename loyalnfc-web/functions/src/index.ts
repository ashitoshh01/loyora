import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

interface SetUserRoleData {
  targetUid: string;
  role: "super_admin" | "business_admin" | "customer";
  businessId?: string;
}

/**
 * Callable Cloud Function to assign roles and custom claims to users.
 * Server-side enforced: Only super_admin accounts can set user roles.
 */
export const setUserRole = onCall(async (request) => {
  // 1. Verify Caller Authentication
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Authentication is required to assign user roles."
    );
  }

  // 2. Enforce super_admin Role Constraint on Caller
  const callerRole = request.auth.token.role;
  if (callerRole !== "super_admin") {
    throw new HttpsError(
      "permission-denied",
      "Only platform super_admin users are authorized to assign roles."
    );
  }

  // 3. Validate Request Data
  const data = request.data as SetUserRoleData;
  const { targetUid, role, businessId } = data;

  if (!targetUid || typeof targetUid !== "string") {
    throw new HttpsError(
      "invalid-argument",
      "targetUid string is required."
    );
  }

  if (!["super_admin", "business_admin", "customer"].includes(role)) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid role provided. Allowed: 'super_admin', 'business_admin', 'customer'."
    );
  }

  if (role === "business_admin" && (!businessId || typeof businessId !== "string")) {
    throw new HttpsError(
      "invalid-argument",
      "businessId string is required when assigning 'business_admin' role."
    );
  }

  try {
    // 4. Set Custom User Claims on Firebase Auth Account
    const customClaims = {
      role,
      businessId: businessId || null,
    };

    await admin.auth().setCustomUserClaims(targetUid, customClaims);

    // 5. Sync Role Metadata to Firestore Entity Collections
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
