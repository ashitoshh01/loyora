import React from "react";
import { useAuth } from "../context/AuthContext";
import { Smartphone, LogOut, Award, Calendar, Shield, CreditCard } from "lucide-react";

export const CustomerDashboard: React.FC = () => {
  const { user, role, businessId, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-lg sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-white">LoyalNFC Member</h1>
              <p className="text-[11px] text-slate-400">Customer PWA Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right text-xs">
              <p className="font-mono text-slate-300 text-[11px]">{user?.phoneNumber || "Phone Auth"}</p>
              <span className="inline-block px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 font-semibold rounded text-[9px] uppercase">
                {role}
              </span>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* PWA Main Content Container */}
      <main className="max-w-md mx-auto px-4 pt-6 space-y-6">
        {/* Digital Membership Pass Card */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                Digital Loyalty Pass
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
              ID: {businessId || "General"}
            </span>
          </div>

          <div className="space-y-1 mb-6">
            <h2 className="text-xl font-bold text-white">{user?.displayName || "Valued Customer"}</h2>
            <p className="text-xs text-slate-400 font-mono">{user?.phoneNumber}</p>
          </div>

          <div className="pt-4 border-t border-indigo-500/20 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] uppercase text-slate-400 block">Status</span>
              <span className="font-semibold text-emerald-400">Active Pass</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase text-slate-400 block">Total Visits</span>
              <span className="font-bold text-white">0</span>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 text-xs text-slate-400">
          <Shield className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>
            Read-only access enforced by Firestore Security Rules. Customer profiles cannot mutate visit logs directly.
          </span>
        </div>

        {/* Progress & Rewards Placeholder */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Your Unlocked Rewards</h3>
          </div>
          <p className="text-xs text-slate-500">No active rewards unlocked yet. Visit local business to check in!</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Recent Visit History</h3>
          </div>
          <p className="text-xs text-slate-500">No visit history recorded.</p>
        </div>
      </main>
    </div>
  );
};
