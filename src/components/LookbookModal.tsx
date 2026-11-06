import React, { useState } from 'react';
import { SavedLook, Language } from '../types';
import { UI_TRANSLATIONS, CATEGORIES } from '../data/fashionKnowledge';
import { X, Trash2, Share2, Scissors, Check, Sparkles, Calendar, Maximize2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  savedLooks: SavedLook[];
  onRemoveLook: (id: string) => void;
  language: Language;
  onSelectLookForChat?: (look: SavedLook) => void;
  onOpenDarziSlip: (look: SavedLook) => void;
  onOpenLightbox?: (look: SavedLook) => void;
}

export const LookbookModal: React.FC<Props> = ({
  isOpen,
  onClose,
  savedLooks,
  onRemoveLook,
  language,
  onOpenDarziSlip,
  onOpenLightbox,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleShare = (look: SavedLook) => {
    const text = `✨ PersonaGroom AI Look — ${look.title}
Top: ${look.advice.top}
Bottom: ${look.advice.bottom}
Footwear: ${look.advice.footwear}
Accessories: ${look.advice.accessories}
Color Logic: ${look.advice.color}
Fabric: ${look.advice.fabricRecommendation || 'Natural blend'}
Darzi Cut: ${look.advice.darziTip || 'Classic fit'}
Estimated Budget: ${look.advice.estimatedBudgetPkr || 'PKR 8,000 – 15,000'}`;

    navigator.clipboard.writeText(text);
    setCopiedId(look.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const isUrdu = language === 'ur';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-card text-foreground shadow-2xl overflow-hidden ${
          isUrdu ? 'font-urdu text-right' : ''
        }`}
        dir={isUrdu ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/40">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-bold">
              {language === 'ur' ? 'میری محفوظ شدہ لوکس' : language === 'roman' ? 'Meri Saved Looks (Lookbook)' : 'Curated Lookbook & Wardrobe'}
            </h2>
            <span className="text-xs text-muted-foreground ml-2">
              ({savedLooks.length} {savedLooks.length === 1 ? 'look' : 'looks'})
            </span>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {savedLooks.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Sparkles className="mx-auto h-12 w-12 opacity-30 mb-3" />
              <p className="text-base font-medium">
                {language === 'ur'
                  ? 'آپ نے ابھی تک کوئی لُک محفوظ نہیں کی ہے۔'
                  : language === 'roman'
                  ? 'Abhi tak koi look save nahi hui. AI se styling poochein aur "Save to Lookbook" dabayein.'
                  : 'Your lookbook is empty. Ask the AI Stylist for an outfit and tap "Save to Lookbook".'}
              </p>
            </div>
          ) : (
            savedLooks.map((look) => {
              const catObj = CATEGORIES.find((c) => c.id === look.advice.category);
              return (
                <div
                  key={look.id}
                  className="rounded-xl border border-border bg-card p-5 shadow-sm hover:border-primary/50 transition flex flex-col gap-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{catObj?.emoji || '✨'}</span>
                      <div>
                        <h3 className="font-semibold text-sm sm:text-base">{look.title}</h3>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <Calendar size={12} />
                          {new Date(look.savedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                          <span>·</span>
                          <span className="capitalize">{look.gender}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {onOpenLightbox && (
                        <button
                          onClick={() => onOpenLightbox(look)}
                          className="flex items-center gap-1 rounded-lg border border-border bg-secondary/80 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition"
                          title="View Outfit Image Full Screen"
                        >
                          <Maximize2 size={13} className="text-primary" />
                          <span>Full View</span>
                        </button>
                      )}

                      <button
                        onClick={() => onOpenDarziSlip(look)}
                        className="flex items-center gap-1 rounded-lg border border-border bg-secondary/80 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition"
                        title="View Master Darzi Tailor Slip"
                      >
                        <Scissors size={14} className="text-primary" />
                        <span>{language === 'ur' ? 'درزی سلائی پرچی' : 'Darzi Slip'}</span>
                      </button>

                      <button
                        onClick={() => handleShare(look)}
                        className="flex items-center gap-1 rounded-lg border border-border bg-secondary/80 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition"
                        title="Copy to clipboard"
                      >
                        {copiedId === look.id ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
                        <span>{copiedId === look.id ? 'Copied' : 'Share'}</span>
                      </button>

                      <button
                        onClick={() => onRemoveLook(look.id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                        title="Delete look"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Outfit summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <span className="font-semibold text-primary">{UI_TRANSLATIONS[language].topWear}:</span>{' '}
                      <span className="text-muted-foreground">{look.advice.top}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-primary">{UI_TRANSLATIONS[language].bottomWear}:</span>{' '}
                      <span className="text-muted-foreground">{look.advice.bottom}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-primary">{UI_TRANSLATIONS[language].footwear}:</span>{' '}
                      <span className="text-muted-foreground">{look.advice.footwear}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-primary">{UI_TRANSLATIONS[language].accessories}:</span>{' '}
                      <span className="text-muted-foreground">{look.advice.accessories}</span>
                    </div>
                  </div>

                  {/* Palette swatches & Budget */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
                    {look.advice.colorHexes && look.advice.colorHexes.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                          Palette:
                        </span>
                        <div className="flex items-center gap-1">
                          {look.advice.colorHexes.map((hex, idx) => (
                            <span
                              key={idx}
                              className="h-4 w-4 rounded-full border border-black/20 shadow-xs"
                              style={{ backgroundColor: hex }}
                              title={hex}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {look.advice.estimatedBudgetPkr && (
                      <span className="text-xs font-medium text-foreground bg-secondary/80 px-2.5 py-1 rounded-md">
                        {look.advice.estimatedBudgetPkr}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
