import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  subscribeToCustomerData,
  subscribeToCustomerMembership,
  subscribeToCustomerVisits,
  type CustomerEntity,
  type MembershipEntity,
} from "../services/customerService";
import {
  Smartphone,
  LogOut,
  Calendar,
  ShieldCheck,
  Sparkles,
  Zap,
  Clock,
  Store,
  Gift,
  CheckCircle2,
  Download,
} from "lucide-react";

interface BusinessDoc {
  name?: string;
  logoUrl?: string;
  offers?: { title: string; description: string; tag?: string }[];
  address?: string;
}

export const CustomerDashboard: React.FC = () => {
  const { user, businessId, logout } = useAuth();

  const [customer, setCustomer] = useState<CustomerEntity | null>(null);
  const [membership, setMembership] = useState<MembershipEntity | null>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [business, setBusiness] = useState<BusinessDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Capture PWA install prompt
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  // Fetch customer data & business metadata
  useEffect(() => {
    if (!user || !businessId) {
      setLoading(false);
      return;
    }

    const customerId = user.uid;

    // Fetch business meta
    const bizRef = doc(db, "businesses", businessId);
    getDoc(bizRef).then((snap) => {
      if (snap.exists()) {
        setBusiness(snap.data() as BusinessDoc);
      }
    });

    // Subscriptions
    const unsubCust = subscribeToCustomerData(businessId, customerId, (data) => {
      setCustomer(data);
    });

    const unsubMem = subscribeToCustomerMembership(businessId, customerId, (data) => {
      setMembership(data);
      setLoading(false);
    });

    const unsubVisits = subscribeToCustomerVisits(businessId, customerId, (data) => {
      setVisits(data);
    });

    return () => {
      unsubCust();
      unsubMem();
      unsubVisits();
    };
  }, [user, businessId]);

  const handleInstallClick = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then(() => setInstallPrompt(null));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-400">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-300">Loading your digital pass...</p>
      </div>
    );
  }

  const totalVisits = membership?.totalVisits || 0;
  const tierLevel = membership?.tierLevel || "Bronze";
  const currentReward = membership?.currentReward || "Standard Member";
  const nextMilestone = membership?.nextMilestone;
  const nextReward = membership?.nextReward || "Top Tier Unlocked!";
  const visitsRemaining = membership?.visitsRemaining ?? (nextMilestone ? Math.max(0, nextMilestone - totalVisits) : 0);

  // Compute progress bar percentage
  let progressPercent = 100;
  if (nextMilestone && nextMilestone > 0) {
    progressPercent = Math.min(100, Math.round((totalVisits / nextMilestone) * 100));
  }

  // Tier accent color helper
  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "gold":
        return "from-amber-500 to-yellow-600 border-amber-400/50 text-amber-300";
      case "silver":
        return "from-slate-400 to-slate-600 border-slate-300/50 text-slate-200";
      case "platinum":
      case "vip":
        return "from-purple-600 to-indigo-600 border-purple-400/50 text-purple-200";
      default:
        return "from-amber-700 to-amber-900 border-amber-600/40 text-amber-300";
    }
  };

  const activeOffers = business?.offers || [
    {
      title: "Double Visit Tuesday",
      description: "Tap your NFC card on Tuesdays for double visit reward credits!",
      tag: "Weekly Special",
    },
    {
      title: "Complimentary Birthday Drink",
      description: "Show your digital pass during your birthday month for a free beverage.",
      tag: "Perk",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16 antialiased">
      {/* Top Mobile Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-md mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
            <div>
              <h1 className="font-bold text-sm text-white tracking-wide">
                {business?.name || "LoyalNFC Partner"}
              </h1>
              <p className="text-[10px] text-indigo-400 font-medium">Digital Loyalty Mobile Pass</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {installPrompt && (
              <button
                onClick={handleInstallClick}
                className="py-1 px-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </button>
            )}
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main PWA Content Container */}
      <main className="max-w-md mx-auto px-4 pt-5 space-y-6">
        {/* PREMIUM DIGITAL NFC LOYALTY CARD */}
        <div className="relative group">
          {/* Subtle Outer Glow */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-500" />

          <div className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border border-slate-700/60 rounded-3xl p-6 shadow-2xl space-y-6 overflow-hidden">
            {/* Glossy Metallic Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Header: Business & Tier Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  {business?.name || "Merchant Pass"}
                </span>
              </div>

              <span
                className={`px-3 py-1 bg-gradient-to-r ${getTierColor(
                  tierLevel
                )} text-xs font-extrabold rounded-full shadow-md uppercase tracking-wider border`}
              >
                {tierLevel} Tier
              </span>
            </div>

            {/* Customer Info */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                Pass Holder
              </span>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                {customer?.fullName || user?.displayName || "Valued Member"}
              </h2>
              <p className="text-xs text-indigo-300 font-mono flex items-center gap-1.5">
                <span>{user?.phoneNumber}</span>
              </p>
            </div>

            {/* Progress Bar & Milestone Status */}
            <div className="space-y-2.5 bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Next Perk Progress</span>
                </span>
                <span className="font-mono font-bold text-indigo-400">
                  {totalVisits} / {nextMilestone || totalVisits} Visits
                </span>
              </div>

              {/* Animated Bar */}
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                <div
                  style={{ width: `${progressPercent}%` }}
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 rounded-full transition-all duration-700 shadow-sm"
                />
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">
                  {nextMilestone ? `${visitsRemaining} visits left` : "Max Perk Level Unlocked"}
                </span>
                <span className="text-amber-300 font-medium">{progressPercent}%</span>
              </div>
            </div>

            {/* Reward Summary Footer */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800 text-xs">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 block mb-0.5">
                  Current Perk
                </span>
                <span className="font-bold text-emerald-400 block truncate">
                  {currentReward}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 block mb-0.5">
                  Next Perk Target
                </span>
                <span className="font-bold text-amber-300 block truncate">
                  {nextReward}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECURITY & ACTIVATION DETAILS */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-slate-200 block">Encrypted NFC Pass</span>
              <span className="text-[11px] text-slate-400">
                Verified status:{" "}
                <span className="text-emerald-400 font-medium capitalize">
                  {membership?.status || "Active"}
                </span>
              </span>
            </div>
          </div>

          <div className="text-right text-[11px] text-slate-400 font-mono">
            <span>
              Expires:{" "}
              {membership?.expiresAt
                ? new Date(
                    membership.expiresAt?.toDate
                      ? membership.expiresAt.toDate()
                      : membership.expiresAt
                  ).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "Perpetual Pass"}
            </span>
          </div>
        </div>

        {/* ACTIVE SHOP OFFERS & SPECIAL PROMOTIONS */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
                <Gift className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Active Shop Offers & Perks</h3>
            </div>
            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-medium">
              Member Exclusive
            </span>
          </div>

          <div className="space-y-3">
            {activeOffers.map((offer, i) => (
              <div
                key={i}
                className="p-3.5 bg-slate-950/70 border border-slate-800 hover:border-purple-500/30 rounded-2xl transition-all space-y-1"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>{offer.title}</span>
                  </h4>
                  {offer.tag && (
                    <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                      {offer.tag}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed pl-5">
                  {offer.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* RECENT VISIT HISTORY */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Recent Visit History</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Total: <strong className="text-indigo-400">{totalVisits}</strong>
            </span>
          </div>

          {visits.length === 0 ? (
            <div className="p-6 text-center text-slate-500 space-y-2 bg-slate-950/40 rounded-2xl border border-slate-800/60">
              <Clock className="w-6 h-6 text-slate-600 mx-auto" />
              <p className="text-xs">No visit history recorded yet.</p>
              <p className="text-[10px] text-slate-600">
                Tap your NFC card at the merchant counter to record your first visit!
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {visits.map((v) => {
                const recordedDate = v.recordedAt?.toDate
                  ? v.recordedAt.toDate()
                  : v.recordedAt
                  ? new Date(v.recordedAt)
                  : new Date();

                return (
                  <div
                    key={v.visitId}
                    className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-slate-200 block">
                          Verified Counter Visit
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          {recordedDate.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full border border-slate-700">
                      NFC Verified
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
