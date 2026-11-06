import React, { useState } from 'react';
import { Language, Gender } from '../types';
import { X, DollarSign, Sparkles, MapPin, CheckCircle2, ArrowRight } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  gender: Gender;
  onApplyBudgetToChat: (prompt: string) => void;
}

export const BudgetPlannerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  language,
  gender,
  onApplyBudgetToChat,
}) => {
  const [budgetTier, setBudgetTier] = useState<number>(15000);

  if (!isOpen) return null;

  const isUrdu = language === 'ur';

  const formatPKR = (amt: number) => `PKR ${amt.toLocaleString()}`;

  const fabricBudget = Math.round(budgetTier * 0.42);
  const stitchingBudget = Math.round(budgetTier * 0.22);
  const footwearBudget = Math.round(budgetTier * 0.22);
  const accessoriesBudget = Math.round(budgetTier * 0.14);

  const getShoppingTips = (budget: number) => {
    if (budget <= 10000) {
      return {
        strategy: 'Local Wholesale Bazaars & Unstitched Value Packs',
        tips: [
          'Purchase unstitched 4-meter wash-and-wear fabrics from wholesale markets (saves 60% compared to designer retail).',
          'Stick to single-needle straight stitching with your local neighborhood master tailor without expensive fancy piping.',
          'Invest in 1 versatile tan/brown Peshawari chappal or plain gold khussa that matches all kurtas.',
        ],
        markets: 'Ichhra & Anarkali (Lahore), Zainab Market (Karachi), Raja Bazaar (Rawalpindi)',
      };
    } else if (budget <= 25000) {
      return {
        strategy: 'Mid-Tier Brand Sales + 1 Designer Statement Piece',
        tips: [
          'Shop during end-of-season clearance sales at J., Sapphire, or Gul Ahmed (up to 40% off).',
          'Have tailor add structured ban collars with contrast thread loops and cigarette cut trousers.',
          'Pick genuine full-grain leather footwear from Borjan or Servis that lasts multiple seasons.',
        ],
        markets: 'Liberty Market & Fortress (Lahore), Tariq Road & Dolmen (Karachi), F-7 Jinnah Super (Islamabad)',
      };
    } else {
      return {
        strategy: 'Executive Capsule & Bespoke Couture Tailoring',
        tips: [
          'Select high-count Egyptian cotton, Boski, or pure raw silk with custom hand embroidery or tilla work.',
          'Bespoke waistcoats in Banarsi brocade or Jamawar with custom monogrammed brass buttons.',
          'Hand-embroidered pure velvet khussas and artisanal taif oud fragrances.',
        ],
        markets: 'MM Alam Road (Lahore), Zamzama & Clifton (Karachi), Beverly Centre (Islamabad)',
      };
    }
  };

  const currentPlan = getShoppingTips(budgetTier);

  const handleApply = () => {
    const prompt = `Build an exact itemized wardrobe capsule within ${formatPKR(
      budgetTier
    )} for ${gender}. Include specific items, fabric types, tailor specifications, and shopping tips.`;
    onApplyBudgetToChat(prompt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-card text-foreground shadow-2xl overflow-hidden ${
          isUrdu ? 'font-urdu text-right' : ''
        }`}
        dir={isUrdu ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/40">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-bold">
              {isUrdu ? 'پاکستانی بجٹ کیپسول پلانر' : 'Pakistani Smart Budget Capsule Planner'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Select Your Wardrobe Budget (PKR)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[8000, 15000, 30000, 60000].map((tier) => (
                <button
                  key={tier}
                  onClick={() => setBudgetTier(tier)}
                  className={`rounded-xl border p-3 text-center transition ${
                    budgetTier === tier
                      ? 'border-primary bg-primary text-primary-foreground shadow-md'
                      : 'border-border bg-card hover:border-primary/40'
                  }`}
                >
                  <span className="block text-sm font-bold">{formatPKR(tier)}</span>
                  <span className="block text-[10px] opacity-80">
                    {tier <= 10000 ? 'Essential' : tier <= 20000 ? 'Smart Value' : tier <= 40000 ? 'Mid-Luxury' : 'Couture'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Allocation Breakdown */}
          <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Optimal Budget Allocation
              </span>
              <span className="text-base font-bold text-primary">{formatPKR(budgetTier)}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-card p-3 rounded-lg border border-border">
                <span className="text-[10px] text-muted-foreground uppercase block">Fabrics & Tops (42%)</span>
                <span className="text-sm font-bold text-foreground">{formatPKR(fabricBudget)}</span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">2–3 suits unstitched</span>
              </div>
              <div className="bg-card p-3 rounded-lg border border-border">
                <span className="text-[10px] text-muted-foreground uppercase block">Tailor Silai (22%)</span>
                <span className="text-sm font-bold text-foreground">{formatPKR(stitchingBudget)}</span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">Master darzi charges</span>
              </div>
              <div className="bg-card p-3 rounded-lg border border-border">
                <span className="text-[10px] text-muted-foreground uppercase block">Footwear (22%)</span>
                <span className="text-sm font-bold text-foreground">{formatPKR(footwearBudget)}</span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">Peshawari / Khussa</span>
              </div>
              <div className="bg-card p-3 rounded-lg border border-border">
                <span className="text-[10px] text-muted-foreground uppercase block">Accessories (14%)</span>
                <span className="text-sm font-bold text-foreground">{formatPKR(accessoriesBudget)}</span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">Attar, watch, brooch</span>
              </div>
            </div>

            {/* Strategy & Tips */}
            <div className="bg-card p-4 rounded-lg border border-border space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <Sparkles size={14} />
                <span>Strategy: {currentPlan.strategy}</span>
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {currentPlan.tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 size={13} className="text-primary shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-2 border-t border-border/60">
                <MapPin size={13} className="text-primary shrink-0" />
                <span>Recommended Markets: <strong>{currentPlan.markets}</strong></span>
              </div>
            </div>
          </div>

          {/* Action */}
          <button
            onClick={handleApply}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-elegant hover:opacity-90 transition"
          >
            <span>Ask AI Agent to Build This {formatPKR(budgetTier)} Capsule</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
