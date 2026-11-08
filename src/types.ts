export type Theme = 'dark' | 'emerald' | 'light';
export type Language = 'en' | 'roman' | 'ur';
export type Gender = 'men' | 'women' | 'unisex';
export type AgeGroup = 'teen' | 'uni' | 'pro' | 'mature';
export type StylePreference = 'traditional' | 'minimalist' | 'fusion' | 'luxury';
export type Season = 'summer' | 'winter' | 'monsoon' | 'festive';

export type CategoryId =
  | 'color'
  | 'festive'
  | 'casual'
  | 'budget'
  | 'body'
  | 'weather'
  | 'shoes'
  | 'grooming'
  | 'jewelry';

export interface StylingAdvice {
  intro: string;
  top?: string;
  bottom?: string;
  footwear?: string;
  accessories?: string;
  color?: string;
  colorHexes?: string[];
  fabricRecommendation?: string;
  darziTip?: string;
  estimatedBudgetPkr?: string;
  marketLocations?: string;
  category: CategoryId;
  visualConceptImage?: string;
  customAiImageUrl?: string;
  customAiImageCaption?: string;
  fallbackImageUrl?: string;
  dynamicPrompt?: string;
  isAiGenerated?: boolean;
  followUpSuggestions?: string[];
  isSpecificAdvice?: boolean;
  specificTopic?: string;
  topicLabel?: string;
  topicIcon?: string;
  styleTips?: string[];
}

export interface AdviceRating {
  id: string;
  messageId: number | string;
  score: number; // 1 to 5
  sentiment: 'positive' | 'negative' | 'neutral';
  tags: string[];
  comment?: string;
  category: CategoryId;
  stylePreference: StylePreference;
  adviceHighlights: {
    top?: string;
    bottom?: string;
    color?: string;
    fabric?: string;
    darziTip?: string;
    footwear?: string;
  };
  createdAt: string;
}

export interface UserLearningProfile {
  totalRatings: number;
  averageScore: number;
  satisfactionRate: number; // percentage 0 - 100
  topLikedTags: Array<{ tag: string; count: number }>;
  topDislikedTags: Array<{ tag: string; count: number }>;
  likedElements: string[];
  dislikedElements: string[];
  recentNotes: string[];
}

export interface ChatMessage {
  id: number | string;
  role: 'user' | 'bot';
  text?: string;
  image?: string;
  advice?: StylingAdvice;
  error?: string;
  timestamp?: string;
  rating?: AdviceRating;
}

export interface SavedLook {
  id: string;
  title: string;
  advice: StylingAdvice;
  gender: Gender;
  ageGroup: AgeGroup;
  savedAt: string;
  notes?: string;
}

export interface ColorSeasonResult {
  undertone: string;
  season: string;
  bestColors: Array<{ name: string; hex: string; reason: string }>;
  avoidColors: Array<{ name: string; hex: string; reason: string }>;
  bestMetal: string;
  culturalInsight: string;
  summary: string;
}
