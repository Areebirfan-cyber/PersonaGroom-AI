import React, { useState } from 'react';
import { SavedLook, StylingAdvice, Language } from '../types';
import { X, Copy, Check, Printer, Scissors } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  look?: SavedLook | { title: string; advice: StylingAdvice; gender?: string };
  language: Language;
}

export const DarziSpecModal: React.FC<Props> = ({ isOpen, onClose, look, language }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !look) return null;

  const isUrdu = language === 'ur';
  const advice = look.advice;

  const getDarziSlipText = () => {
    return `✂️ **PERSONAGROOM AI — MASTER TAILOR CUTTING SLIP (درزی پرچی)** ✂️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Outfit: ${look.title}
Fabric Recommended: ${advice.fabricRecommendation || 'Egyptian Cotton / Lawn / Raw Silk'}
Styling Cut: ${advice.darziTip || 'Ban collar with straight daman'}

📌 SPECIFICATIONS:
• Neckline / Collar: Ban Collar (1.25" width, soft fusing / بکرم)
• Front Placket: Gum Patti (Concealed button closure) or Matching thread loops
• Daman: Straight Square Daman with 1.5" folded border (or Round Daman)
• Sleeves: Straight cuffs with 1 snap button & concealed watch slit
• Trousers / Bottom: Straight cut, 6.5"–7.0" mori (ankle opening), elastic back + drawstring front
• Important: Pre-shrink fabric in cold water before cutting (کپڑے کو لازمی شِرنک کریں)
• Side chaak (slits): Start at natural waist, reinforced with double bartack stitching
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Color Palette: ${advice.colorHexes?.join(', ') || 'Tone-on-tone'}
Footwear pairing: ${advice.footwear}
Created via PersonaGroom AI Studio`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getDarziSlipText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
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
            <Scissors className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-bold">
              {isUrdu ? 'ماسٹر درزی سلائی پرچی' : 'Master Darzi (Tailor) Cutting Slip'}
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

        {/* Printable Card Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="rounded-xl border border-dashed border-primary/40 bg-secondary/30 p-5 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div>
                <p className="text-base font-bold text-foreground font-sans">{look.title}</p>
                <p className="text-[11px] text-muted-foreground font-sans">
                  PersonaGroom AI · Master Tailoring Specification
                </p>
              </div>
              <span className="rounded-md bg-primary/10 text-primary px-2 py-1 text-xs font-bold font-sans">
                Ready for Tailor
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-card p-2.5 rounded-lg border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-sans">Collar / Neck Style</span>
                  <span className="font-semibold text-foreground">1.25" Ban Collar (بین کالر)</span>
                </div>
                <div className="bg-card p-2.5 rounded-lg border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-sans">Placket & Buttons</span>
                  <span className="font-semibold text-foreground">Gum Patti (Concealed Placket)</span>
                </div>
                <div className="bg-card p-2.5 rounded-lg border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-sans">Daman Finish</span>
                  <span className="font-semibold text-foreground">Clean Straight Daman with Fold</span>
                </div>
                <div className="bg-card p-2.5 rounded-lg border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-sans">Trouser Mori / Hem</span>
                  <span className="font-semibold text-foreground">6.5" to 7.0" Straight Paicha</span>
                </div>
              </div>

              <div className="bg-card p-3 rounded-lg border border-border space-y-1">
                <span className="text-muted-foreground block text-[10px] uppercase font-sans">
                  AI Master Tailor Custom Advice:
                </span>
                <p className="font-sans text-xs text-foreground leading-relaxed">
                  {advice.darziTip || 'Ensure 1-inch ease over chest, clean french seams (gum silai), and reinforced chaak.'}
                </p>
              </div>

              <div className="bg-card p-3 rounded-lg border border-border space-y-1">
                <span className="text-muted-foreground block text-[10px] uppercase font-sans">Recommended Fabric Care:</span>
                <p className="font-sans text-xs text-foreground">
                  {advice.fabricRecommendation || '100% Cotton / Lawn / Wash-and-Wear'}. Soak in cold water before cutting.
                </p>
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground border-t border-border/80 pt-3 flex items-center justify-between font-sans">
              <span>Send directly to your local tailor via WhatsApp</span>
              <span className="font-semibold text-foreground">Est. Stitching: PKR 1,200 – 2,500</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-muted/40">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary transition"
          >
            <Printer size={15} />
            <span>Print Slip</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-elegant hover:opacity-90 transition"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy for WhatsApp'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
