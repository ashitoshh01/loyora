import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";
import {
  subscribeToBusinesses,
  updateBusinessTenantStatus,
  getBusinessAggregateStats,
  type BusinessEntity,
  type BusinessSummaryStats,
} from "../services/businessService";
import { CreateBusinessModal } from "../components/super-admin/CreateBusinessModal";
import { BusinessSummaryModal } from "../components/super-admin/BusinessSummaryModal";
import {
  ShieldCheck,
  Building2,
  Plus,
  Search,
  Eye,
  LogOut,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Filter,
} from "lucide-react";


interface BusinessRowWithStats extends BusinessEntity {
  stats?: BusinessSummaryStats;
}

export const SuperAdminDashboard: React.FC = () => {
  const { user, role, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"businesses" | "roles">("businesses");

  // Businesses State
  const [businesses, setBusinesses] = useState<BusinessRowWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [summaryBusiness, setSummaryBusiness] = useState<BusinessEntity | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  // Role assignment state (Phase 2 tool)
  const [targetUid, setTargetUid] = useState("");
  const [targetRole, setTargetRole] = useState<"super_admin" | "business_admin" | "customer">("business_admin");
  const [businessId, setBusinessId] = useState("");
  const [roleStatusMsg, setRoleStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [roleSubmitting, setRoleSubmitting] = useState(false);

  // Realtime subscription to businesses
  useEffect(() => {
    const unsubscribe = subscribeToBusinesses(async (list) => {
      setBusinesses(list);
      setLoading(false);

      // Asynchronously fetch aggregate counts for each business
      const listWithStats = await Promise.all(
        list.map(async (biz) => {
          const stats = await getBusinessAggregateStats(biz.businessId);
          return { ...biz, stats };
        })
      );
      setBusinesses(listWithStats);
    });

    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (
    bizId: string,
    newStatus: "active" | "suspended" | "pending"
  ) => {
    try {
      await updateBusinessTenantStatus(bizId, newStatus);
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoleStatusMsg(null);
    setRoleSubmitting(true);

    try {
      const setUserRoleFn = httpsCallable(functions, "setUserRole");
      const res = await setUserRoleFn({
        targetUid,
        role: targetRole,
        businessId: targetRole === "super_admin" ? undefined : businessId,
      });

      const data = res.data as any;
      setRoleStatusMsg({
        type: "success",
        text: data.message || `Assigned claim ${targetRole} to ${targetUid}`,
      });
      setTargetUid("");
      setBusinessId("");
    } catch (err: any) {
      console.error(err);
      setRoleStatusMsg({
        type: "error",
        text: err.message || "Failed to execute setUserRole Cloud Function.",
      });
    } finally {
      setRoleSubmitting(false);
    }
  };

  // Filtering businesses
  const filteredBusinesses = businesses.filter((biz) => {
    const matchesSearch =
      biz.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      biz.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      biz.businessId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || biz.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Top Navbar */}
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

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab("businesses")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === "businesses"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Business Tenants ({businesses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("roles")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === "roles"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>User Role Claims</span>
          </button>
        </div>

        {activeTab === "businesses" ? (
          /* TAB 1: BUSINESS TENANTS MANAGEMENT MODULE */
          <div className="space-y-6">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by business name or slug..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="pending">Pending</option>
                  </select>
                  <Filter className="absolute left-3 top-3 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>

              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Business Tenant</span>
              </button>
            </div>

            {/* Businesses Data Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              {loading ? (
                <div className="p-12 text-center text-slate-400 text-sm">
                  Loading business tenants...
                </div>
              ) : filteredBusinesses.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">
                  No business tenants found matching criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-4 px-6">Business Name & Slug</th>
                        <th className="py-4 px-6">Status</th>
                        <th className="py-4 px-6">Plan</th>
                        <th className="py-4 px-6">Created Date</th>
                        <th className="py-4 px-6 text-center">Customers</th>
                        <th className="py-4 px-6 text-center">NFC Cards</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredBusinesses.map((biz) => (
                        <tr key={biz.businessId} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-4 px-6">
                            <div className="font-semibold text-white">{biz.name}</div>
                            <div className="text-xs font-mono text-slate-400">/{biz.slug}</div>
                          </td>

                          <td className="py-4 px-6">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                                biz.status === "active"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : biz.status === "suspended"
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  biz.status === "active"
                                    ? "bg-emerald-400"
                                    : biz.status === "suspended"
                                    ? "bg-rose-400"
                                    : "bg-amber-400"
                                }`}
                              />
                              {biz.status}
                            </span>
                          </td>

                          <td className="py-4 px-6">
                            <span className="px-2.5 py-1 bg-slate-800 rounded-md text-xs font-mono text-slate-300">
                              {biz.planId}
                            </span>
                          </td>

                          <td className="py-4 px-6 text-xs text-slate-400">
                            {formatDate(biz.createdAt)}
                          </td>

                          <td className="py-4 px-6 text-center">
                            <span className="font-bold text-white">
                              {biz.stats?.customerCount ?? 0}
                            </span>
                          </td>

                          <td className="py-4 px-6 text-center">
                            <span className="font-bold text-white">
                              {biz.stats?.cardCount ?? 0}
                            </span>
                          </td>

                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Summary View Button */}
                              <button
                                onClick={() => {
                                  setSummaryBusiness(biz);
                                  setIsSummaryModalOpen(true);
                                }}
                                className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                                title="View Summary"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Status Action Dropdown */}
                              <select
                                value={biz.status}
                                onChange={(e: any) =>
                                  handleStatusChange(biz.businessId, e.target.value)
                                }
                                className="bg-slate-950 border border-slate-800 rounded-lg text-xs py-1.5 px-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                              >
                                <option value="active">Active</option>
                                <option value="suspended">Suspend</option>
                                <option value="pending">Pending</option>
                              </select>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* TAB 2: USER ROLE ASSIGNMENT TOOL */
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-xl max-w-3xl">
            <div className="flex items-center gap-3 pb-6 border-b border-slate-800 mb-6">
              <UserCheck className="w-6 h-6 text-indigo-400" />
              <h3 className="text-lg font-bold text-white">Assign Custom User Claims (`setUserRole`)</h3>
            </div>

            {roleStatusMsg && (
              <div
                className={`mb-6 p-4 rounded-xl border text-sm flex items-start gap-3 ${
                  roleStatusMsg.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                }`}
              >
                {roleStatusMsg.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                )}
                <span>{roleStatusMsg.text}</span>
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
                    required={(targetRole as string) !== "super_admin"}
                    value={businessId}
                    onChange={(e) => setBusinessId(e.target.value)}
                    placeholder="e.g. biz_artisan-coffee_123"
                    className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-mono text-slate-100 placeholder-slate-600"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={roleSubmitting}
                className="py-3.5 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-600/20"
              >
                {roleSubmitting ? "Executing Cloud Function..." : "Assign User Claims"}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Modals */}
      <CreateBusinessModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {}}
      />

      <BusinessSummaryModal
        business={summaryBusiness}
        isOpen={isSummaryModalOpen}
        onClose={() => {
          setIsSummaryModalOpen(false);
          setSummaryBusiness(null);
        }}
      />
    </div>
  );
};
