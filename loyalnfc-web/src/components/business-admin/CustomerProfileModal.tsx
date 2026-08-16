import React, { useState } from "react";
import {
  deactivateCustomerMembership,
  reactivateCustomerMembership,
  type CustomerWithMembership,
} from "../../services/customerService";
import {
  X,
  Phone,
  Mail,
  Award,
  Calendar,
  Clock,
  Ban,
  RotateCcw,
} from "lucide-react";


interface CustomerProfileModalProps {
  businessId: string;
  customer: CustomerWithMembership | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  businessId,
  customer,
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !customer) return null;

  const mem = customer.membership;

  const formatDate = (ts: any) => {
    if (!ts) return "N/A";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDeactivate = async () => {
    if (
      !window.confirm(
        `Are you sure you want to deactivate customer membership for ${customer.fullName}? (Soft-delete)`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      await deactivateCustomerMembership(businessId, customer.customerId);
      onClose();
    } catch (err: any) {
      alert(`Failed to deactivate: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async () => {
    setLoading(true);
    try {
      await reactivateCustomerMembership(businessId, customer.customerId, "active");
      onClose();
    } catch (err: any) {
      alert(`Failed to reactivate: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6">
        <button
          onClick={onClose}
          className="absolute right-6 top-6 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/40 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Profile Header */}
        <div className="flex items-start gap-4 border-b border-slate-800 pb-6">
          <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400 text-xl font-bold">
            {customer.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{customer.fullName}</h2>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
              <span className="flex items-center gap-1 font-mono">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                {customer.phoneNumber}
              </span>
              {customer.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  {customer.email}
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-slate-500 mt-1">
              ID: {customer.customerId}
            </p>
          </div>
        </div>

        {/* Membership Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Membership Status
            </span>
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                mem?.status === "active"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : mem?.status === "pending"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
              }`}
            >
              {mem?.status || "pending"}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Loyalty Level
            </span>
            <span className="font-bold text-indigo-300 text-sm">{mem?.tierLevel || "Bronze"}</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Total Visits
            </span>
            <span className="font-bold text-white text-base">{mem?.totalVisits ?? 0}</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Assigned NFC Card
            </span>
            <span className="font-mono text-xs text-slate-300">
              {customer.assignedCardId ? customer.assignedCardId.substring(0, 10) + "..." : "Unassigned"}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Current Reward
            </span>
            <span className="font-semibold text-emerald-400 text-xs">
              {mem?.currentReward || "Standard Member Perks"}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Next Milestone
            </span>
            <span className="font-semibold text-indigo-300 text-xs">
              {mem?.nextMilestone ? `${mem.nextMilestone} Visits (${mem?.nextReward || ""})` : "Top Tier Reached"}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Visits to Next Perk
            </span>
            <span className="font-bold text-amber-400 text-sm">
              {mem?.nextMilestone ? `${mem.visitsRemaining ?? Math.max(0, mem.nextMilestone - (mem.totalVisits || 0))} remaining` : "0 (Max Level)"}
            </span>
          </div>
        </div>

        {/* Audit Dates */}
        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-xs grid grid-cols-2 gap-4">
          <div>
            <span className="text-slate-400 flex items-center gap-1 mb-0.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" /> Joined Date
            </span>
            <p className="font-medium text-slate-200">{formatDate(mem?.joinedAt || customer.createdAt)}</p>
          </div>

          <div>
            <span className="text-slate-400 flex items-center gap-1 mb-0.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" /> Last Visit Recorded
            </span>
            <p className="font-medium text-slate-200">
              {mem?.lastVisitAt ? formatDate(mem.lastVisitAt) : "No visits logged yet"}
            </p>
          </div>
        </div>

        {/* Visit & Reward History Placeholders */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-indigo-400" />
            <span>Visit Log & Reward Audit History (Phase 6/7)</span>
          </h3>

          <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-4 text-xs text-slate-500 text-center">
            Visit verification logs and reward redemptions will populate here once visit tracking Cloud Functions are connected.
          </div>
        </div>

        {/* Actions Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          {mem?.status === "cancelled" ? (
            <button
              onClick={handleReactivate}
              disabled={loading}
              className="py-2.5 px-4 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-medium text-xs rounded-xl transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reactivate Customer Membership</span>
            </button>
          ) : (
            <button
              onClick={handleDeactivate}
              disabled={loading}
              className="py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-medium text-xs rounded-xl transition-all flex items-center gap-2"
            >
              <Ban className="w-4 h-4" />
              <span>Deactivate Membership (Soft Delete)</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-xl transition-colors"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
