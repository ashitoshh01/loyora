import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../lib/firebase";

export interface NFCCardEntity {
  cardId: string;
  businessId: string;
  token: string;
  status: "unassigned" | "active" | "blocked";
  customerId: string | null;
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
}

/**
 * Realtime listener for NFC Cards scoped to a business tenant.
 */
export function subscribeToBusinessCards(
  businessId: string,
  callback: (cards: NFCCardEntity[]) => void,
  onError?: (err: Error) => void
) {
  if (!businessId) {
    callback([]);
    return () => {};
  }

  const cardsColl = collection(db, "businesses", businessId, "nfc_cards");
  const qCards = query(cardsColl, orderBy("createdAt", "desc"));

  return onSnapshot(
    qCards,
    (snapshot) => {
      const cardList: NFCCardEntity[] = snapshot.docs.map((docSnap) => ({
        cardId: docSnap.id,
        ...docSnap.data(),
      })) as NFCCardEntity[];
      callback(cardList);
    },
    (err) => {
      console.error("Error subscribing to NFC cards:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Cloud Function wrapper: generateCardToken
 */
export async function generateCardTokenApi(businessId: string): Promise<{ cardId: string; token: string }> {
  const fn = httpsCallable<{ businessId: string }, { success: boolean; cardId: string; token: string }>(
    functions,
    "generateCardToken"
  );
  const result = await fn({ businessId });
  return { cardId: result.data.cardId, token: result.data.token };
}

/**
 * Cloud Function wrapper: assignCardToCustomer
 */
export async function assignCardToCustomerApi(
  cardId: string,
  customerId: string,
  businessId: string
): Promise<void> {
  const fn = httpsCallable<
    { cardId: string; customerId: string; businessId: string },
    { success: boolean }
  >(functions, "assignCardToCustomer");
  await fn({ cardId, customerId, businessId });
}

/**
 * Cloud Function wrapper: blockCard
 */
export async function blockCardApi(cardId: string, businessId: string): Promise<void> {
  const fn = httpsCallable<{ cardId: string; businessId: string }, { success: boolean }>(
    functions,
    "blockCard"
  );
  await fn({ cardId, businessId });
}

/**
 * Cloud Function wrapper: replaceCard
 */
export async function replaceCardApi(
  oldCardId: string,
  customerId: string,
  businessId: string
): Promise<{ newCardId: string; newToken: string }> {
  const fn = httpsCallable<
    { oldCardId: string; customerId: string; businessId: string },
    { success: boolean; newCardId: string; newToken: string }
  >(functions, "replaceCard");
  const result = await fn({ oldCardId, customerId, businessId });
  return { newCardId: result.data.newCardId, newToken: result.data.newToken };
}
