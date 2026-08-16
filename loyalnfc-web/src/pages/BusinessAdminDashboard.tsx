import React from "react";
import { useAuth } from "../context/AuthContext";
import { Store, LogOut, Users, CreditCard, CalendarCheck, Award, Lock } from "lucide-react";

export const BusinessAdminDashboard: React.FC = () => {
  const { user, role, businessId, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">Merchant Admin Portal</h1>
              <p className="text-xs text-slate-400">Business Control Hub</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right text-xs">
              <p className="font-medium text-slate-200">{user?.email}</p>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-semibold rounded-full border border-emerald-500/30 uppercase text-[10px]">
                  {role}
                </span>
                <span className="px-2 py-0.5 bg-slate-800 text-slate-300 font-mono rounded-full text-[10px]">
                  ID: {businessId || "Unassigned"}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Tenant Security Scoping Active</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                All queries and mutations are isolated to business ID: <code className="text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">{businessId}</code>
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold rounded-full">
            Firestore Rules Protected
          </span>
        </div>

        {/* Dashboard Grid Placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between text-slate-400 mb-4">
              <span className="text-xs font-semibold uppercase">Customers</span>
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="text-3xl font-bold text-white">--</div>
            <p className="text-xs text-slate-500 mt-1">Tenant members</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between text-slate-400 mb-4">
              <span className="text-xs font-semibold uppercase">Active NFC Cards</span>
              <CreditCard className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold text-white">--</div>
            <p className="text-xs text-slate-500 mt-1">Assigned credentials</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between text-slate-400 mb-4">
              <span className="text-xs font-semibold uppercase">Total Visits</span>
              <CalendarCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-3xl font-bold text-white">--</div>
            <p className="text-xs text-slate-500 mt-1">Recorded check-ins</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between text-slate-400 mb-4">
              <span className="text-xs font-semibold uppercase">Loyalty Rules</span>
              <Award className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-white">--</div>
            <p className="text-xs text-slate-500 mt-1">Configured rewards</p>
          </div>
        </div>
      </main>
    </div>
  );
};
