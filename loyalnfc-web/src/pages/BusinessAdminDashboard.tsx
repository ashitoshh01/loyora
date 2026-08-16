import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  subscribeToBusinessCustomers,
  deactivateCustomerMembership,
  type CustomerWithMembership,
} from "../services/customerService";
import {
  subscribeToBusinessCards,
  type NFCCardEntity,
} from "../services/cardService";
import { CreateCustomerModal } from "../components/business-admin/CreateCustomerModal";
import { EditCustomerModal } from "../components/business-admin/EditCustomerModal";
import { CustomerProfileModal } from "../components/business-admin/CustomerProfileModal";
import { NfcCardInventoryModal } from "../components/business-admin/NfcCardInventoryModal";
import {
  Store,
  LogOut,
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit,
  Ban,
  Lock,
  CreditCard,
} from "lucide-react";


export const BusinessAdminDashboard: React.FC = () => {
  const { user, role, businessId, logout } = useAuth();

  const [customers, setCustomers] = useState<CustomerWithMembership[]>([]);
  const [cards, setCards] = useState<NFCCardEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithMembership | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [profileCustomer, setProfileCustomer] = useState<CustomerWithMembership | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  // Subscribe to customers and NFC cards scoped strictly to businessId
  useEffect(() => {
    if (!businessId) return;

    const unsubCust = subscribeToBusinessCustomers(businessId, (list) => {
      setCustomers(list);
      setLoading(false);
    });

    const unsubCards = subscribeToBusinessCards(businessId, (cardList) => {
      setCards(cardList);
    });

    return () => {
      unsubCust();
      unsubCards();
    };
  }, [businessId]);

  const handleSoftDelete = async (cust: CustomerWithMembership) => {
    if (!businessId) return;
    if (
      window.confirm(
        `Are you sure you want to deactivate ${cust.fullName}'s membership? (Soft-delete)`
      )
    ) {
      try {
        await deactivateCustomerMembership(businessId, cust.customerId);
      } catch (err: any) {
        alert(`Error deactivating: ${err.message}`);
      }
    }
  };

  // Filter & Search logic
  const filteredCustomers = customers.filter((cust) => {
    const matchesSearch =
      cust.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cust.phoneNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cust.email && cust.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const status = cust.membership?.status || "pending";
    const matchesStatus = statusFilter === "all" || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">Merchant Admin Portal</h1>
              <p className="text-xs text-slate-400">Customer Loyalty Management</p>
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
                  Tenant: {businessId || "Unassigned"}
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Security Scoping Banner */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Lock className="w-4 h-4" />
            </div>
            <span>
              Customer directory strictly scoped to tenant ID:{" "}
              <code className="text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded font-mono border border-indigo-800/40">
                {businessId}
              </code>
            </span>
          </div>
          <span className="text-slate-400">
            Total Members: <strong className="text-white">{customers.length}</strong>
          </span>
        </div>

        {/* Toolbar: Search, Filter & Create */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by customer name, phone, or email..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
              >
                <option value="all">All Memberships</option>
                <option value="pending">Pending Card</option>
                <option value="active">Active Pass</option>
                <option value="paused">Paused</option>
                <option value="cancelled">Deactivated</option>
              </select>
              <Filter className="absolute left-3 top-3 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCardModalOpen(true)}
              className="py-2.5 px-4 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-sm font-medium rounded-xl transition-all flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4 text-indigo-400" />
              <span>NFC Card Inventory</span>
              <span className="px-1.5 py-0.5 bg-indigo-950 text-indigo-300 font-mono text-xs rounded border border-indigo-800">
                {cards.filter((c) => c.status === "unassigned").length} unassigned
              </span>
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register New Customer</span>
            </button>
          </div>
        </div>

        {/* Customer Table */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              Loading tenant customer registry...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No customers found for this business. Click "Register New Customer" to add one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-4 px-6">Customer Name</th>
                    <th className="py-4 px-6">Phone Number</th>
                    <th className="py-4 px-6">Membership Status</th>
                    <th className="py-4 px-6">Assigned Card</th>
                    <th className="py-4 px-6 text-center">Visits</th>
                    <th className="py-4 px-6">Loyalty Level</th>
                    <th className="py-4 px-6">Current Reward</th>
                    <th className="py-4 px-6">Expiry Date</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredCustomers.map((cust) => {
                    const memStatus = cust.membership?.status || "pending";

                    const formatExpiryDate = (ts: any, status: string) => {
                      if (status === "pending") return "Pending Card";
                      if (!ts) return "No Expiry";
                      const date = ts.toDate ? ts.toDate() : new Date(ts);
                      return date.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      });
                    };

                    return (
                      <tr key={cust.customerId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-4 px-6 font-medium text-white">
                          <div>{cust.fullName}</div>
                          {cust.email && (
                            <div className="text-xs text-slate-500 font-mono">{cust.email}</div>
                          )}
                        </td>

                        <td className="py-4 px-6 font-mono text-slate-300">
                          {cust.phoneNumber}
                        </td>

                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                              memStatus === "active"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : memStatus === "pending"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                memStatus === "active"
                                  ? "bg-emerald-400"
                                  : memStatus === "pending"
                                  ? "bg-amber-400"
                                  : "bg-rose-400"
                              }`}
                            />
                            {memStatus}
                          </span>
                        </td>

                        <td className="py-4 px-6">
                          {cust.assignedCardId ? (
                            <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-md text-xs font-mono">
                              {cust.assignedCardId.substring(0, 10)}...
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Unassigned</span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-center font-bold text-white">
                          {cust.membership?.totalVisits ?? 0}
                        </td>

                        <td className="py-4 px-6 text-xs font-semibold text-indigo-300">
                          {cust.membership?.tierLevel || "Bronze"}
                        </td>

                        <td className="py-4 px-6 text-xs text-slate-300 font-medium">
                          {cust.membership?.currentReward || (
                            <span className="text-slate-500 italic">None</span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-xs font-mono text-slate-400">
                          {formatExpiryDate(cust.membership?.expiresAt, memStatus)}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Profile Modal Trigger */}
                            <button
                              onClick={() => {
                                setProfileCustomer(cust);
                                setIsProfileModalOpen(true);
                              }}
                              className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                              title="View Customer Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Edit Modal Trigger */}
                            <button
                              onClick={() => {
                                setEditingCustomer(cust);
                                setIsEditModalOpen(true);
                              }}
                              className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                              title="Edit Customer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {/* Deactivate Soft-Delete Button */}
                            {memStatus !== "cancelled" && (
                              <button
                                onClick={() => handleSoftDelete(cust)}
                                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                                title="Deactivate Membership"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {businessId && (
        <>
          <CreateCustomerModal
            businessId={businessId}
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={() => {}}
          />

          <EditCustomerModal
            businessId={businessId}
            customer={editingCustomer}
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setEditingCustomer(null);
            }}
            onSuccess={() => {}}
          />

          <CustomerProfileModal
            businessId={businessId}
            customer={profileCustomer}
            isOpen={isProfileModalOpen}
            onClose={() => {
              setIsProfileModalOpen(false);
              setProfileCustomer(null);
            }}
          />

          <NfcCardInventoryModal
            businessId={businessId}
            isOpen={isCardModalOpen}
            cards={cards}
            customers={customers}
            onClose={() => setIsCardModalOpen(false)}
          />
        </>
      )}
    </div>
  );
};
