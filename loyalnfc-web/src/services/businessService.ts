import {
  collection,
  getCountFromServer,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";

import { httpsCallable } from "firebase/functions";
import { db, functions } from "../lib/firebase";

export interface BusinessEntity {
  businessId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  merchantPinHash?: string;
  timezone: string;
  planId: string;
  status: "active" | "suspended" | "pending";
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
}

export interface BusinessSummaryStats {
  customerCount: number;
  cardCount: number;
  visitCount: number;
}

/**
 * Realtime listener for business tenants collection.
 */
export function subscribeToBusinesses(
  callback: (businesses: BusinessEntity[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(collection(db, "businesses"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: BusinessEntity[] = snapshot.docs.map((docSnap) => ({
        businessId: docSnap.id,
        ...docSnap.data(),
      })) as BusinessEntity[];
      callback(list);
    },
    (err) => {
      console.error("Error listening to businesses:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Fetch aggregate read-only stats for a business without exposing customer PII.
 */
export async function getBusinessAggregateStats(
  businessId: string
): Promise<BusinessSummaryStats> {
  try {
    const customersColl = collection(db, "businesses", businessId, "customers");
    const cardsColl = collection(db, "businesses", businessId, "nfc_cards");
    const visitsColl = collection(db, "businesses", businessId, "visits");

    const [customerSnap, cardSnap, visitSnap] = await Promise.all([
      getCountFromServer(customersColl),
      getCountFromServer(cardsColl),
      getCountFromServer(visitsColl),
    ]);

    return {
      customerCount: customerSnap.data().count,
      cardCount: cardSnap.data().count,
      visitCount: visitSnap.data().count,
    };
  } catch (err) {
    console.error(`Error fetching aggregate stats for ${businessId}:`, err);
    return { customerCount: 0, cardCount: 0, visitCount: 0 };
  }
}

/**
 * Call createBusiness Cloud Function.
 */
export async function createBusinessTenant(payload: {
  name: string;
  slug: string;
  timezone: string;
  planId?: string;
  merchantPin: string;
  adminEmail?: string;
  adminDisplayName?: string;
}) {
  const createBusinessFn = httpsCallable(functions, "createBusiness");
  const res = await createBusinessFn(payload);
  return res.data as any;
}

/**
 * Call updateBusinessStatus Cloud Function.
 */
export async function updateBusinessTenantStatus(
  businessId: string,
  status: "active" | "suspended" | "pending"
) {
  const updateStatusFn = httpsCallable(functions, "updateBusinessStatus");
  const res = await updateStatusFn({ businessId, status });
  return res.data as any;
}
