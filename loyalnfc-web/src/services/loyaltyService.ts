import {
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export type RewardType =
  | "percentage_discount"
  | "fixed_amount_discount"
  | "free_item"
  | "membership_upgrade"
  | "custom_text";

export interface LoyaltyRuleEntity {
  ruleId: string;
  businessId: string;
  minVisits: number;
  maxVisits: number | null;
  tierName: string;
  rewardType: RewardType;
  rewardValue: string;
  description: string;
  order: number;
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
}

export interface ComputedLoyaltyStatus {
  tierLevel: string;
  currentReward: string;
  nextMilestone: number | null;
  nextReward: string;
  visitsRemaining: number;
}

/**
 * Pure function: Given totalVisits and an array of LoyaltyRules, compute:
 * - tierLevel
 * - currentReward
 * - nextMilestone
 * - nextReward
 * - visitsRemaining
 */
export function computeLoyaltyStatus(
  totalVisits: number,
  rules: LoyaltyRuleEntity[]
): ComputedLoyaltyStatus {
  if (!rules || rules.length === 0) {
    return {
      tierLevel: "Bronze",
      currentReward: "Standard Member",
      nextMilestone: null,
      nextReward: "No higher tiers configured",
      visitsRemaining: 0,
    };
  }

  // Sort rules by minVisits ASC then order ASC
  const sorted = [...rules].sort((a, b) => {
    if (a.minVisits !== b.minVisits) return a.minVisits - b.minVisits;
    return a.order - b.order;
  });

  let activeRule: LoyaltyRuleEntity | null = null;
  let nextRule: LoyaltyRuleEntity | null = null;

  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    if (totalVisits >= r.minVisits) {
      activeRule = r;
    } else {
      nextRule = r;
      break;
    }
  }

  const formatReward = (r: LoyaltyRuleEntity | null): string => {
    if (!r) return "None";
    switch (r.rewardType) {
      case "percentage_discount":
        return `${r.rewardValue}% Off`;
      case "fixed_amount_discount":
        return `$${r.rewardValue} Discount`;
      case "free_item":
        return `Free ${r.rewardValue}`;
      case "membership_upgrade":
        return `Tier Upgrade: ${r.rewardValue}`;
      case "custom_text":
      default:
        return r.rewardValue || r.description || "Perk Unlocked";
    }
  };

  const tierLevel = activeRule ? activeRule.tierName : sorted[0].tierName || "Bronze";
  const currentReward = activeRule
    ? formatReward(activeRule)
    : "Welcome Member (Complete first visit)";

  const nextMilestone = nextRule ? nextRule.minVisits : null;
  const nextReward = nextRule ? formatReward(nextRule) : "Top Tier Reached!";
  const visitsRemaining = nextRule ? Math.max(0, nextRule.minVisits - totalVisits) : 0;

  return {
    tierLevel,
    currentReward,
    nextMilestone,
    nextReward,
    visitsRemaining,
  };
}

/**
 * Realtime listener for business loyalty rules
 */
export function subscribeToBusinessLoyaltyRules(
  businessId: string,
  callback: (rules: LoyaltyRuleEntity[]) => void,
  onError?: (err: Error) => void
) {
  if (!businessId) {
    callback([]);
    return () => {};
  }

  const rulesColl = collection(db, "businesses", businessId, "loyalty_rules");
  const qRules = query(rulesColl, orderBy("minVisits", "asc"));

  return onSnapshot(
    qRules,
    (snapshot) => {
      const list: LoyaltyRuleEntity[] = snapshot.docs.map((docSnap) => ({
        ruleId: docSnap.id,
        ...docSnap.data(),
      })) as LoyaltyRuleEntity[];
      callback(list);
    },
    (err) => {
      console.error("Error subscribing to loyalty rules:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Create a new loyalty rule for a business
 */
export async function createLoyaltyRule(
  businessId: string,
  ruleData: Omit<LoyaltyRuleEntity, "ruleId" | "businessId" | "createdAt" | "updatedAt">
): Promise<string> {
  const rulesColl = collection(db, "businesses", businessId, "loyalty_rules");
  const newRef = doc(rulesColl);

  await setDoc(newRef, {
    ruleId: newRef.id,
    businessId,
    ...ruleData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Trigger batch recompute for existing customer memberships
  await recomputeAllCustomerMemberships(businessId);

  return newRef.id;
}

/**
 * Update an existing loyalty rule
 */
export async function updateLoyaltyRule(
  businessId: string,
  ruleId: string,
  updates: Partial<Omit<LoyaltyRuleEntity, "ruleId" | "businessId" | "createdAt">>
): Promise<void> {
  const ruleRef = doc(db, "businesses", businessId, "loyalty_rules", ruleId);

  await updateDoc(ruleRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });

  // Trigger batch recompute for existing customer memberships
  await recomputeAllCustomerMemberships(businessId);
}

/**
 * Delete a loyalty rule
 */
export async function deleteLoyaltyRule(businessId: string, ruleId: string): Promise<void> {
  const ruleRef = doc(db, "businesses", businessId, "loyalty_rules", ruleId);
  await deleteDoc(ruleRef);

  // Trigger batch recompute for existing customer memberships
  await recomputeAllCustomerMemberships(businessId);
}

/**
 * Recompute and denormalize loyalty status for all customer memberships of a business.
 */
export async function recomputeAllCustomerMemberships(businessId: string): Promise<void> {
  // Fetch all rules
  const rulesSnap = await getDocs(
    collection(db, "businesses", businessId, "loyalty_rules")
  );
  const rules: LoyaltyRuleEntity[] = rulesSnap.docs.map((d) => ({
    ruleId: d.id,
    ...d.data(),
  })) as LoyaltyRuleEntity[];

  // Fetch all memberships
  const memsSnap = await getDocs(
    collection(db, "businesses", businessId, "memberships")
  );

  if (memsSnap.empty) return;

  const batch = writeBatch(db);

  memsSnap.docs.forEach((docSnap) => {
    const mem = docSnap.data();
    const totalVisits = mem.totalVisits || 0;
    const computed = computeLoyaltyStatus(totalVisits, rules);

    batch.update(docSnap.ref, {
      tierLevel: computed.tierLevel,
      currentReward: computed.currentReward,
      nextMilestone: computed.nextMilestone,
      nextReward: computed.nextReward,
      visitsRemaining: computed.visitsRemaining,
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}
