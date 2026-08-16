import React, { useState } from "react";
import { createCustomer } from "../../services/customerService";
import { X, UserPlus, Phone, Mail, User, AlertCircle, Sparkles } from "lucide-react";

interface CreateCustomerModalProps {
  businessId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({
  businessId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phoneNumber.trim().startsWith("+")) {
      setError("Phone number must include country code (e.g. +1234567890).");
      return;
    }

    setIsSubmitting(true);

    try {
      await createCustomer(businessId, {
        fullName,
        phoneNumber,
        email: email || undefined,
      });

      setFullName("");
      setPhoneNumber("");
      setEmail("");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create customer.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <UserPlus className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Create New Customer</h2>
            <p className="text-xs text-slate-400">Register customer and initialize membership</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Full Name *
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 text-sm text-slate-100 placeholder-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Phone Number (E.164 Format) *
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 text-sm font-mono text-slate-100 placeholder-slate-600"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Must include country code (+1, +91, etc.)</p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Email Address (Optional)
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 text-sm text-slate-100 placeholder-slate-600"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl text-xs text-slate-400 space-y-1">
            <span className="font-semibold text-slate-200 block">Automatic Membership Provisioning:</span>
            <p>
              Creates linked Membership with <code className="text-amber-400 font-mono">status = "pending"</code>. Card activation and date setting occur when an NFC card is assigned.
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
              disabled={isSubmitting}
              className="py-3 px-6 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/50 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? "Creating..." : "Create Customer & Pass"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
