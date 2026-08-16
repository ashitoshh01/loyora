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
exports.recordVisit = exports.setUserRole = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
/**
 * Callable Cloud Function to assign roles and custom claims to users.
 * Server-side enforced: Only super_admin accounts can set user roles.
 */
exports.setUserRole = (0, https_1.onCall)(async (request) => {
    // 1. Verify Caller Authentication
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication is required to assign user roles.");
    }
    // 2. Enforce super_admin Role Constraint on Caller
    const callerRole = request.auth.token.role;
    if (callerRole !== "super_admin") {
        throw new https_1.HttpsError("permission-denied", "Only platform super_admin users are authorized to assign roles.");
    }
    // 3. Validate Request Data
    const data = request.data;
    const { targetUid, role, businessId } = data;
    if (!targetUid || typeof targetUid !== "string") {
        throw new https_1.HttpsError("invalid-argument", "targetUid string is required.");
    }
    if (!["super_admin", "business_admin", "customer"].includes(role)) {
        throw new https_1.HttpsError("invalid-argument", "Invalid role provided. Allowed: 'super_admin', 'business_admin', 'customer'.");
    }
    if (role === "business_admin" && (!businessId || typeof businessId !== "string")) {
        throw new https_1.HttpsError("invalid-argument", "businessId string is required when assigning 'business_admin' role.");
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
 * Placeholder Cloud Function for Flow B - Merchant PIN visit recording.
 */
exports.recordVisit = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated to record a visit.");
    }
    return { success: false, message: "Not implemented yet" };
});
//# sourceMappingURL=index.js.map