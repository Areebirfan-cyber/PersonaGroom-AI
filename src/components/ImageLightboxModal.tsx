import React, { useState, useEffect } from 'react';
import { StylingAdvice, Language, Gender } from '../types';
import { UI_TRANSLATIONS } from '../data/fashionKnowledge';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Share2,
  Sparkles,
  Scissors,
  Check,
  Maximize2,
  ExternalLink,
} from 'lucide-react';

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  imageCaption: string;
  advice?: StylingAdvice;
  gender?: Gender;
  language: Language;
  onGenerateAiVariation?: () => void;
  isGeneratingAi?: boolean;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  imageCaption,
  advice,
  gender,
  language,
  onGenerateAiVariation,
  isGeneratingAi,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  useEffect(() => {
    // Reset zoom whenever a new image is opened
    if (isOpen) {
      setZoomLevel(1);
    }
  }, [isOpen, imageSrc]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const t = UI_TRANSLATIONS[language] || UI_TRANSLATIONS.en;
  const isUrdu = language === 'ur';

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setZoomLevel(1);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = `personagroom_${(imageCaption || 'outfit').replace(/\s+/g, '_').toLowerCase()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: imageCaption || 'PersonaGroom AI Pakistani Outfit',
          text: advice ? `${advice.intro}\nTop: ${advice.top}\nBottom: ${advice.bottom}` : imageCaption,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6">
      {/* Dark Blur Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Main Lightbox Frame */}
      <div
        className="relative z-10 flex h-full max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl md:flex-row"
        dir={isUrdu ? 'rtl' : 'ltr'}
      >
        {/* Top Floating Control Bar on Mobile / Header */}
        <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full bg-black/60 p-1 backdrop-blur-md border border-white/20">
          <button
            onClick={handleZoomOut}
            className="rounded-full p-2 text-white/80 hover:bg-white/20 hover:text-white transition"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          <span className="px-1 text-[11px] font-mono text-white/90 select-none">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="rounded-full p-2 text-white/80 hover:bg-white/20 hover:text-white transition"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={handleResetZoom}
            className="rounded-full p-2 text-white/80 hover:bg-white/20 hover:text-white transition"
            title="Reset Zoom"
            aria-label="Reset Zoom"
          >
            <RotateCcw size={15} />
          </button>
          <button
            onClick={handleDownload}
            className="rounded-full p-2 text-white/80 hover:bg-white/20 hover:text-white transition"
            title="Download Image"
            aria-label="Download Image"
          >
            <Download size={16} />
          </button>
          <button
            onClick={onClose}
            className="rounded-full bg-white/20 p-2 text-white hover:bg-white/30 transition ml-1"
            title="Close Lightbox (Esc)"
            aria-label="Close Lightbox"
          >
            <X size={18} />
          </button>
        </div>

        {/* Left / Center: Interactive Image Canvas with Pan & Zoom */}
        <div className="relative flex min-h-[300px] flex-1 items-center justify-center overflow-hidden bg-black/95 p-4 sm:p-6 select-none">
          <div
            className="relative flex items-center justify-center transition-transform duration-200 ease-out"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <img
              src={imageSrc}
              alt={imageCaption}
              className="max-h-[82vh] max-w-full rounded-xl object-contain shadow-2xl transition duration-300"
            />
          </div>

          {/* Bottom Overlay Hint */}
          <div className="pointer-events-none absolute bottom-3 left-4 rounded-full bg-black/60 px-3 py-1 text-[11px] text-white/80 backdrop-blur-md">
            <span>{imageCaption}</span>
          </div>
        </div>

        {/* Right Panel: Outfit Anatomy & Couture Details (Collapsible / Scrollable) */}
        <div className="flex w-full flex-col border-t border-border bg-card p-5 md:w-[380px] md:border-l md:border-t-0 md:max-h-[96vh] overflow-y-auto">
          <div className="flex items-start justify-between border-b border-border/70 pb-3">
            <div>
              <div className="flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider">
                <Sparkles size={14} />
                <span>Pakistani Couture Visual</span>
              </div>
              <h2 className="font-display text-xl font-bold text-foreground mt-0.5">
                {imageCaption}
              </h2>
            </div>
          </div>

          {/* Outfit Specs Breakdown */}
          {advice && (
            <div className="my-4 space-y-3 text-xs flex-1">
              {/* Top Wear */}
              <div className="rounded-xl border border-border bg-secondary/30 p-3">
                <span className="font-bold uppercase tracking-wider text-primary text-[10px] block">
                  {t.topWear}
                </span>
                <p className="text-foreground mt-1 leading-relaxed">{advice.top}</p>
              </div>

              {/* Bottom Wear */}
              <div className="rounded-xl border border-border bg-secondary/30 p-3">
                <span className="font-bold uppercase tracking-wider text-primary text-[10px] block">
                  {t.bottomWear}
                </span>
                <p className="text-foreground mt-1 leading-relaxed">{advice.bottom}</p>
              </div>

              {/* Fabric & Darzi Cut */}
              {(advice.fabricRecommendation || advice.darziTip) && (
                <div className="grid grid-cols-1 gap-2">
                  {advice.fabricRecommendation && (
                    <div className="rounded-xl border border-border bg-secondary/30 p-2.5">
                      <span className="font-bold uppercase tracking-wider text-primary text-[10px] block">
                        {t.fabricLabel}
                      </span>
                      <p className="text-muted-foreground mt-0.5 text-[11px]">
                        {advice.fabricRecommendation}
                      </p>
                    </div>
                  )}

                  {advice.darziTip && (
                    <div className="rounded-xl border border-border bg-secondary/30 p-2.5">
                      <span className="font-bold uppercase tracking-wider text-primary text-[10px] block flex items-center gap-1">
                        <Scissors size={11} />
                        <span>{t.darziCut}</span>
                      </span>
                      <p className="text-muted-foreground mt-0.5 text-[11px]">{advice.darziTip}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Color Palette */}
              {advice.colorHexes && advice.colorHexes.length > 0 && (
                <div className="rounded-xl border border-border bg-secondary/30 p-3">
                  <span className="font-bold uppercase tracking-wider text-primary text-[10px] block mb-1.5">
                    Coordinated Color Palette
                  </span>
                  <div className="flex items-center gap-2">
                    {advice.colorHexes.map((hex, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div
                          className="h-7 w-7 rounded-lg border border-black/20 shadow-xs"
                          style={{ backgroundColor: hex }}
                          title={hex}
                        />
                        <span className="text-[9px] font-mono text-muted-foreground">{hex}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Markets & Estimated Budget */}
              {(advice.estimatedBudgetPkr || advice.marketLocations) && (
                <div className="rounded-xl border border-border bg-secondary/30 p-2.5 text-[11px] space-y-1">
                  {advice.estimatedBudgetPkr && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t.budgetRange}:</span>
                      <span className="font-semibold text-foreground">
                        {advice.estimatedBudgetPkr}
                      </span>
                    </div>
                  )}
                  {advice.marketLocations && (
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                        {t.whereToBuy}:
                      </span>
                      <span className="text-foreground">{advice.marketLocations}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Lightbox Actions */}
          <div className="mt-auto pt-3 border-t border-border/70 space-y-2">
            {onGenerateAiVariation && (
              <button
                onClick={onGenerateAiVariation}
                disabled={isGeneratingAi}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand p-2.5 text-xs font-semibold text-primary-foreground shadow-elegant hover:opacity-95 transition disabled:opacity-50"
              >
                <Sparkles size={14} className={isGeneratingAi ? 'animate-spin' : ''} />
                <span>
                  {isGeneratingAi
                    ? 'Architecting New AI Visual...'
                    : 'Generate Bespoke AI Look Variation'}
                </span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary p-2 text-xs font-medium text-foreground hover:bg-secondary/80 transition"
              >
                <Download size={13} />
                <span>Save High-Res</span>
              </button>

              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary p-2 text-xs font-medium text-foreground hover:bg-secondary/80 transition"
              >
                {isCopied ? <Check size={13} className="text-emerald-500" /> : <Share2 size={13} />}
                <span>{isCopied ? 'Link Copied' : 'Share Look'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
