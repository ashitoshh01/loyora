import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";
import { ShieldCheck, UserCheck, LogOut, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

export const SuperAdminDashboard: React.FC = () => {
  const { user, role, logout } = useAuth();
  const [targetUid, setTargetUid] = useState("");
  const [targetRole, setTargetRole] = useState<"super_admin" | "business_admin" | "customer">("business_admin");
  const [businessId, setBusinessId] = useState("");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setLoading(true);

    try {
      const setUserRoleFn = httpsCallable(functions, "setUserRole");
      const res = await setUserRoleFn({
        targetUid,
        role: targetRole,
        businessId: targetRole === "super_admin" ? undefined : businessId,
      });

      const data = res.data as any;
      setStatusMsg({
        type: "success",
        text: data.message || `Assigned claim ${targetRole} to ${targetUid}`,
      });
      setTargetUid("");
      setBusinessId("");
    } catch (err: any) {
      console.error(err);
      setStatusMsg({
        type: "error",
        text: err.message || "Failed to execute setUserRole Cloud Function.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">LoyalNFC Super Console</h1>
              <p className="text-xs text-slate-400">Platform Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right text-xs">
              <p className="font-medium text-slate-200">{user?.email}</p>
              <span className="inline-block px-2 py-0.5 mt-0.5 bg-indigo-500/20 text-indigo-300 font-semibold rounded-full border border-indigo-500/30 uppercase text-[10px]">
                {role}
              </span>
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

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-slate-900 border border-indigo-500/30 rounded-3xl p-8 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Super Admin Authority</span>
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              User Role & Claim Management
            </h2>
            <p className="text-slate-300 text-sm mt-2 leading-relaxed">
              Super-admins use this console to set Firebase Auth custom claims (`role` and `businessId`).
              Claims are evaluated by Firestore Security Rules to enforce multi-tenant isolation.
            </p>
          </div>
        </div>

        {/* Role Assignment Tool Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-xl">
          <div className="flex items-center gap-3 pb-6 border-b border-slate-800 mb-6">
            <UserCheck className="w-6 h-6 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">Assign Custom User Claims (`setUserRole`)</h3>
          </div>

          {statusMsg && (
            <div
              className={`mb-6 p-4 rounded-xl border text-sm flex items-start gap-3 ${
                statusMsg.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-400"
              }`}
            >
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleAssignRole} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Target User Firebase UID
                </label>
                <input
                  type="text"
                  required
                  value={targetUid}
                  onChange={(e) => setTargetUid(e.target.value)}
                  placeholder="e.g. 8xKz...490a"
                  className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-mono text-slate-100 placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Assign Role
                </label>
                <select
                  value={targetRole}
                  onChange={(e: any) => setTargetRole(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-sm text-slate-100"
                >
                  <option value="business_admin">Business Admin (Manager)</option>
                  <option value="customer">Customer (Member)</option>
                  <option value="super_admin">Super Admin (Platform)</option>
                </select>
              </div>
            </div>

            {(targetRole as string) !== "super_admin" && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Target Business ID (`businessId`)
                </label>

                <input
                  type="text"
                  required={targetRole !== "super_admin"}
                  value={businessId}
                  onChange={(e) => setBusinessId(e.target.value)}
                  placeholder="e.g. biz_cafe_central"
                  className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-mono text-slate-100 placeholder-slate-600"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Scopes all Firestore reads and writes to this tenant ID.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="py-3.5 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-600/20"
            >
              {loading ? "Executing Cloud Function..." : "Assign User Claims"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};
