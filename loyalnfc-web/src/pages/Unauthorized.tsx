import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuth();

  const handleReturn = () => {
    if (role === "super_admin") navigate("/super-admin");
    else if (role === "business_admin") navigate("/admin");
    else if (role === "customer") navigate("/c");
    else navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 text-center shadow-2xl space-y-6">
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
          <ShieldAlert className="w-9 h-9" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white">403 — Access Denied</h1>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            Your security claim (<code className="text-indigo-400 font-mono">{role || "unassigned"}</code>) does not grant permissions to view this protected resource.
          </p>
        </div>

        <button
          onClick={handleReturn}
          className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </button>
      </div>
    </div>
  );
};
