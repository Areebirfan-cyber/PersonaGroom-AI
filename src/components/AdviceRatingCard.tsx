import React, { useState } from 'react';
import { StylingAdvice, AdviceRating, Language, StylePreference } from '../types';
import { FEEDBACK_TAGS, UI_TRANSLATIONS } from '../data/fashionKnowledge';
import { Star, ThumbsUp, ThumbsDown, Check, Sparkles, MessageSquare, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';

interface AdviceRatingCardProps {
  messageId: string | number;
  advice: StylingAdvice;
  language: Language;
  stylePreference: StylePreference;
  existingRating?: AdviceRating;
  onSaveRating: (rating: AdviceRating) => void;
}

export const AdviceRatingCard: React.FC<AdviceRatingCardProps> = ({
  messageId,
  advice,
  language,
  stylePreference,
  existingRating,
  onSaveRating,
}) => {
  const [hoveredScore, setHoveredScore] = useState<number | null>(null);
  const [score, setScore] = useState<number>(existingRating?.score || 0);
  const [selectedTags, setSelectedTags] = useState<string[]>(existingRating?.tags || []);
  const [comment, setComment] = useState<string>(existingRating?.comment || '');
  const [isExpanded, setIsExpanded] = useState<boolean>(!existingRating);
  const [isEditing, setIsEditing] = useState<boolean>(!existingRating);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(!!existingRating);
  const [showCommentBox, setShowCommentBox] = useState<boolean>(!!existingRating?.comment);

  const t = UI_TRANSLATIONS[language] || UI_TRANSLATIONS.en;
  const isUrdu = language === 'ur';

  const handleSelectStar = (val: number) => {
    setScore(val);
    setIsEditing(true);
    setIsExpanded(true);

    // Auto-preselect default tags if none chosen yet
    if (selectedTags.length === 0) {
      if (val >= 4) {
        setSelectedTags(['perfect_colors']);
      } else if (val <= 2) {
        setSelectedTags(['impractical_fabric']);
      }
    }
  };

  const handleToggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (score === 0) return;

    const ratingObj: AdviceRating = {
      id: existingRating?.id || `rating_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      messageId,
      score,
      sentiment: score >= 4 ? 'positive' : score <= 2 ? 'negative' : 'neutral',
      tags: selectedTags,
      comment: comment.trim() || undefined,
      category: advice.category,
      stylePreference,
      adviceHighlights: {
        top: advice.top || undefined,
        bottom: advice.bottom || undefined,
        color: advice.color || undefined,
        fabric: advice.fabricRecommendation,
        darziTip: advice.darziTip,
        footwear: advice.footwear,
      },
      createdAt: existingRating?.createdAt || new Date().toISOString(),
    };

    onSaveRating(ratingObj);
    setIsSubmitted(true);
    setIsEditing(false);
  };

  const relevantTags = FEEDBACK_TAGS.filter((tag) =>
    score >= 4 ? tag.type === 'positive' : score <= 3 ? tag.type === 'negative' : true
  );

  return (
    <div
      className={`mt-3 rounded-xl border transition-all duration-300 ${
        isSubmitted && !isEditing
          ? 'border-primary/30 bg-primary/5 p-3'
          : 'border-border bg-card/60 p-3.5 shadow-xs'
      }`}
      dir={isUrdu ? 'rtl' : 'ltr'}
    >
      {/* Header bar: Stars & Status */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles size={12} className="text-primary" />
            <span>{t.rateLook}</span>
          </span>

          {/* Interactive 5-Star Row */}
          <div className="flex items-center gap-1" onMouseLeave={() => setHoveredScore(null)}>
            {[1, 2, 3, 4, 5].map((starVal) => {
              const active = (hoveredScore !== null ? hoveredScore : score) >= starVal;
              return (
                <button
                  key={starVal}
                  type="button"
                  onClick={() => handleSelectStar(starVal)}
                  onMouseEnter={() => setHoveredScore(starVal)}
                  className="p-0.5 transition-transform hover:scale-120 focus:outline-none"
                  aria-label={`Rate ${starVal} out of 5 stars`}
                  title={`${starVal} Star${starVal > 1 ? 's' : ''}`}
                >
                  <Star
                    size={16}
                    className={`transition-colors ${
                      active
                        ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]'
                        : 'text-muted-foreground/40 hover:text-amber-300'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {score > 0 && (
            <span className="text-xs font-semibold text-foreground">
              {score}/5
              {score >= 4 ? (
                <span className="ml-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-normal">
                  (Loved it)
                </span>
              ) : score <= 2 ? (
                <span className="ml-1 text-[11px] text-rose-500 font-normal">(Needs adjustment)</span>
              ) : (
                <span className="ml-1 text-[11px] text-amber-500 font-normal">(Good)</span>
              )}
            </span>
          )}
        </div>

        {/* Status / Toggle Controls */}
        <div className="flex items-center gap-2">
          {isSubmitted && !isEditing ? (
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <Check size={12} />
              <span>{t.feedbackSaved}</span>
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              {t.rateHelpText}
            </span>
          )}

          {isSubmitted && !isEditing ? (
            <button
              onClick={() => {
                setIsEditing(true);
                setIsExpanded(true);
              }}
              className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1 ml-1"
            >
              <RotateCcw size={11} />
              <span>{t.changeRating}</span>
            </button>
          ) : (
            score > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded transition"
                aria-label="Toggle details"
              >
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )
          )}
        </div>
      </div>

      {/* Expanded Feedback Tags & Note Box */}
      {isExpanded && score > 0 && (
        <div className="mt-3 space-y-2.5 pt-2.5 border-t border-border/50 text-xs">
          {/* Quick Feedback Tags */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              {score >= 4
                ? 'What made this look stand out for you?'
                : score <= 2
                ? 'What should the AI stylist avoid or change next time?'
                : 'Help refine this look:'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {relevantTags.map((tag) => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleToggleTag(tag.id)}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition ${
                      isSelected
                        ? tag.type === 'positive'
                          ? 'border border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold'
                          : 'border border-rose-500/50 bg-rose-500/15 text-rose-700 dark:text-rose-300 font-semibold'
                        : 'border border-border bg-secondary/50 text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <span>{tag.emoji}</span>
                    <span>{tag.label[language] || tag.label.en}</span>
                    {isSelected && <Check size={11} className="ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Note / Text input */}
          {showCommentBox ? (
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">
                {t.tellStylist}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  language === 'ur'
                    ? 'مثلاً: مجھے یہ کڑھائی زیادہ لگی، آئندہ سادہ کرتا تجویز کریں۔'
                    : language === 'roman'
                    ? 'Jaise: Resham embroidery zyada hai, next time plain cotton latha suggest karein.'
                    : 'e.g. Love the mint shade, but prefer cigarette pants over loose shalwar next time.'
                }
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCommentBox(true)}
              className="text-[11px] text-muted-foreground hover:text-primary transition flex items-center gap-1"
            >
              <MessageSquare size={12} />
              <span>+ Add a custom note for AI stylist</span>
            </button>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-muted-foreground">
              {score >= 4 ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ThumbsUp size={11} /> Will favor this aesthetic in future recommendations
                </span>
              ) : score <= 2 ? (
                <span className="text-rose-500 flex items-center gap-1">
                  <ThumbsDown size={11} /> Will avoid these elements in future looks
                </span>
              ) : (
                'Helps calibrate future suggestions'
              )}
            </span>

            <div className="flex items-center gap-2">
              {isSubmitted && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary"
                >
                  Close
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSubmit()}
                className="rounded-md bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition flex items-center gap-1"
              >
                <Check size={12} />
                <span>Save Feedback</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compact summary when collapsed after rating */}
      {isSubmitted && !isExpanded && !isEditing && selectedTags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold">Learned:</span>
          {selectedTags.map((tagId) => {
            const config = FEEDBACK_TAGS.find((t) => t.id === tagId);
            return (
              <span
                key={tagId}
                className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-foreground font-medium"
              >
                <span>{config?.emoji || '•'}</span>
                <span>{config?.label[language] || config?.label.en || tagId}</span>
              </span>
            );
          })}
          {comment && (
            <span className="text-[10px] text-muted-foreground italic truncate max-w-[200px]">
              "{comment}"
            </span>
          )}
        </div>
      )}
    </div>
  );
};
