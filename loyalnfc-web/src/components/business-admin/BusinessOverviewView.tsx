import React, { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../lib/firebase";
import {
  Users,
  UserCheck,
  Calendar,
  TrendingUp,
  CreditCard,
  ShieldAlert,
  Clock,
  RefreshCw,
  Loader2,
  AlertCircle,
  BarChart3,
  UserPlus,
  Award,
} from "lucide-react";

interface OverviewMetrics {
  totalCustomers: number;
  activeMembers: number;
  visitsToday: number;
  visitsThisMonth: number;
  activeCards: number;
  blockedCards: number;
  expiringMemberships: number;
}

interface VisitChartPoint {
  dateKey: string;
  label: string;
  count: number;
}

interface OverviewResponse {
  success: boolean;
  businessId: string;
  businessName: string;
  timezone: string;
  metrics: OverviewMetrics;
  visitsChartData: VisitChartPoint[];
}

interface BusinessOverviewViewProps {
  businessId: string;
  onOpenCreateCustomer: () => void;
  onOpenCards: () => void;
  onOpenLoyaltyRules: () => void;
}

export const BusinessOverviewView: React.FC<BusinessOverviewViewProps> = ({
  businessId,
  onOpenCreateCustomer,
  onOpenCards,
  onOpenLoyaltyRules,
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<VisitChartPoint | null>(null);

  const fetchOverview = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const fn = httpsCallable<{ businessId: string }, OverviewResponse>(
        functions,
        "getBusinessDashboardOverview"
      );
      const res = await fn({ businessId });
      setData(res.data);
    } catch (err: any) {
      console.error("Error fetching overview metrics:", err);
      setError(err.message || "Failed to load dashboard overview.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (businessId) {
      fetchOverview();
    }
  }, [businessId]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm font-medium">Computing business aggregation analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
        <p className="text-sm text-rose-300">{error || "Failed to load overview data."}</p>
        <button
          onClick={() => fetchOverview(true)}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
        >
          Retry Load
        </button>
      </div>
    );
  }

  const { metrics, visitsChartData } = data;
  const maxVisitCount = Math.max(...visitsChartData.map((d) => d.count), 1);

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Business Performance Overview</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time aggregate telemetry for {data.businessName} (Timezone: {data.timezone})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchOverview(true)}
            disabled={refreshing}
            className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Updating..." : "Refresh Analytics"}</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Customers
            </span>
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white">{metrics.totalCustomers}</span>
            <span className="text-xs text-slate-500 block mt-1">Registered in system</span>
          </div>
        </div>

        {/* Active Members */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Members
            </span>
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-emerald-400">{metrics.activeMembers}</span>
            <span className="text-xs text-slate-500 block mt-1">Pass status active</span>
          </div>
        </div>

        {/* Visits Today */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Visits Today
            </span>
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-indigo-300">{metrics.visitsToday}</span>
            <span className="text-xs text-slate-500 block mt-1">Verified calendar visits</span>
          </div>
        </div>

        {/* Visits This Month */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Visits This Month
            </span>
            <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-purple-300">{metrics.visitsThisMonth}</span>
            <span className="text-xs text-slate-500 block mt-1">Monthly total logged</span>
          </div>
        </div>
      </div>

      {/* Secondary Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Active Cards */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 block">Active NFC Cards</span>
            <span className="text-2xl font-bold text-white mt-1 block">{metrics.activeCards}</span>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        {/* Blocked Cards */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 block">Blocked Cards</span>
            <span className="text-2xl font-bold text-rose-400 mt-1 block">{metrics.blockedCards}</span>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Expiring Memberships */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 block">Expiring (Next 30 Days)</span>
            <span className="text-2xl font-bold text-amber-400 mt-1 block">{metrics.expiringMemberships}</span>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Visits Over Time Chart (Last 30 Days) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Customer Visits Trend (Last 30 Days)</h3>
              <p className="text-xs text-slate-400">
                Daily aggregated NFC visit transactions
              </p>
            </div>
          </div>

          {hoveredPoint && (
            <div className="px-3 py-1.5 bg-slate-950 border border-indigo-500/30 rounded-xl text-xs flex items-center gap-2">
              <span className="text-slate-400">{hoveredPoint.label}:</span>
              <span className="font-bold text-indigo-300">{hoveredPoint.count} visits</span>
            </div>
          )}
        </div>

        {/* SVG Custom Bar Chart */}
        <div className="pt-4 pb-2">
          <div className="h-48 flex items-end justify-between gap-1.5 px-2">
            {visitsChartData.map((pt, _idx) => {
              const heightPercent = Math.max((pt.count / maxVisitCount) * 100, 4);

              return (
                <div
                  key={pt.dateKey}
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                >
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full max-w-[14px] rounded-t-sm transition-all duration-300 ${
                      pt.count > 0
                        ? "bg-indigo-500 group-hover:bg-emerald-400 shadow-sm shadow-indigo-500/20"
                        : "bg-slate-800/80 group-hover:bg-slate-700"
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Date Labels Under Chart */}
          <div className="flex justify-between text-[10px] text-slate-500 pt-3 border-t border-slate-800/80 px-2 font-mono">
            <span>{visitsChartData[0]?.label}</span>
            <span>{visitsChartData[14]?.label}</span>
            <span>{visitsChartData[29]?.label}</span>
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Quick Management Shortcuts
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={onOpenCreateCustomer}
            className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 rounded-xl transition-all text-left flex items-center gap-3 group"
          >
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 group-hover:scale-105 transition-transform">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white block">Register Customer</span>
              <span className="text-xs text-slate-400">Add new customer to business</span>
            </div>
          </button>

          <button
            onClick={onOpenCards}
            className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 rounded-xl transition-all text-left flex items-center gap-3 group"
          >
            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 group-hover:scale-105 transition-transform">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white block">NFC Card Inventory</span>
              <span className="text-xs text-slate-400">Issue & assign cards</span>
            </div>
          </button>

          <button
            onClick={onOpenLoyaltyRules}
            className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 rounded-xl transition-all text-left flex items-center gap-3 group"
          >
            <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400 group-hover:scale-105 transition-transform">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white block">Loyalty Program</span>
              <span className="text-xs text-slate-400">Configure tier rules & perks</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
