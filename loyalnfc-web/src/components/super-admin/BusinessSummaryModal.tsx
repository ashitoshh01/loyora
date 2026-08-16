import React, { useEffect, useState } from "react";
import {
  getBusinessAggregateStats,
  type BusinessEntity,
  type BusinessSummaryStats,
} from "../../services/businessService";

import { X, Building2, Users, CreditCard, CalendarCheck, ShieldCheck, Globe, Clock, Tag } from "lucide-react";

interface BusinessSummaryModalProps {
  business: BusinessEntity | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BusinessSummaryModal: React.FC<BusinessSummaryModalProps> = ({
  business,
  isOpen,
  onClose,
}) => {
  const [stats, setStats] = useState<BusinessSummaryStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (business && isOpen) {
      setLoading(true);
      getBusinessAggregateStats(business.businessId)
        .then((res) => setStats(res))
        .finally(() => setLoading(false));
    }
  }, [business, isOpen]);

  if (!isOpen || !business) return null;

  const formatDate = (ts: any) => {
    if (!ts) return "N/A";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative space-y-6">
        <button
          onClick={onClose}
          className="absolute right-6 top-6 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/40 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 border-b border-slate-800 pb-6">
          <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-indigo-400">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{business.name}</h2>
            <p className="text-xs font-mono text-indigo-400 mt-0.5">ID: {business.businessId}</p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  business.status === "active"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : business.status === "suspended"
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                }`}
              >
                {business.status}
              </span>
              <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-xs font-mono">
                {business.planId}
              </span>
            </div>
          </div>
        </div>

        {/* Metadata Details */}
        <div className="grid grid-cols-2 gap-4 text-xs bg-slate-950/60 p-4 rounded-2xl border border-slate-800/60">
          <div className="space-y-1">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-500" /> Slug Identifier
            </span>
            <p className="font-mono text-slate-200 font-medium">{business.slug}</p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-500" /> Local Timezone
            </span>
            <p className="text-slate-200 font-medium">{business.timezone}</p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" /> Onboarded Date
            </span>
            <p className="text-slate-200 font-medium">{formatDate(business.createdAt)}</p>
          </div>
        </div>

        {/* Aggregate Read-only Stats Grid */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Read-Only Aggregate Performance Metrics
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center">
              <Users className="w-5 h-5 text-indigo-400 mx-auto mb-1.5" />
              <div className="text-2xl font-bold text-white">
                {loading ? "..." : stats?.customerCount ?? 0}
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-medium">Total Customers</span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center">
              <CreditCard className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
              <div className="text-2xl font-bold text-white">
                {loading ? "..." : stats?.cardCount ?? 0}
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-medium">Total NFC Cards</span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center">
              <CalendarCheck className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
              <div className="text-2xl font-bold text-white">
                {loading ? "..." : stats?.visitCount ?? 0}
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-medium">Total Visits</span>
            </div>
          </div>
        </div>

        {/* PII Privacy Security Notice */}
        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-start gap-3 text-xs text-indigo-300">
          <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <span>
            <strong>Tenant Privacy Scoped:</strong> Super Admin access is restricted to read-only metadata aggregates. Individual customer PII (phone numbers, full names) is isolated per tenant.
          </span>
        </div>
      </div>
    </div>
  );
};
