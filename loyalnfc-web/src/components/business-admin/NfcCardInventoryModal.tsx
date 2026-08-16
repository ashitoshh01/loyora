import React, { useState } from "react";
import {
  generateCardTokenApi,
  blockCardApi,
  replaceCardApi,
  type NFCCardEntity,
} from "../../services/cardService";
import { type CustomerWithMembership } from "../../services/customerService";
import { AssignCardModal } from "./AssignCardModal";
import {
  X,
  CreditCard,
  PlusCircle,
  ShieldAlert,
  RotateCcw,
  UserCheck,
  Copy,
  Check,
  Search,
  Filter,
  Lock,
  ExternalLink,
} from "lucide-react";

interface NfcCardInventoryModalProps {
  businessId: string;
  isOpen: boolean;
  cards: NFCCardEntity[];
  customers: CustomerWithMembership[];
  onClose: () => void;
}

export const NfcCardInventoryModal: React.FC<NfcCardInventoryModalProps> = ({
  businessId,
  isOpen,
  cards,
  customers,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Assign modal state
  const [assignCardId, setAssignCardId] = useState<string | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  if (!isOpen) return null;

  const handleGenerateToken = async () => {
    setActionLoading("generate");
    setError(null);
    try {
      await generateCardTokenApi(businessId);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate card token.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlockCard = async (card: NFCCardEntity) => {
    if (
      !window.confirm(
        `Are you sure you want to block NFC card (Token: ${card.token.substring(0, 10)}...)?`
      )
    ) {
      return;
    }

    setActionLoading(card.cardId);
    setError(null);
    try {
      await blockCardApi(card.cardId, businessId);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to block card.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReplaceCard = async (card: NFCCardEntity) => {
    if (!card.customerId) {
      alert("Cannot replace a card that is not assigned to a customer.");
      return;
    }

    const cust = customers.find((c) => c.customerId === card.customerId);
    const custName = cust ? cust.fullName : card.customerId;

    if (
      !window.confirm(
        `Replace lost/damaged card for customer ${custName}?\n\nThis will block the current card and assign a NEW card + token. Loyalty level and visit history will remain completely untouched.`
      )
    ) {
      return;
    }

    setActionLoading(card.cardId);
    setError(null);
    try {
      await replaceCardApi(card.cardId, card.customerId, businessId);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to replace card.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // Map customer ID to name
  const getCustomerLabel = (customerId: string | null) => {
    if (!customerId) return null;
    const cust = customers.find((c) => c.customerId === customerId);
    return cust ? `${cust.fullName} (${cust.phoneNumber})` : customerId;
  };

  // Search and filter
  const filteredCards = cards.filter((card) => {
    const custLabel = getCustomerLabel(card.customerId) || "";
    const matchesSearch =
      card.token.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.cardId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      custLabel.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || card.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const domain = window.location.host;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-6 top-6 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/40 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-indigo-400">
              <CreditCard className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">NFC Card Inventory</h2>
              <p className="text-xs text-slate-400">
                Opaque token management & customer card assignment
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerateToken}
            disabled={actionLoading === "generate"}
            className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/50 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{actionLoading === "generate" ? "Generating..." : "Generate New Token"}</span>
          </button>
        </div>

        {/* Security / Decoupling Banner */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 mb-6 text-xs flex items-start gap-3">
          <Lock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-slate-300 space-y-1">
            <p>
              <strong className="text-white">Master Context Architectural Rule:</strong> NFC cards contain only an opaque token payload (<code className="text-emerald-400 font-mono">https://{domain}/t/&lt;token&gt;</code>). No customer identity or loyalty data is written to the card.
            </p>
            <p className="text-slate-400">
              Raw tokens are restricted in Firestore rules and accessible only by merchant admins.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-xs underline">Dismiss</button>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by token, card ID, or assigned customer..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="relative shrink-0 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
            >
              <option value="all">All Card Statuses</option>
              <option value="unassigned">Unassigned</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </select>
            <Filter className="absolute left-3 top-3 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Inventory Table */}
        <div className="flex-1 overflow-y-auto bg-slate-950/60 border border-slate-800 rounded-2xl">
          {filteredCards.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No NFC cards found. Click "Generate New Token" to initialize an unassigned NFC card token.
            </div>
          ) : (
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/90 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="py-3.5 px-6">Opaque Token / NFC Payload</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Assigned Customer</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCards.map((card) => {
                  const payloadUrl = `https://${domain}/t/${card.token}`;
                  const custLabel = getCustomerLabel(card.customerId);

                  return (
                    <tr key={card.cardId} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-white bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
                            {card.token.substring(0, 16)}...
                          </span>
                          <button
                            onClick={() => handleCopy(payloadUrl)}
                            className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-md transition-colors"
                            title={`Copy NFC URL: ${payloadUrl}`}
                          >
                            {copiedToken === payloadUrl ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-1 flex items-center gap-1">
                          <ExternalLink className="w-3 h-3 text-slate-600" />
                          <span className="truncate max-w-xs">{payloadUrl}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                            card.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : card.status === "unassigned"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              card.status === "active"
                                ? "bg-emerald-400"
                                : card.status === "unassigned"
                                ? "bg-amber-400"
                                : "bg-rose-400"
                            }`}
                          />
                          {card.status}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-xs text-slate-300 font-medium">
                        {custLabel ? (
                          <span className="text-slate-100 font-medium">{custLabel}</span>
                        ) : (
                          <span className="text-slate-500 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Assign Action */}
                          {card.status === "unassigned" && (
                            <button
                              onClick={() => {
                                setAssignCardId(card.cardId);
                                setIsAssignModalOpen(true);
                              }}
                              className="py-1.5 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Assign</span>
                            </button>
                          )}

                          {/* Replace Lost Card Action */}
                          {card.status === "active" && card.customerId && (
                            <button
                              onClick={() => handleReplaceCard(card)}
                              disabled={actionLoading === card.cardId}
                              className="py-1.5 px-3 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                              title="Block current card and assign a NEW card + token to customer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Replace</span>
                            </button>
                          )}

                          {/* Block Card Action */}
                          {card.status !== "blocked" && (
                            <button
                              onClick={() => handleBlockCard(card)}
                              disabled={actionLoading === card.cardId}
                              className="py-1.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                              title="Block NFC Card"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>Block</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Assign Modal */}
        <AssignCardModal
          businessId={businessId}
          isOpen={isAssignModalOpen}
          preSelectedCardId={assignCardId}
          customers={customers}
          cards={cards}
          onClose={() => {
            setIsAssignModalOpen(false);
            setAssignCardId(null);
          }}
          onSuccess={() => {}}
        />
      </div>
    </div>
  );
};
