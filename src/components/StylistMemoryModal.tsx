import React from 'react';
import { AdviceRating, UserLearningProfile, Language } from '../types';
import { UI_TRANSLATIONS, FEEDBACK_TAGS } from '../data/fashionKnowledge';
import { X, Brain, Sparkles, ThumbsUp, ThumbsDown, Star, Trash2, Award, CheckCircle2 } from 'lucide-react';

interface StylistMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserLearningProfile;
  ratings: AdviceRating[];
  language: Language;
  onResetMemory: () => void;
}

export const StylistMemoryModal: React.FC<StylistMemoryModalProps> = ({
  isOpen,
  onClose,
  profile,
  ratings,
  language,
  onResetMemory,
}) => {
  if (!isOpen) return null;

  const t = UI_TRANSLATIONS[language] || UI_TRANSLATIONS.en;
  const isUrdu = language === 'ur';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
        dir={isUrdu ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary border border-primary/20">
              <Brain size={24} />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                <span>{t.stylistMemoryTitle}</span>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  Active Learning Engine
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t.stylistMemorySubtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Analytics & Satisfaction Stats Banner */}
        <div className="my-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-secondary/30 p-3.5 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t.totalRatedLooks}
            </span>
            <span className="mt-1 font-display text-2xl font-bold text-foreground">
              {profile.totalRatings}
            </span>
            <span className="text-[10px] text-muted-foreground">Recorded Consultations</span>
          </div>

          <div className="rounded-xl border border-border bg-secondary/30 p-3.5 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t.satisfactionRate}
            </span>
            <span className="mt-1 font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {profile.totalRatings > 0 ? `${profile.satisfactionRate}%` : 'N/A'}
            </span>
            <div className="mt-1 w-full bg-border rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${profile.satisfactionRate}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-secondary/30 p-3.5 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Average Rating
            </span>
            <div className="mt-1 flex items-center gap-1 font-display text-2xl font-bold text-amber-500">
              <Star size={20} className="fill-amber-400 text-amber-400" />
              <span>{profile.totalRatings > 0 ? `${profile.averageScore}` : '0.0'}</span>
              <span className="text-xs text-muted-foreground font-normal">/ 5.0</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Quality Score</span>
          </div>
        </div>

        {profile.totalRatings === 0 ? (
          /* Empty State */
          <div className="rounded-xl border border-dashed border-border p-8 text-center my-4">
            <Award className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
            <h3 className="text-sm font-semibold text-foreground">No Rated Consultations Yet</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Rate any styling suggestion with 1 to 5 stars to train PersonaGroom AI. The agent will
              automatically learn your favorite fabrics, color preferences, and tailoring cuts.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* What AI Learned About You */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-1.5">
                <Sparkles size={14} className="text-primary" />
                <span>Learned Personal Styling Taste</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Praised Elements */}
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 mb-1.5">
                    <ThumbsUp size={13} />
                    <span>Favored Elements & Preferences</span>
                  </div>
                  {profile.likedElements.length > 0 ? (
                    <ul className="space-y-1 text-muted-foreground text-[11px]">
                      {profile.likedElements.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                          <span className="text-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">
                      Give 4-5 stars on your favorite looks to add favored cuts & fabrics here.
                    </p>
                  )}
                </div>

                {/* Disliked / Avoid Elements */}
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3">
                  <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400 mb-1.5">
                    <ThumbsDown size={13} />
                    <span>Avoidances & Critiques</span>
                  </div>
                  {profile.dislikedElements.length > 0 ? (
                    <ul className="space-y-1 text-muted-foreground text-[11px]">
                      {profile.dislikedElements.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-rose-500 shrink-0 font-bold">•</span>
                          <span className="text-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">
                      Give 1-3 stars on outfits that don't suit you to teach the AI what to avoid.
                    </p>
                  )}
                </div>
              </div>

              {/* Tag Breakdown */}
              {profile.topLikedTags.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Top Praise Themes:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.topLikedTags.map(({ tag, count }) => {
                      const config = FEEDBACK_TAGS.find((t) => t.id === tag);
                      return (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-md bg-secondary border border-border px-2 py-0.5 text-xs text-foreground font-medium"
                        >
                          <span>{config?.emoji || '✨'}</span>
                          <span>{config?.label[language] || config?.label.en || tag}</span>
                          <span className="text-[10px] text-primary font-bold">×{count}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* User Notes */}
              {profile.recentNotes.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Direct Stylist Instructions You Shared:
                  </span>
                  <div className="space-y-1">
                    {profile.recentNotes.map((note, idx) => (
                      <div
                        key={idx}
                        className="rounded bg-secondary/40 px-2.5 py-1 text-[11px] text-foreground italic border-l-2 border-primary"
                      >
                        "{note}"
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Ratings History List */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Recent Rated Consultations ({ratings.length})
              </h3>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {ratings.slice().reverse().map((r) => (
                  <div
                    key={r.id}
                    className="rounded-lg border border-border bg-secondary/20 p-2.5 text-xs flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5 max-w-[70%]">
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center text-amber-400">
                          {Array.from({ length: r.score }).map((_, i) => (
                            <Star key={i} size={12} className="fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <span className="font-semibold text-foreground text-[11px]">
                          {r.score}/5 · {r.stylePreference.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(r.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {r.adviceHighlights.top}
                      </p>
                      {r.comment && (
                        <p className="text-[10px] text-foreground italic">"{r.comment}"</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {r.tags.slice(0, 2).map((tId) => {
                        const conf = FEEDBACK_TAGS.find((f) => f.id === tId);
                        return (
                          <span
                            key={tId}
                            className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {conf?.emoji} {conf?.label[language] || tId}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
          {profile.totalRatings > 0 ? (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to reset your AI stylist learned memory?')) {
                  onResetMemory();
                }
              }}
              className="flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-600 transition"
            >
              <Trash2 size={13} />
              <span>{t.clearMemory}</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
