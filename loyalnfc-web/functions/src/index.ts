import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

/**
 * Placeholder Cloud Function for Flow B - Merchant PIN visit recording.
 * Implementation will be fleshed out in subsequent phases.
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
