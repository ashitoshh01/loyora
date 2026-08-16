import React, { useState, useEffect } from "react";
import { updateCustomer, type CustomerWithMembership } from "../../services/customerService";
import { X, UserCheck, Mail, User, Phone, AlertCircle, Save } from "lucide-react";


interface EditCustomerModalProps {
  businessId: string;
  customer: CustomerWithMembership | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditCustomerModal: React.FC<EditCustomerModalProps> = ({
  businessId,
  customer,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (customer) {
      setFullName(customer.fullName || "");
      setEmail(customer.email || "");
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await updateCustomer(businessId, customer.customerId, {
        fullName,
        email: email || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to update customer details.");
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
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-indigo-400">
            <UserCheck className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-white">Edit Customer Profile</h2>
            <p className="text-xs text-slate-400">Update customer details</p>
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
                className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-sm text-slate-100 placeholder-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Phone Number (Auth Identifier - Read Only)
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-600" />
              <input
                type="text"
                disabled
                value={customer.phoneNumber}
                className="w-full pl-10 pr-4 py-3 bg-slate-950/40 border border-slate-800/60 rounded-xl text-sm font-mono text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-sm text-slate-100 placeholder-slate-600"
              />
            </div>
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
              className="py-3 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
