import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";
import {
  Store,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Loader2,
  CalendarX,
  ShieldX,
  Clock,
  KeyRound,
} from "lucide-react";

interface ResolveCardResult {
  status:
    | "valid"
    | "invalid_card"
    | "card_blocked"
    | "unassigned_card"
    | "business_not_found"
    | "business_suspended"
    | "customer_not_found"
    | "membership_cancelled"
    | "membership_expired";
  message?: string;
  businessName?: string;
  customerFirstName?: string;
  totalVisits?: number;
  tierLevel?: string;
  alreadyVisitedToday?: boolean;
}

interface RecordVisitResult {
  success: boolean;
  status: "visit_recorded" | "already_visited";
  message: string;
  customerFirstName?: string;
  totalVisits?: number;
}

export const NfcTapPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [resolveResult, setResolveResult] = useState<ResolveCardResult | null>(null);

  // Form & Submit State
  const [merchantPin, setMerchantPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Success State
  const [visitRecorded, setVisitRecorded] = useState(false);
  const [visitResult, setVisitResult] = useState<RecordVisitResult | null>(null);

  useEffect(() => {
    if (!token) {
      setResolveResult({
        status: "invalid_card",
        message: "No NFC card token provided in URL.",
      });
      setLoading(false);
      return;
    }

    const fetchTokenInfo = async () => {
      try {
        const fn = httpsCallable<{ token: string }, ResolveCardResult>(
          functions,
          "resolveCardToken"
        );
        const res = await fn({ token });
        setResolveResult(res.data);
      } catch (err: any) {
        console.error("Error resolving card token:", err);
        setResolveResult({
          status: "invalid_card",
          message: err.message || "Failed to resolve NFC card token.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTokenInfo();
  }, [token]);

  const handleRecordVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token || !merchantPin.trim()) {
      setErrorMessage("Please enter the Merchant PIN.");
      return;
    }

    setIsSubmitting(true);
    try {
      const fn = httpsCallable<{ token: string; businessPin: string }, RecordVisitResult>(
        functions,
        "recordVisit"
      );
      const res = await fn({ token, businessPin: merchantPin.trim() });

      if (res.data.status === "already_visited") {
        setResolveResult((prev) => (prev ? { ...prev, alreadyVisitedToday: true } : prev));
        setErrorMessage("Visit already recorded today for this customer.");
      } else if (res.data.success) {
        setVisitResult(res.data);
        setVisitRecorded(true);
      }
    } catch (err: any) {
      console.error("Error recording visit:", err);
      setErrorMessage(err.message || "Failed to record visit. Check Merchant PIN.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-3xl mb-4 animate-pulse">
          <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-white">Verifying NFC Tap...</h2>
        <p className="text-xs text-slate-400 mt-1">Resolving secure token payload</p>
      </div>
    );
  }

  // 2. Error / Blocked / Expired / Invalid Status Screens
  if (!resolveResult || resolveResult.status !== "valid") {
    const status = resolveResult?.status;
    const msg = resolveResult?.message || "Invalid or inactive NFC pass.";

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-3xl flex items-center justify-center mx-auto text-rose-400">
            {status === "membership_expired" ? (
              <CalendarX className="w-8 h-8" />
            ) : status === "card_blocked" || status === "membership_cancelled" ? (
              <ShieldX className="w-8 h-8" />
            ) : (
              <AlertTriangle className="w-8 h-8" />
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">
              {status === "membership_expired"
                ? "Membership Expired"
                : status === "card_blocked"
                ? "Card Blocked"
                : status === "membership_cancelled"
                ? "Membership Inactive"
                : "Invalid NFC Pass"}
            </h1>
            <p className="text-sm text-slate-400 mt-2">{msg}</p>
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl text-xs text-slate-500">
            Please ask the merchant admin to renew your membership or assign an active NFC card.
          </div>
        </div>
      </div>
    );
  }

  // 3. Success Confirmation UI
  if (visitRecorded && visitResult) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 shadow-2xl text-center space-y-6 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />

          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/10 animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-semibold uppercase tracking-wider border border-emerald-500/30">
              Visit Recorded!
            </span>
            <h1 className="text-3xl font-extrabold text-white mt-3">
              Welcome, {visitResult.customerFirstName}!
            </h1>
            <p className="text-slate-400 text-sm mt-1">{resolveResult.businessName}</p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 space-y-2">
            <span className="text-xs uppercase font-semibold tracking-wider text-slate-400 block">
              Total Verified Visits
            </span>
            <span className="text-4xl font-black text-emerald-400 block">
              {visitResult.totalVisits}
            </span>
            <p className="text-xs text-indigo-300 font-medium">
              Tier Level: {resolveResult.tierLevel || "Bronze"}
            </p>
          </div>

          <p className="text-xs text-slate-500">
            Thank you for visiting! Have a wonderful day.
          </p>
        </div>
      </div>
    );
  }

  // 4. Verification Form UI (Flow B: Merchant PIN)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-300 text-xs font-semibold">
            <Store className="w-3.5 h-3.5" />
            <span>{resolveResult.businessName}</span>
          </div>

          <h1 className="text-2xl font-bold text-white">
            Hello, {resolveResult.customerFirstName}!
          </h1>
          <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
            <span>Visits: <strong className="text-white">{resolveResult.totalVisits}</strong></span>
            <span>•</span>
            <span className="text-indigo-300 font-medium">{resolveResult.tierLevel} Tier</span>
          </div>
        </div>

        {/* Already Visited Today Banner */}
        {resolveResult.alreadyVisitedToday ? (
          <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-center space-y-2">
            <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-amber-300 text-sm">Visit Already Recorded Today</h3>
            <p className="text-xs text-slate-400">
              Only 1 visit is allowed per calendar day. Your visit count for today is already logged!
            </p>
          </div>
        ) : (
          /* Merchant PIN Entry Form */
          <form onSubmit={handleRecordVisit} className="space-y-5">
            {errorMessage && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 text-center">
                Merchant PIN Required to Confirm Visit *
              </label>

              <div className="relative max-w-xs mx-auto">
                <KeyRound className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  maxLength={6}
                  value={merchantPin}
                  onChange={(e) => setMerchantPin(e.target.value)}
                  placeholder="Enter Merchant PIN"
                  className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-center font-mono text-lg tracking-widest text-slate-100 focus:outline-none focus:border-emerald-500 placeholder-slate-600"
                />
              </div>
              <p className="text-[11px] text-slate-500 text-center mt-2">
                Merchant staff enters their PIN to authorize this visit.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !merchantPin.trim()}
              className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authorizing Visit...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Confirm & Record Visit</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="pt-2 border-t border-slate-800/80 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1">
          <Lock className="w-3 h-3 text-slate-600" />
          <span>Secured by LoyalNFC Cloud Engine</span>
        </div>
      </div>
    </div>
  );
};
