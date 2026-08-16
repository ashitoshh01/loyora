import React, { useState } from "react";
import { assignCardToCustomerApi, type NFCCardEntity } from "../../services/cardService";
import { type CustomerWithMembership } from "../../services/customerService";
import { X, CreditCard, UserCheck, AlertCircle } from "lucide-react";

interface AssignCardModalProps {
  businessId: string;
  isOpen: boolean;
  preSelectedCardId?: string | null;
  customers: CustomerWithMembership[];
  cards: NFCCardEntity[];
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignCardModal: React.FC<AssignCardModalProps> = ({
  businessId,
  isOpen,
  preSelectedCardId,
  customers,
  cards,
  onClose,
  onSuccess,
}) => {
  const unassignedCards = cards.filter((c) => c.status === "unassigned");
  
  const [selectedCardId, setSelectedCardId] = useState<string>(preSelectedCardId || (unassignedCards[0]?.cardId || ""));
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const targetCardId = preSelectedCardId || selectedCardId;
    if (!targetCardId) {
      setError("Please select an unassigned NFC card.");
      return;
    }
    if (!selectedCustomerId) {
      setError("Please select a customer to assign the card to.");
      return;
    }

    setIsSubmitting(true);
    try {
      await assignCardToCustomerApi(targetCardId, selectedCustomerId, businessId);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to assign card to customer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCard = cards.find((c) => c.cardId === (preSelectedCardId || selectedCardId));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-6 top-6 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/40 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400">
            <CreditCard className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Assign NFC Card</h2>
            <p className="text-xs text-slate-400">Link physical NFC pass to customer membership</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Card Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Select Unassigned Card *
            </label>
            {preSelectedCardId ? (
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm font-mono text-emerald-400 flex items-center justify-between">
                <span>Token: {selectedCard?.token || preSelectedCardId}</span>
                <span className="text-xs bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300">Unassigned</span>
              </div>
            ) : unassignedCards.length === 0 ? (
              <p className="text-xs text-rose-400 italic">No unassigned NFC cards available. Generate one first.</p>
            ) : (
              <select
                required
                value={selectedCardId}
                onChange={(e) => setSelectedCardId(e.target.value)}
                className="w-full py-3 px-4 bg-slate-950/60 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                {unassignedCards.map((card) => (
                  <option key={card.cardId} value={card.cardId}>
                    Token: {card.token.substring(0, 16)}... (ID: {card.cardId})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Select Customer *
            </label>
            <select
              required
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full py-3 px-4 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((cust) => {
                const status = cust.membership?.status || "pending";
                return (
                  <option key={cust.customerId} value={cust.customerId}>
                    {cust.fullName} ({cust.phoneNumber}) - Status: {status}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Payload Architectural Guarantee Notice */}
          <div className="p-4 bg-indigo-950/30 border border-indigo-800/40 rounded-2xl text-xs text-indigo-300 space-y-1">
            <span className="font-semibold text-indigo-200 block">Decoupled Architectural Rule:</span>
            <p>
              The NFC physical card contains only the opaque token URL (<code className="font-mono text-emerald-300">https://domain/t/&lt;token&gt;</code>). No customer identity is encoded on the card itself.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!preSelectedCardId && unassignedCards.length === 0)}
              className="py-3 px-6 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isSubmitting ? "Assigning..." : "Assign & Activate Pass"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
