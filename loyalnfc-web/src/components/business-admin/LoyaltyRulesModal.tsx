import React, { useState } from "react";
import {
  createLoyaltyRule,
  updateLoyaltyRule,
  deleteLoyaltyRule,
  type LoyaltyRuleEntity,
  type RewardType,
} from "../../services/loyaltyService";
import {
  X,
  Award,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  Percent,
  DollarSign,
  Gift,
  Crown,
  FileText,
  Save,
  ArrowUp,
  ArrowDown,
  Sparkles,
} from "lucide-react";

interface LoyaltyRulesModalProps {
  businessId: string;
  isOpen: boolean;
  rules: LoyaltyRuleEntity[];
  onClose: () => void;
}

export const LoyaltyRulesModal: React.FC<LoyaltyRulesModalProps> = ({
  businessId,
  isOpen,
  rules,
  onClose,
}) => {
  const [editingRule, setEditingRule] = useState<LoyaltyRuleEntity | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form State
  const [tierName, setTierName] = useState("");
  const [minVisits, setMinVisits] = useState(1);
  const [maxVisits, setMaxVisits] = useState<string>("");
  const [rewardType, setRewardType] = useState<RewardType>("percentage_discount");
  const [rewardValue, setRewardValue] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setEditingRule(null);
    setTierName("");
    setMinVisits(1);
    setMaxVisits("");
    setRewardType("percentage_discount");
    setRewardValue("");
    setDescription("");
    setError(null);
    setIsFormOpen(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleOpenEdit = (rule: LoyaltyRuleEntity) => {
    setEditingRule(rule);
    setTierName(rule.tierName);
    setMinVisits(rule.minVisits);
    setMaxVisits(rule.maxVisits !== null ? String(rule.maxVisits) : "");
    setRewardType(rule.rewardType);
    setRewardValue(rule.rewardValue);
    setDescription(rule.description || "");
    setError(null);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!tierName.trim()) {
      setError("Please enter a Tier Name.");
      return;
    }
    if (!rewardValue.trim()) {
      setError("Please enter a Reward Value.");
      return;
    }

    const parsedMax = maxVisits.trim() === "" ? null : Number(maxVisits);

    setSubmitting(true);
    try {
      if (editingRule) {
        await updateLoyaltyRule(businessId, editingRule.ruleId, {
          tierName: tierName.trim(),
          minVisits: Number(minVisits),
          maxVisits: parsedMax,
          rewardType,
          rewardValue: rewardValue.trim(),
          description: description.trim(),
        });
      } else {
        await createLoyaltyRule(businessId, {
          tierName: tierName.trim(),
          minVisits: Number(minVisits),
          maxVisits: parsedMax,
          rewardType,
          rewardValue: rewardValue.trim(),
          description: description.trim(),
          order: rules.length + 1,
        });
      }
      resetForm();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save loyalty rule.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!window.confirm("Are you sure you want to delete this loyalty rule?")) return;
    try {
      await deleteLoyaltyRule(businessId, ruleId);
    } catch (err: any) {
      alert(`Error deleting rule: ${err.message}`);
    }
  };

  const handleReorder = async (rule: LoyaltyRuleEntity, direction: "up" | "down") => {
    const sorted = [...rules].sort((a, b) => a.minVisits - b.minVisits);
    const index = sorted.findIndex((r) => r.ruleId === rule.ruleId);
    if (index < 0) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const otherRule = sorted[targetIndex];

    try {
      // Swap order & minVisits if appropriate
      await updateLoyaltyRule(businessId, rule.ruleId, { order: targetIndex + 1 });
      await updateLoyaltyRule(businessId, otherRule.ruleId, { order: index + 1 });
    } catch (err: any) {
      console.error(err);
    }
  };

  const getRewardIcon = (type: RewardType) => {
    switch (type) {
      case "percentage_discount":
        return <Percent className="w-4 h-4 text-emerald-400" />;
      case "fixed_amount_discount":
        return <DollarSign className="w-4 h-4 text-indigo-400" />;
      case "free_item":
        return <Gift className="w-4 h-4 text-amber-400" />;
      case "membership_upgrade":
        return <Crown className="w-4 h-4 text-purple-400" />;
      case "custom_text":
      default:
        return <FileText className="w-4 h-4 text-blue-400" />;
    }
  };

  const getRewardLabel = (rule: LoyaltyRuleEntity) => {
    switch (rule.rewardType) {
      case "percentage_discount":
        return `${rule.rewardValue}% Discount`;
      case "fixed_amount_discount":
        return `$${rule.rewardValue} Discount`;
      case "free_item":
        return `Free Item: ${rule.rewardValue}`;
      case "membership_upgrade":
        return `Upgrade to ${rule.rewardValue}`;
      case "custom_text":
      default:
        return rule.rewardValue;
    }
  };

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
              <Award className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Loyalty Rules Engine</h2>
              <p className="text-xs text-slate-400">
                Data-driven visit milestones and reward tier rules
              </p>
            </div>
          </div>

          {!isFormOpen && (
            <button
              onClick={handleOpenCreate}
              className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Loyalty Rule</span>
            </button>
          )}
        </div>

        {/* Inline Create / Edit Form */}
        {isFormOpen && (
          <div className="mb-6 p-6 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>{editingRule ? "Edit Loyalty Rule" : "Create New Loyalty Rule"}</span>
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Tier Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Silver, Gold, Platinum"
                  value={tierName}
                  onChange={(e) => setTierName(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Reward Type *
                </label>
                <select
                  value={rewardType}
                  onChange={(e) => setRewardType(e.target.value as RewardType)}
                  className="w-full py-2.5 px-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="percentage_discount">Percentage Discount (%)</option>
                  <option value="fixed_amount_discount">Fixed Amount Discount ($)</option>
                  <option value="free_item">Free Item</option>
                  <option value="membership_upgrade">Membership Upgrade</option>
                  <option value="custom_text">Custom Text Perk</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Min Visits Required *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={minVisits}
                  onChange={(e) => setMinVisits(Number(e.target.value))}
                  className="w-full py-2.5 px-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Max Visits (Optional)
                </label>
                <input
                  type="number"
                  min={minVisits}
                  placeholder="Leave empty for unlimited onwards"
                  value={maxVisits}
                  onChange={(e) => setMaxVisits(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Reward Value / Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10 (for 10%), Free Coffee, $5 Off"
                  value={rewardValue}
                  onChange={(e) => setRewardValue(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="py-2 px-5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition-all shadow-lg flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{submitting ? "Saving..." : "Save Rule & Recompute Memberships"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Rules Table */}
        <div className="flex-1 overflow-y-auto bg-slate-950/60 border border-slate-800 rounded-2xl">
          {rules.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No loyalty rules configured yet. Click "Add Loyalty Rule" to define visit milestones and perks.
            </div>
          ) : (
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/90 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="py-3.5 px-6">Tier & Milestone Range</th>
                  <th className="py-3.5 px-6">Reward Type</th>
                  <th className="py-3.5 px-6">Reward Perk</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rules
                  .sort((a, b) => a.minVisits - b.minVisits)
                  .map((rule, idx) => (
                    <tr key={rule.ruleId} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-white text-sm">{rule.tierName}</div>
                        <div className="text-xs text-indigo-300 font-mono mt-0.5">
                          {rule.minVisits}
                          {rule.maxVisits ? ` - ${rule.maxVisits}` : "+"} Visits
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-xs font-medium capitalize">
                          {getRewardIcon(rule.rewardType)}
                          <span>{rule.rewardType.replace(/_/g, " ")}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6 font-semibold text-emerald-400 text-xs">
                        {getRewardLabel(rule)}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleReorder(rule, "up")}
                            disabled={idx === 0}
                            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-800"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleReorder(rule, "down")}
                            disabled={idx === rules.length - 1}
                            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-800"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(rule)}
                            className="p-1.5 text-slate-400 hover:text-indigo-300 rounded-lg hover:bg-slate-800"
                            title="Edit Rule"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(rule.ruleId)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                            title="Delete Rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
