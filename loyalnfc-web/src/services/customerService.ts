import {
  collection,
  doc,
  writeBatch,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  getDocs,
  Timestamp,
} from "firebase/firestore";

import { db } from "../lib/firebase";

export interface CustomerEntity {
  customerId: string;
  businessId: string;
  phoneNumber: string;
  fullName: string;
  email: string | null;
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
}

export interface MembershipEntity {
  membershipId: string;
  customerId: string;
  businessId: string;
  totalVisits: number;
  tierLevel: string;
  status: "active" | "paused" | "cancelled" | "pending";
  currentReward?: string | null;
  nextMilestone?: number | null;
  nextReward?: string | null;
  visitsRemaining?: number | null;
  expiresAt?: Timestamp | any | null;
  joinedAt: Timestamp | any;
  lastVisitAt: Timestamp | any | null;
  updatedAt: Timestamp | any;
}

export interface CustomerWithMembership extends CustomerEntity {
  membership?: MembershipEntity;
  assignedCardId?: string | null;
}

/**
 * Realtime listener for customers and their 1:1 memberships scoped strictly to businessId.
 */
export function subscribeToBusinessCustomers(
  businessId: string,
  callback: (customers: CustomerWithMembership[]) => void,
  onError?: (err: Error) => void
) {
  if (!businessId) {
    callback([]);
    return () => {};
  }

  const customersColl = collection(db, "businesses", businessId, "customers");
  const membershipsColl = collection(db, "businesses", businessId, "memberships");
  const cardsColl = collection(db, "businesses", businessId, "nfc_cards");

  const qCustomers = query(customersColl, orderBy("createdAt", "desc"));

  return onSnapshot(
    qCustomers,
    async (customerSnap) => {
      try {
        const customerList: CustomerEntity[] = customerSnap.docs.map((docSnap) => ({
          customerId: docSnap.id,
          ...docSnap.data(),
        })) as CustomerEntity[];

        // Fetch memberships snapshot
        const memSnap = await getDocs(membershipsColl);
        const memMap = new Map<string, MembershipEntity>();
        memSnap.docs.forEach((d) => {
          memMap.set(d.id, { membershipId: d.id, ...d.data() } as MembershipEntity);
        });

        // Fetch cards snapshot to map assigned card
        const cardSnap = await getDocs(cardsColl);
        const cardMap = new Map<string, string>(); // customerId -> cardId
        cardSnap.docs.forEach((d) => {
          const cData = d.data();
          if (cData.customerId && cData.status === "active") {
            cardMap.set(cData.customerId, d.id);
          }
        });

        const combined: CustomerWithMembership[] = customerList.map((cust) => ({
          ...cust,
          membership: memMap.get(cust.customerId),
          assignedCardId: cardMap.get(cust.customerId) || null,
        }));

        callback(combined);
      } catch (err: any) {
        console.error("Error fetching memberships for customers:", err);
        if (onError) onError(err);
      }
    },
    (err) => {
      console.error("Error listening to customers:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Create a new Customer document along with linked Membership (status = "pending").
 */
export async function createCustomer(
  businessId: string,
  payload: {
    fullName: string;
    phoneNumber: string;
    email?: string;
  }
): Promise<{ customerId: string }> {
  if (!businessId) throw new Error("businessId is required.");

  const customerId = `cust_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const now = serverTimestamp();

  const customerRef = doc(db, "businesses", businessId, "customers", customerId);
  const membershipRef = doc(db, "businesses", businessId, "memberships", customerId);

  const batch = writeBatch(db);

  // 1. Create Customer Document
  batch.set(customerRef, {
    customerId,
    businessId,
    phoneNumber: payload.phoneNumber.trim(),
    fullName: payload.fullName.trim(),
    email: payload.email?.trim() || null,
    createdAt: now,
    updatedAt: now,
  });

  // 2. Create Linked Membership Document (status = "pending", no card assigned yet)
  batch.set(membershipRef, {
    membershipId: customerId,
    customerId,
    businessId,
    totalVisits: 0,
    tierLevel: "Bronze",
    status: "pending",
    currentReward: null,
    expiresAt: null,
    joinedAt: now,
    lastVisitAt: null,
    updatedAt: now,
  });

  await batch.commit();

  return { customerId };
}

/**
 * Update Customer details (fullName and email).
 */
export async function updateCustomer(
  businessId: string,
  customerId: string,
  payload: {
    fullName: string;
    email?: string;
  }
) {
  const customerRef = doc(db, "businesses", businessId, "customers", customerId);
  await updateDoc(customerRef, {
    fullName: payload.fullName.trim(),
    email: payload.email?.trim() || null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Soft delete / Deactivate a customer membership (sets status = "cancelled").
 */
export async function deactivateCustomerMembership(
  businessId: string,
  customerId: string
) {
  const membershipRef = doc(db, "businesses", businessId, "memberships", customerId);
  await updateDoc(membershipRef, {
    status: "cancelled",
    updatedAt: serverTimestamp(),
  });
}

/**
 * Reactivate a customer membership (sets status = "active" or "pending").
 */
export async function reactivateCustomerMembership(
  businessId: string,
  customerId: string,
  newStatus: "active" | "pending" = "active"
) {
  const membershipRef = doc(db, "businesses", businessId, "memberships", customerId);
  await updateDoc(membershipRef, {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });
}
