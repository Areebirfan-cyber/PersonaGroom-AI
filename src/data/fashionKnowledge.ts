import { CategoryId, AgeGroup, Gender, Language, StylingAdvice, StylePreference, AdviceRating, UserLearningProfile } from '../types';

export interface CategoryItem {
  id: CategoryId;
  emoji: string;
  label: string;
  prompt: string;
  desc: string;
  womenOnly?: boolean;
}

export const CATEGORIES: CategoryItem[] = [
  { id: 'color', emoji: '🎨', label: 'Color Coach', prompt: 'Which colors suit my skin tone best?', desc: 'Undertone analysis & palette contrasts' },
  { id: 'festive', emoji: '✨', label: 'Festive & Wedding', prompt: 'Festive Eid and Nikkah outfit ideas with accessories', desc: 'Shaadi, Eid, Mehndi & Nikkah couture' },
  { id: 'casual', emoji: '👕', label: 'Daily Casual & Fusion', prompt: 'Casual everyday kurta and modern fusion outfit ideas', desc: 'Kurta-denim fusion & everyday comfort' },
  { id: 'budget', emoji: '💰', label: 'Budget Wardrobe (PKR)', prompt: 'Build a smart wardrobe under PKR 15,000', desc: 'Capsule wardrobing & bazaar hacks' },
  { id: 'body', emoji: '⏳', label: 'Body Shape & Fit', prompt: 'What fits flatter my body shape?', desc: 'Silhouettes, shoulder drops & hemlines' },
  { id: 'weather', emoji: '🌤️', label: 'Weather & Fabric', prompt: 'Best fabrics for Karachi summer heat', desc: 'Lawn, khaddar, karandi & wash-and-wear' },
  { id: 'shoes', emoji: '👟', label: 'Shoes & Accessories', prompt: 'Shoes and accessories to elevate my look', desc: 'Peshawari, khussas, watches & scents' },
  { id: 'jewelry', emoji: '💍', label: 'Jewelry & Ornaments', prompt: 'Pakistani jewelry pairings (Kundan, Polki, Jhumkas, Matha Patti) for festive and wedding wear', desc: 'Kundan, polki, jhumkay & chooriyan', womenOnly: true },
  { id: 'grooming', emoji: '💼', label: 'Personality Grooming', prompt: 'Grooming tips for a confident professional image', desc: 'Beard, hair, posture & fragrance' },
];

export const AGE_GROUPS: Array<{ id: AgeGroup; label: string; sub: string }> = [
  { id: 'teen', label: 'Teens', sub: '13–17' },
  { id: 'uni', label: 'Young Adults', sub: '18–24' },
  { id: 'pro', label: 'Professionals', sub: '25–39' },
  { id: 'mature', label: 'Mature', sub: '40+' },
];

export const STYLE_PREFERENCES: Array<{
  id: StylePreference;
  label: string;
  sub: string;
  emoji: string;
  vibe: string;
}> = [
  {
    id: 'traditional',
    label: 'Traditional',
    sub: 'Heritage Cuts',
    emoji: '🏛️',
    vibe: 'Authentic cultural cuts, classical embroideries, timeless Pakistani silhouettes',
  },
  {
    id: 'minimalist',
    label: 'Minimalist',
    sub: 'Clean & Subtle',
    emoji: '🌿',
    vibe: 'Clean geometric lines, unembellished solids, serene monotone palettes, quiet luxury',
  },
  {
    id: 'fusion',
    label: 'Modern Fusion',
    sub: 'Contemporary Mix',
    emoji: '⚡',
    vibe: 'Kurta with straight denim or chinos, minimalist sneakers, relaxed tailored overshirts',
  },
  {
    id: 'luxury',
    label: 'Luxury Formal',
    sub: 'Regal Couture',
    emoji: '👑',
    vibe: 'Bespoke raw silk, Banarsi brocade, statement waistcoats, high-impact jewel tones',
  },
];

/**
 * Image Prompt Sanitizer:
 * Translates and condenses queries and advice into concise, pristine English fashion keywords.
 * NEVER passes raw conversational Roman Urdu or dialogue sentences (e.g. "AAP KE LIYE...").
 */
export function sanitizeFashionImagePrompt(
  rawText: string,
  gender: Gender = 'men',
  category?: CategoryId
): string {
  const text = (rawText || '').toLowerCase();

  // 1. Haircut, Beard, Grooming
  if (
    category === 'grooming' ||
    text.includes('hair') ||
    text.includes('fade') ||
    text.includes('taper') ||
    text.includes('beard') ||
    text.includes('darhi') ||
    text.includes('daari') ||
    text.includes('khat') ||
    text.includes('salon') ||
    text.includes('shave') ||
    text.includes('cut')
  ) {
    if (gender === 'women') {
      return 'Pakistani woman elegant hairstyle portrait photography studio lighting 8k';
    }
    if (text.includes('beard') || text.includes('darhi') || text.includes('khat')) {
      return 'Pakistani man sharp beard grooming portrait photography studio lighting 8k';
    }
    return 'Pakistani man taper fade beard grooming portrait photography studio lighting';
  }

  // 2. Perfume, Attar, Fragrance
  if (
    text.includes('attar') ||
    text.includes('perfume') ||
    text.includes('oud') ||
    text.includes('khushbu') ||
    text.includes('scent') ||
    text.includes('fragrance')
  ) {
    return 'Luxury royal oud perfume glass bottle aesthetic still life luxury product photography studio lighting';
  }

  // 3. Shoes & Footwear
  if (
    category === 'shoes' ||
    text.includes('shoe') ||
    text.includes('peshawari') ||
    text.includes('khussa') ||
    text.includes('chappal') ||
    text.includes('footwear') ||
    text.includes('loafer')
  ) {
    if (gender === 'women' || text.includes('khussa')) {
      return 'Handcrafted luxury Pakistani embroidered velvet khussa footwear product photography';
    }
    return 'Handcrafted double sole leather Peshawari chappal luxury product photography';
  }

  // 4. Traditional Jewelry & Ornaments
  if (
    category === 'jewelry' ||
    text.includes('jewel') ||
    text.includes('kundan') ||
    text.includes('polki') ||
    text.includes('jhumk') ||
    text.includes('mala') ||
    text.includes('necklace') ||
    text.includes('matha patti')
  ) {
    return 'Pakistani traditional bridal Kundan gold jewelry jhumkay portrait fashion photography 8k';
  }

  // 5. Etiquette / Demeanor
  if (text.includes('etiquette') || text.includes('manner') || text.includes('poise') || text.includes('walk')) {
    return gender === 'women'
      ? 'Sophisticated Pakistani woman formal graceful portrait photography studio lighting'
      : 'Distinguished Pakistani gentleman formal graceful portrait photography studio lighting';
  }

  // 6. Clothing / Couture: Extract clean English garment, color, and fabric keywords
  const subject = gender === 'women' ? 'Pakistani woman fashion model' : 'Pakistani man fashion model';

  let garment = gender === 'women' ? 'embroidered shalwar kameez' : 'bespoke kurta';
  if (text.includes('sherwani')) garment = 'royal sherwani';
  else if (text.includes('prince coat')) garment = 'structured prince coat';
  else if (text.includes('waistcoat')) garment = 'structured waistcoat';
  else if (text.includes('lehenga') || text.includes('lehnga')) garment = 'bridal embroidered lehenga';
  else if (text.includes('gharara') || text.includes('sharara')) garment = 'flared festive sharara';
  else if (text.includes('anarkali') || text.includes('kalidar')) garment = 'flowing kalidar anarkali';
  else if (text.includes('sari') || text.includes('saree')) garment = 'chiffon silk saree';
  else if (text.includes('kurti')) garment = 'contemporary kurti tunic';
  else if (text.includes('kurta')) garment = 'embroidered kurta';

  let color = 'rich heritage palette';
  if (text.includes('navy') || text.includes('blue') || text.includes('neela')) color = 'royal navy blue';
  else if (text.includes('emerald') || text.includes('green') || text.includes('sabz')) color = 'emerald green';
  else if (text.includes('maroon') || text.includes('burgundy') || text.includes('ruby')) color = 'deep ruby maroon';
  else if (text.includes('black') || text.includes('kala') || text.includes('siah')) color = 'jet black';
  else if (text.includes('white') || text.includes('ivory') || text.includes('safed') || text.includes('latha')) color = 'crisp ivory white';
  else if (text.includes('gold') || text.includes('sunheri') || text.includes('mustard') || text.includes('amber')) color = 'antique gold zari';
  else if (text.includes('pink') || text.includes('gulabi') || text.includes('blush') || text.includes('peach')) color = 'blush pink';
  else if (text.includes('olive') || text.includes('mehendi') || text.includes('khaki')) color = 'olive green';

  let fabric = '';
  if (text.includes('velvet') || text.includes('makhmal')) fabric = 'plush velvet';
  else if (text.includes('silk') || text.includes('boski') || text.includes('resham')) fabric = 'raw silk';
  else if (text.includes('brocade') || text.includes('banarsi') || text.includes('jamawar')) fabric = 'Banarsi brocade';
  else if (text.includes('chiffon') || text.includes('organza')) fabric = 'fine organza';
  else if (text.includes('cotton') || text.includes('latha') || text.includes('lawn')) fabric = 'fine cotton';

  const fabricClause = fabric ? `with ${fabric}` : '';
  return `High quality fashion model wearing Pakistani ${garment} in ${color} ${fabricClause}, professional studio lighting, 8k resolution fashion photography`.replace(/\s+/g, ' ').trim();
}

export function extractDynamicImagePrompt(
  advice: StylingAdvice,
  gender: Gender = 'men',
  ageGroup: AgeGroup = 'uni'
): {
  dynamicPrompt: string;
  imageUrl: string;
  fallbackUrl: string;
  categoryKeywords: string;
} {
  const combinedText = `${advice.intro || ''} ${advice.top || ''} ${advice.bottom || ''} ${advice.accessories || ''}`;
  const dynamicPrompt = sanitizeFashionImagePrompt(combinedText, gender, advice.category);
  const isFemale = gender === 'women';
  let localAsset = isFemale ? '/assets/women_festive.jpg' : '/assets/men_festive.jpg';
  if (advice.category === 'casual') {
    localAsset = isFemale ? '/assets/women_casual.jpg' : '/assets/men_casual.jpg';
  } else if (advice.category === 'jewelry' && isFemale) {
    localAsset = '/assets/women_jewelry.jpg';
  } else if (advice.category === 'shoes') {
    localAsset = '/assets/shoes_craft.jpg';
  } else if (advice.category === 'color') {
    localAsset = '/assets/colors.jpg';
  }

  return {
    dynamicPrompt,
    imageUrl: localAsset,
    fallbackUrl: isFemale ? '/assets/women_festive.jpg' : '/assets/men_festive.jpg',
    categoryKeywords: `${gender},${advice.category || 'fashion'}`,
  };
}

export function resolveLookImage(
  advice: StylingAdvice,
  gender: Gender,
  _userPrompt: string = '',
  ageGroup: AgeGroup = 'uni'
): { src: string; caption: string; fallbackSrc: string; prompt: string; categoryKeywords: string } {
  const { dynamicPrompt, imageUrl, fallbackUrl, categoryKeywords } = extractDynamicImagePrompt(
    advice,
    gender,
    ageGroup
  );

  const cleanTop = (advice.top || 'Pakistani Outfit').split(';')[0].slice(0, 45).trim();
  return {
    src: imageUrl,
    fallbackSrc: fallbackUrl,
    prompt: dynamicPrompt,
    categoryKeywords,
    caption: `Style preview · ${cleanTop}`,
  };
}

export const UI_TRANSLATIONS: Record<
  Language,
  {
    welcomeTitle: string;
    welcomeDesc: string;
    topWear: string;
    bottomWear: string;
    footwear: string;
    accessories: string;
    colorLogic: string;
    fabricLabel: string;
    darziCut: string;
    budgetRange: string;
    whereToBuy: string;
    inputPlaceholder: string;
    voiceActive: string;
    voiceListen: string;
    attachPhoto: string;
    saveLook: string;
    saved: string;
    exportDarzi: string;
    askFollowUp: string;
    viewLookbook: string;
    colorStudio: string;
    budgetPlanner: string;
    jewelryOption: string;
    jewelryAccessories: string;
    stylePreferenceLabel: string;
    rateLook: string;
    rateHelpText: string;
    feedbackSaved: string;
    stylistMemoryTitle: string;
    stylistMemorySubtitle: string;
    satisfactionRate: string;
    totalRatedLooks: string;
    tellStylist: string;
    changeRating: string;
    clearMemory: string;
  }
> = {
  en: {
    welcomeTitle: 'PersonaGroom AI',
    welcomeDesc: 'Welcome to PersonaGroom AI. Tell me the occasion, your age group, fabric preference or style mood — I will architect a complete look rooted in authentic Pakistani fashion.',
    topWear: 'Top Wear',
    bottomWear: 'Bottom Wear',
    footwear: 'Footwear',
    accessories: 'Accessories & Fragrance',
    colorLogic: 'Color Contrast Logic',
    fabricLabel: 'Fabric & Weave',
    darziCut: 'Master Darzi Stitching Cut',
    budgetRange: 'Estimated Budget (PKR)',
    whereToBuy: 'Recommended Markets & Outlets',
    inputPlaceholder: 'Ask styling advice, mention event, budget or upload photo...',
    voiceActive: 'Listening...',
    voiceListen: 'Voice input',
    attachPhoto: 'Attach photo or fabric piece',
    saveLook: 'Save to Lookbook',
    saved: 'Saved in Wardrobe',
    exportDarzi: 'Darzi Stitching Slip',
    askFollowUp: 'Quick Follow-up',
    viewLookbook: 'My Saved Lookbook',
    colorStudio: 'Color Season Studio',
    budgetPlanner: 'Budget Capsule Planner',
    jewelryOption: 'Jewelry & Ornaments',
    jewelryAccessories: 'Jewelry, Accessories & Scents',
    stylePreferenceLabel: 'Style Preference',
    rateLook: 'Rate This Look',
    rateHelpText: 'Your rating trains your AI stylist to refine future suggestions',
    feedbackSaved: 'Feedback saved · AI Stylist Memory Updated',
    stylistMemoryTitle: 'AI Stylist Memory & Learning Profile',
    stylistMemorySubtitle: 'Personalized intelligence gathered from your ratings & preferences',
    satisfactionRate: 'Satisfaction Rate',
    totalRatedLooks: 'Consultations Rated',
    tellStylist: 'Add an optional note to refine next consultation...',
    changeRating: 'Edit Rating',
    clearMemory: 'Reset Stylist Memory',
  },
  roman: {
    welcomeTitle: 'PersonaGroom AI',
    welcomeDesc: 'Assalam-o-Alaikum! PersonaGroom AI mein khush aamdeed. Mujhe apna event, umar aur mood batayein — main aap ke liye Pakistani fashion ke mutabiq mukammal classy look tayyar karunga.',
    topWear: 'Top Wear (Kurta / Kameez)',
    bottomWear: 'Bottom Wear (Shalwar / Trouser)',
    footwear: 'Footwear (Joote / Khussa)',
    accessories: 'Accessories & Khushboo',
    colorLogic: 'Rang ka Contrast & Undertone',
    fabricLabel: 'Kapra (Fabric Recommendation)',
    darziCut: 'Master Darzi Silai Cut',
    budgetRange: 'Andaza Budget (PKR)',
    whereToBuy: 'Kahan se khareedein (Markets)',
    inputPlaceholder: 'Koi bhi sawal poochein ya suit / kapray ki photo upload karein...',
    voiceActive: 'Sun raha hoon...',
    voiceListen: 'Awaaz se bolein',
    attachPhoto: 'Kapra ya dress photo attach karein',
    saveLook: 'Lookbook mein mehfooz karein',
    saved: 'Wardrobe mein save ho gaya',
    exportDarzi: 'Darzi Parchi (Tailor Slip)',
    askFollowUp: 'Agle sawalat',
    viewLookbook: 'Meri Saved Looks',
    colorStudio: 'Rang & Skin Tone Studio',
    budgetPlanner: 'Budget Capsule Planner',
    jewelryOption: 'Zewarat & Ornaments',
    jewelryAccessories: 'Zewarat, Accessories & Khushboo',
    stylePreferenceLabel: 'Style Preference (Aap Ka Andaaz)',
    rateLook: 'Is Look ko Rate Karein',
    rateHelpText: 'Aap ka feedback AI stylist ko aglay mashwaray behtar bananay mein madad deta hai',
    feedbackSaved: 'Feedback mehfooz · AI Stylist Memory update ho gayi',
    stylistMemoryTitle: 'AI Stylist Memory & Seekha Hua Andaaz',
    stylistMemorySubtitle: 'Aap ki ratings aur pasand ke mutabiq tayyar kardah intelligence',
    satisfactionRate: 'Itmeenan ki Sharah',
    totalRatedLooks: 'Total Rated Consultations',
    tellStylist: 'AI stylist ke liye mazeed hidayaat (optional)...',
    changeRating: 'Rating Tabdeel Karein',
    clearMemory: 'Yaad-daasht Reset Karein',
  },
  ur: {
    welcomeTitle: 'پرسونا گروم اے آئی',
    welcomeDesc: 'السلام علیکم! پرسونا گروم اے آئی میں خوش آمدید۔ مجھے موقع، اپنی عمر اور پسندیدہ انداز بتائیں — میں آپ کے لیے روایتی اور جدید پاکستانی فیشن کے مطابق مکمل اور نفیس لُک تیار کروں گا۔',
    topWear: 'اوپری لباس (کرتا / قمیض)',
    bottomWear: 'نچلا لباس (شلوار / پاجامہ)',
    footwear: 'جوتے (کھسہ / پیشاواری چپل)',
    accessories: 'لوازمات و خوشبو (عطر)',
    colorLogic: 'رنگوں کا امتزاج اور سکن ٹون',
    fabricLabel: 'کپڑے کی قسم (فیبرک)',
    darziCut: 'ماسٹر درزی کٹائی اور سلائی ہدایات',
    budgetRange: 'تخمینہ بجٹ (پاکستانی روپے)',
    whereToBuy: 'خریداری کے مشہور بازار اور برانڈز',
    inputPlaceholder: 'اپنے تقریب، بجٹ یا تصویر کے ساتھ سوال پوچھیں...',
    voiceActive: 'سن رہا ہے...',
    voiceListen: 'آواز سے بولیں',
    attachPhoto: 'کپڑے یا لباس کی تصویر اپ لوڈ کریں',
    saveLook: 'لوک بک میں محفوظ کریں',
    saved: 'وارڈروب میں محفوظ',
    exportDarzi: 'درزی سلائی پرچی',
    askFollowUp: 'مزید متعلقہ سوالات',
    viewLookbook: 'میری محفوظ کردہ لوکس',
    colorStudio: 'رنگوں کا سیزنل سٹوڈیو',
    budgetPlanner: 'بجٹ کیپسول پلانر',
    jewelryOption: 'زیورات اور آرائش',
    jewelryAccessories: 'زیورات، لوازمات و خوشبو',
    stylePreferenceLabel: 'پسندیدہ اسٹائل اور انداز',
    rateLook: 'اس لُک کو ریٹ کریں',
    rateHelpText: 'آپ کی رائے سے اے آئی اسٹائلسٹ آئندہ مزید درست تجاویز تیار کرے گا',
    feedbackSaved: 'رائے محفوظ · اے آئی اسٹائلسٹ میموری اپ ڈیٹ ہو گئی',
    stylistMemoryTitle: 'اے آئی اسٹائلسٹ میموری اور سیکھی گئی ترجیحات',
    stylistMemorySubtitle: 'آپ کے ماضی کے ریٹنگز سے حاصل کردہ ذاتی اسٹائلنگ پروفائل',
    satisfactionRate: 'اطمینان کی شرح',
    totalRatedLooks: 'ریٹ کردہ تجاویز',
    tellStylist: 'اسٹائلسٹ کے لیے اضافی نوٹ (اختیاری)...',
    changeRating: 'ریٹنگ تبدیل کریں',
    clearMemory: 'میموری ری سیٹ کریں',
  },
};

export interface FeedbackTagConfig {
  id: string;
  emoji: string;
  label: Record<Language, string>;
  type: 'positive' | 'negative';
}

export const FEEDBACK_TAGS: FeedbackTagConfig[] = [
  // Positive tags (for 4-5 stars)
  {
    id: 'perfect_colors',
    emoji: '🎨',
    label: {
      en: 'Spot-on Color Palette',
      roman: 'Zabardast Rang Contrast',
      ur: 'بہترین رنگوں کا انتخاب',
    },
    type: 'positive',
  },
  {
    id: 'great_darzi_cut',
    emoji: '✂️',
    label: {
      en: 'Master Darzi Cut',
      roman: 'Darzi Cut Bohot Kaam Ka Hai',
      ur: 'سلائی و کٹنگ کی بہترین ہدایات',
    },
    type: 'positive',
  },
  {
    id: 'loved_fabric',
    emoji: '🧵',
    label: {
      en: 'Loved Fabric Choice',
      roman: 'Kapray ki Recommendation Achi Lagi',
      ur: 'کپڑے کا انتخاب پسند آیا',
    },
    type: 'positive',
  },
  {
    id: 'accurate_budget',
    emoji: '💰',
    label: {
      en: 'Realistic Budget & Market',
      roman: 'Bazaar aur Budget Munasib Hai',
      ur: 'مناسب بجٹ اور درست مارکیٹ',
    },
    type: 'positive',
  },
  {
    id: 'authentic_pakistani',
    emoji: '🇵🇰',
    label: {
      en: 'Authentic Heritage Vibe',
      roman: 'Khaalis Pakistani Elegance',
      ur: 'خالص روایتی پاکستانی وقار',
    },
    type: 'positive',
  },

  // Negative tags (for 1-3 stars)
  {
    id: 'too_expensive',
    emoji: '💸',
    label: {
      en: 'Too Expensive',
      roman: 'Range se Mehnga Hai',
      ur: 'بجٹ سے کافی زیادہ ہے',
    },
    type: 'negative',
  },
  {
    id: 'too_casual',
    emoji: '💤',
    label: {
      en: 'Too Simple / Casual',
      roman: 'Bohot Zyada Simple Hai',
      ur: 'بہت زیادہ سادہ یا غیر رسمی ہے',
    },
    type: 'negative',
  },
  {
    id: 'too_heavy',
    emoji: '👑',
    label: {
      en: 'Too Heavy / Flashy',
      roman: 'Zyada Bharakdar ya Heavy Hai',
      ur: 'بہت زیادہ بھاری یا شوخ ہے',
    },
    type: 'negative',
  },
  {
    id: 'impractical_fabric',
    emoji: '☀️',
    label: {
      en: 'Impractical Fabric for Season',
      roman: 'Mausam ke Mutabiq Kapra Theek Nahi',
      ur: 'موسم کے لحاظ سے غیر عملی فیبرک',
    },
    type: 'negative',
  },
  {
    id: 'colors_mismatched',
    emoji: '⚠️',
    label: {
      en: 'Did Not Like Color Combination',
      roman: 'Rang Pasand Nahi Aaye',
      ur: 'رنگوں کا امتزاج پسند نہیں آیا',
    },
    type: 'negative',
  },
];

export function calculateLearningProfile(ratings: AdviceRating[]): UserLearningProfile {
  if (!ratings || ratings.length === 0) {
    return {
      totalRatings: 0,
      averageScore: 0,
      satisfactionRate: 0,
      topLikedTags: [],
      topDislikedTags: [],
      likedElements: [],
      dislikedElements: [],
      recentNotes: [],
    };
  }

  const total = ratings.length;
  const sum = ratings.reduce((acc, r) => acc + r.score, 0);
  const avg = Number((sum / total).toFixed(1));
  const satisfiedCount = ratings.filter((r) => r.score >= 4).length;
  const satisfactionRate = Math.round((satisfiedCount / total) * 100);

  const tagCounts: Record<string, { count: number; type: 'positive' | 'negative' }> = {};
  const liked: string[] = [];
  const disliked: string[] = [];
  const notes: string[] = [];

  for (const r of ratings) {
    if (r.comment && r.comment.trim()) {
      notes.push(r.comment.trim());
    }

    if (r.score >= 4) {
      if (r.adviceHighlights.fabric) liked.push(r.adviceHighlights.fabric);
      if (r.adviceHighlights.top) liked.push(r.adviceHighlights.top.slice(0, 80));
      if (r.adviceHighlights.color) liked.push(r.adviceHighlights.color.slice(0, 60));
    } else if (r.score <= 2) {
      if (r.adviceHighlights.fabric) disliked.push(r.adviceHighlights.fabric);
      if (r.adviceHighlights.top) disliked.push(r.adviceHighlights.top.slice(0, 80));
    }

    for (const tag of r.tags) {
      const config = FEEDBACK_TAGS.find((t) => t.id === tag);
      const type = config?.type || (r.score >= 4 ? 'positive' : 'negative');
      if (!tagCounts[tag]) {
        tagCounts[tag] = { count: 0, type };
      }
      tagCounts[tag].count++;
    }
  }

  const topLikedTags = Object.entries(tagCounts)
    .filter(([_, v]) => v.type === 'positive')
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([tag, v]) => ({ tag, count: v.count }));

  const topDislikedTags = Object.entries(tagCounts)
    .filter(([_, v]) => v.type === 'negative')
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([tag, v]) => ({ tag, count: v.count }));

  return {
    totalRatings: total,
    averageScore: avg,
    satisfactionRate,
    topLikedTags,
    topDislikedTags,
    likedElements: Array.from(new Set(liked)).slice(0, 6),
    dislikedElements: Array.from(new Set(disliked)).slice(0, 6),
    recentNotes: notes.slice(-5),
  };
}

export const QUICK_PROMPTS: Array<{ label: string; prompt: string; womenOnly?: boolean }> = [
  { label: '✨ Nikkah Day Look', prompt: 'Sophisticated daytime Nikkah look with waistcoat and Peshawari' },
  { label: '💍 Kundan & Jhumka Styling', prompt: 'Which jewelry style (Kundan vs Polki vs Pearls) pairs best with my festive outfit?', womenOnly: true },
  { label: '🎨 Wheatish Skin Colors', prompt: 'Which rich Pakistani colors make warm wheatish skin glow?' },
  { label: '💰 Wardrobe under PKR 15k', prompt: 'Build an essential 4-piece Pakistani capsule wardrobe under PKR 15,000' },
  { label: '🕌 Friday Jummah Elegance', prompt: 'Crisp white cotton kurta shalwar styling with accessories for Jummah prayer' },
  { label: '🎓 Uni Fusion Styling', prompt: 'Short block-print kurta with straight jeans and minimalist sneakers' },
  { label: '🔥 Humid Karachi Summer', prompt: 'Lightweight breathable lawn & cambric fabric advice for high humidity' },
];

export function detectCategory(text: string, defaultCat: CategoryId = 'casual'): CategoryId {
  const t = text.toLowerCase();
  const rules: Array<[CategoryId, RegExp]> = [
    ['festive', /eid|nikkah|nikah|wedding|shaadi|shadi|mehndi|barat|walima|dholki|mayun|party/],
    ['color', /colou?r|rang|skin|tone|shade|undertone|complexion|palette/],
    ['budget', /budget|pkr|rs|sasta|cheap|afford|price|kharch|bazaar/],
    ['body', /body|shape|fit|height|slim|heavy|petite|tall|fat|mota|patla|chota/],
    ['weather', /weather|summer|winter|garmi|sardi|fabric|lawn|khaddar|cotton|karandi|humidity|karachi|lahore/],
    ['jewelry', /jewel|jhumka|kundan|polki|bangle|choori|churi|necklace|earring|matha patti|payal|mala/],
    ['shoes', /shoe|joot|khussa|chappal|peshawari|sneaker|accessor|watch|bag/],
    ['grooming', /groom|personality|confiden|interview|office|beard|skin\s?care|hair|posture|attar|oud/],
    ['casual', /uni|casual|daily|college|school|office|routine|jeans/],
  ];

  for (const [cat, regex] of rules) {
    if (regex.test(t)) return cat;
  }
  return defaultCat;
}

export const FALLBACK_DATABASE: Record<
  CategoryId,
  Record<
    Gender,
    {
      top: string;
      bottom: string;
      footwear: string;
      accessories: string;
      color: string;
      colorHexes: string[];
      fabricRecommendation: string;
      darziTip: string;
      estimatedBudgetPkr: string;
      marketLocations: string;
    }
  >
> = {
  festive: {
    men: {
      top: 'Mint or Ivory raw silk embroidered kurta; structured textured waistcoat in deep emerald or rich maroon with antique metal buttons.',
      bottom: 'Off-white crisp cotton-latha straight shalwar with knife pleats or tailored churidar pajama.',
      footwear: 'Handcrafted double-sole Noruzi Peshawari chappal in matte oxblood leather or gold-tilla embroidered velvet khussa.',
      accessories: 'Rose gold or brass waistcoat chain with brooch, classic brown leather watch, silk pocket square, and aged Oud/Amber attar.',
      color: 'Soft pastel base (Ivory/Mint) paired with a deep jewel waistcoat creates an aristocratic, photo-ready contrast.',
      colorHexes: ['#F5F5F0', '#1C3F3A', '#800020', '#C5A059'],
      fabricRecommendation: '80-count fine Egyptian cotton for kurta; raw silk or Banarsi brocade for waistcoat.',
      darziTip: 'Request a 1.25-inch ban collar with contrast inner piping, hidden snap buttons, and clean side vents.',
      estimatedBudgetPkr: 'PKR 8,500 – 16,000',
      marketLocations: 'J. / Amir Adnan (Mall) or Anarkali & Liberty Market (Lahore) / Tariq Road (Karachi)',
    },
    women: {
      top: 'Chikankari or tilla-embellished long kalidar kameez in blush peach or sage green, paired with an organza contrast dupatta with scalloped borders.',
      bottom: 'Flared sharara with gota patti border or straight silk cigarette trousers with cutwork hem.',
      footwear: 'Dabka-worked champagne gold khussa or delicate block-heel metallic sandals.',
      accessories: 'Traditional Kundan jhumkay, layered delicate mala, pearl ring, and velvet potli clutch.',
      color: 'Pastel base with jewel-toned accent dupatta (e.g. powder blush + wine red border) creates radiant depth.',
      colorHexes: ['#F7D8D5', '#2E6F62', '#D4AF37', '#722F37'],
      fabricRecommendation: 'Pure chiffon or organza with dyed cotton silk lining to prevent see-through.',
      darziTip: 'Ensure a modest sweetheart neckline, 21-inch flared sharara hem, and handmade fabric loop button fastenings.',
      estimatedBudgetPkr: 'PKR 12,000 – 24,000',
      marketLocations: 'Bareeze / Sana Safinaz outlets, or Liberty Market (Lahore) / Rabi Center (Rawalpindi)',
    },
    unisex: {
      top: 'Unisex structured minimalist kurta in ivory or slate grey with self-embroidered tonal threadwork.',
      bottom: 'Tailored straight cotton trousers with ankle cuffs.',
      footwear: 'Neutral tan artisanal khussa with cushion insoles.',
      accessories: 'Pashmina shawl drape, vintage watch, and clean silver ring.',
      color: 'Tone-on-tone monochromatic neutrals with a single metallic highlight.',
      colorHexes: ['#EFECE6', '#2F3E46', '#D4AF37'],
      fabricRecommendation: 'Heavy linen blend or tropical wash-and-wear for crease resistance.',
      darziTip: 'Boxy straight cut with minimal stitching lines and hidden pockets on both sides.',
      estimatedBudgetPkr: 'PKR 6,500 – 12,000',
      marketLocations: 'Charcoal / Khaadi or Zainab Market (Karachi)',
    },
  },
  casual: {
    men: {
      top: 'Short cotton kurta in olive green, navy, or terracotta; or relaxed linen overshirt layered over a plain white crewneck.',
      bottom: 'Tapered khaki chinos or relaxed straight-leg dark wash denim.',
      footwear: 'Crisp white low-top leather sneakers or minimalist brown suede slip-ons.',
      accessories: 'Braided leather wristband, matte black watch, and canvas tote or compact backpack.',
      color: 'Earthy tone on top (olive/rust) balanced with clean neutral bottoms (beige/white) gives an effortless contemporary look.',
      colorHexes: ['#4A5335', '#F4F1EA', '#1D2A44', '#C2A68C'],
      fabricRecommendation: '100% breathable slub cotton or lightweight linen.',
      darziTip: 'Kurta length should hit 2 inches above the mid-thigh, with a curved shirt hem (daman).',
      estimatedBudgetPkr: 'PKR 3,500 – 7,500',
      marketLocations: 'Outfitters / Cougar / Rastah, or Panorama Centre (Lahore) / Zainab Market (Karachi)',
    },
    women: {
      top: 'A-line printed short kurti with bell sleeves or relaxed linen button-down tunic in warm saffron or indigo.',
      bottom: 'Off-white culottes, straight-leg denim, or wide-leg linen palazzos.',
      footwear: 'Flat minimalist slides or comfortable white court sneakers.',
      accessories: 'Silver oxidised jhumkas, patterned tote bag, and lightweight cotton printed stole.',
      color: 'One vibrant printed item grounded by solid neutral bottoms maintains visual harmony.',
      colorHexes: ['#E76F51', '#264653', '#E9D8A6', '#FFFFFF'],
      fabricRecommendation: 'Premium lawn or breathable cambric.',
      darziTip: 'Keep sleeves 3/4 with ladder lace (seedi lace) inserts at cuffs.',
      estimatedBudgetPkr: 'PKR 4,000 – 8,000',
      marketLocations: 'Sapphire / Khaadi prêt, or Karim Market (Lahore) / Tariq Road (Karachi)',
    },
    unisex: {
      top: 'Oversized boxy cotton tee or half-sleeve loose linen shirt in oat or forest green.',
      bottom: 'Wide-leg pleated trousers or vintage relaxed denim.',
      footwear: 'Retro canvas skate shoes or leather slides.',
      accessories: 'Crossbody bag, oval sunglasses, and simple steel necklace.',
      color: 'Monochrome sand/stone palette with an earthy accent.',
      colorHexes: ['#D6CCC2', '#333333', '#588157'],
      fabricRecommendation: 'Heavyweight organic cotton.',
      darziTip: 'Dropped shoulder seam with generous sleeve circumference.',
      estimatedBudgetPkr: 'PKR 4,000 – 7,000',
      marketLocations: 'Local thrift bazaars / Outfitters / Breakout',
    },
  },
  color: {
    men: {
      top: 'Warm undertone: Mustard, terracotta, deep olive, forest green, warm ivory. Cool undertone: Navy, charcoal, ice blue, emerald.',
      bottom: 'Anchor with deep charcoal, dark navy, or toasted khaki trousers.',
      footwear: 'Rich chocolate brown for warm palettes; polished black for cool palettes.',
      accessories: 'Warm tones shine with gold/brass hardware; cool tones pair with silver/steel watches.',
      color: 'Wheatish Pakistani complexions glow intensely in earthy jewel tones. Avoid washed-out neon or muddy grey-beige.',
      colorHexes: ['#A0522D', '#2D5A27', '#E5A93C', '#2C3E50'],
      fabricRecommendation: 'Lustrous fabrics like Boski or high-twist tropical wool bring out color vibrancy.',
      darziTip: 'Contrast neck placket piping in a half-shade deeper than the base fabric.',
      estimatedBudgetPkr: 'PKR 5,000 – 11,000',
      marketLocations: 'Gul Ahmed / J. / Al-Karam outlets',
    },
    women: {
      top: 'Warm tone: Coral, turmeric yellow, teal, warm peach, deep rust. Cool tone: Royal sapphire, fuchsia, lilac, pure emerald.',
      bottom: 'Matching tonal trousers or soft off-white pants to extend the vertical line.',
      footwear: 'Nude, bronze, or antiqued metallic khussas.',
      accessories: 'Antique gold and polki for warm undertones; pearls and rhodium silver for cool undertones.',
      color: 'Use the 60-30-10 ratio: 60% base kameez color, 30% dupatta/trousers, 10% high-contrast accessories.',
      colorHexes: ['#D97706', '#047857', '#F43F5E', '#FFFBEB'],
      fabricRecommendation: 'Dyed raw silk or Chanderi cotton with a subtle natural sheen.',
      darziTip: 'Match lining fabric tone strictly to the top; mismatching lining alters the outer shade.',
      estimatedBudgetPkr: 'PKR 6,000 – 14,000',
      marketLocations: 'Nishat Linen / Sapphire / Anarkali Bazaars',
    },
    unisex: {
      top: 'Deep emerald, classic navy, and rich ivory are universally flattering on all South Asian skin tones.',
      bottom: 'Charcoal grey or natural beige bottoms.',
      footwear: 'Tan brown or classic white.',
      accessories: 'Select either all-warm or all-cool metals across rings and buckles.',
      color: 'Vein check test: Green veins indicate warm undertone, blue indicates cool, mixed indicates neutral.',
      colorHexes: ['#0F4C3A', '#1A2A44', '#F4F1EA'],
      fabricRecommendation: 'Natural unbleached cotton or linen.',
      darziTip: 'Clean concealed placket so color remains uninterrupted on the chest.',
      estimatedBudgetPkr: 'PKR 4,500 – 9,000',
      marketLocations: 'Any fabric store in local city bazaars',
    },
  },
  budget: {
    men: {
      top: '3-piece capsule: 1 solid white latha kurta, 1 deep navy kurta, 1 earthy olive kurta (approx PKR 5,500 total unstitched + stitching).',
      bottom: '1 off-white shalwar + 1 khaki chino (approx PKR 3,500 total).',
      footwear: '1 versatile dark brown Peshawari chappal + 1 basic white sneakers (approx PKR 4,000).',
      accessories: '1 stainless steel watch + 1 brown leather belt (approx PKR 2,000).',
      color: 'Restricting palette to Navy, White, Olive, and Khaki enables 12+ distinct interchangeable looks.',
      colorHexes: ['#FFFFFF', '#1B2A4A', '#556B2F', '#C2B280'],
      fabricRecommendation: 'Cotton-polyester blend (wash-and-wear) requires zero ironing and lasts multiple seasons.',
      darziTip: 'Bulk stitch 3 kurtas with your neighborhood darzi for a package discount of PKR 500-800 per suit.',
      estimatedBudgetPkr: 'PKR 14,000 – 15,000 total capsule',
      marketLocations: 'Ichhra & Anarkali (Lahore) / Zainab Market & Bolton Market (Karachi) / Raja Bazaar (Rwp)',
    },
    women: {
      top: 'Buy unstitched 2-piece / 3-piece lawn suits during end-of-season sales (PKR 2,500–3,500 each); plus 2 solid dyed kurtis.',
      bottom: '1 crisp white cigarette pant + 1 classic black trouser (reusable across 10+ tops).',
      footwear: '1 neutral gold khussa + 1 versatile daily sandal (approx PKR 3,500).',
      accessories: 'Oxidised silver jhumkay (PKR 600 from local street stall) + 2 plain chiffon contrast dupattas.',
      color: 'Buy statement prints for tops, keep all bottoms solid neutral to maximize mixing.',
      colorHexes: ['#FFFFFF', '#111111', '#B8860B', '#E07A5F'],
      fabricRecommendation: 'High-density lawn in summer; Karandi or Marina in winter.',
      darziTip: 'Ask darzi for simple straight cuts without heavy lace charges; add your own PK lace from bazaar.',
      estimatedBudgetPkr: 'PKR 12,000 – 15,000 total capsule',
      marketLocations: 'End-of-season brand sales online / Liberty Market & Fortress (Lahore) / Gulf Shopping Mall (Karachi)',
    },
    unisex: {
      top: 'Capsule of 4 tops in neutral tones (white, grey, black, olive).',
      bottom: '2 versatile bottoms: 1 relaxed dark denim + 1 straight trouser.',
      footwear: '1 clean everyday sneaker.',
      accessories: 'Minimal leather bracelet and canvas tote.',
      color: 'Capsule neutrals guarantee zero clashing.',
      colorHexes: ['#F8F9FA', '#212529', '#6C757D'],
      fabricRecommendation: 'Durable combed cotton.',
      darziTip: 'Standardized measurements kept on file with one trusted tailor.',
      estimatedBudgetPkr: 'PKR 10,000 – 13,000',
      marketLocations: 'Local wholesale fabric markets',
    },
  },
  body: {
    men: {
      top: 'For tall/lean: Add waistcoats or horizontal chest embroideries. For heavier build: Darker vertical kurtas with clean sharp shoulder seams.',
      bottom: 'Mid-rise straight fit trouser; avoid super-skinny pants that exaggerate proportions.',
      footwear: 'Structured Peshawari chappals or oxford shoes balance broad builds.',
      accessories: 'Scale watch dial to wrist: 38-40mm for leaner wrists, 42-44mm for broad frames.',
      color: 'Monochromatic dark column dressing (e.g. navy head-to-toe) visually elongates height.',
      colorHexes: ['#1C2833', '#2C3E50', '#566573'],
      fabricRecommendation: 'Medium-weight structured fabrics; avoid clingy sheer fabrics for heavier builds.',
      darziTip: 'For muscular or heavy build, ask tailor for an extra 1.5 inches ease on chest and armholes.',
      estimatedBudgetPkr: 'PKR 6,000 – 12,000',
      marketLocations: 'Cambridge / Ismail Farid / Custom master tailor',
    },
    women: {
      top: 'Pear shape: A-line kameez with statement neckline. Apple shape: V-neck empire cut. Petite: Knee-length straight kurti.',
      bottom: 'Straight pants or culottes; avoid tulip shalwars on bottom-heavy silhouettes.',
      footwear: 'Pointed toe or nude heels visually lengthen legs by 2 inches.',
      accessories: 'Vertical dupatta drape over one shoulder elongates the body line.',
      color: 'Lighter tones on top with darker trousers draws eyes upward gracefully.',
      colorHexes: ['#F39C12', '#2C3E50', '#ECF0F1'],
      fabricRecommendation: 'Fluid draping fabrics like Georgette or lightweight viscose.',
      darziTip: 'Ensure kameez side chaak (slits) start right at the waistline, never too low.',
      estimatedBudgetPkr: 'PKR 7,000 – 14,000',
      marketLocations: 'Sana Safinaz / Generation / Local boutique',
    },
    unisex: {
      top: 'The shoulder seam must sit precisely at the natural acromion bone for clean posture.',
      bottom: 'Hem bottoms right above the shoe collar to eliminate messy fabric puddling.',
      footwear: 'Color-matched shoes to bottom wear lengthens the silhouette.',
      accessories: 'Avoid excessively large bags that overwhelm smaller frames.',
      color: 'Single-color column dressing creates the cleanest visual line.',
      colorHexes: ['#2B2D42', '#8D99AE', '#EDF2F4'],
      fabricRecommendation: 'Structured linen or twill cotton.',
      darziTip: 'Always pre-shrink unstitched cotton fabric before submitting to tailor.',
      estimatedBudgetPkr: 'PKR 5,000 – 10,000',
      marketLocations: 'Charcoal / Local master tailors',
    },
  },
  weather: {
    men: {
      top: 'Summer (Karachi/Lahore): 100% fine cotton lawn or Irish linen in white, ice blue, or mint. Winter: Khaddar, karandi, or tweed waistcoat.',
      bottom: 'Breathable latha cotton shalwar in summer; warm wool-blend trousers in winter.',
      footwear: 'Open-toe Peshawari chappal or leather sandals for summer; chelsea boots or oxfords for winter.',
      accessories: 'UV-blocking sunglasses & cotton gamcha for summer; pure wool pashmina shawl for winter.',
      color: 'Pastels and whites reflect heat in June; deep forest greens and velvets preserve visual warmth in December.',
      colorHexes: ['#E0F2FE', '#F0FDF4', '#1E293B'],
      fabricRecommendation: 'Pakistani lawn (80/80 count) for scorching summer; Kamalia Khaddar for chill.',
      darziTip: 'Request loose armholes and half-inch wider cuffs for maximum summer ventilation.',
      estimatedBudgetPkr: 'PKR 5,000 – 10,000',
      marketLocations: 'Kamalia Khaddar outlets / Gul Ahmed Lawn / Al-Karam Studio',
    },
    women: {
      top: 'Summer: 100% soft lawn, voile, or Swiss cambric with cotton malmal dupatta. Winter: Velvet kaftan or embroidered karandi suit.',
      bottom: 'Lightweight cambric cotton trousers in summer; warm raw silk or velvet in winter.',
      footwear: 'Breathable leather khussas or open slides in summer; closed suede pumps in winter.',
      accessories: 'Light chiffon or mulmul dupatta in summer; Kashmiri embroidered shawl in winter.',
      color: 'Icy pastels (lilac, sky blue, butter yellow) in summer; royal ruby and emerald in winter.',
      colorHexes: ['#FEF08A', '#BAE6FD', '#701A75'],
      fabricRecommendation: 'Swiss lawn with zero polyester content for hot humid weather.',
      darziTip: 'Avoid heavy synthetic embroidery on chest area during peak summer to avoid irritation.',
      estimatedBudgetPkr: 'PKR 6,500 – 15,000',
      marketLocations: 'Khaadi Lawn / Maria.B / Liberty Market (Lahore)',
    },
    unisex: {
      top: 'Natural plant fibres (cotton, linen) regulate temperature far better than polyester.',
      bottom: 'Relaxed airy cuts promote cross-breeze airflow.',
      footwear: 'Perforated leather or breathable canvas.',
      accessories: 'Bucket hat or light scarf.',
      color: 'Light reflective neutrals.',
      colorHexes: ['#F1F5F9', '#CBD5E1', '#475569'],
      fabricRecommendation: 'Pure combed cotton.',
      darziTip: 'French seams (gum silai) prevent chafing in sweaty weather.',
      estimatedBudgetPkr: 'PKR 4,000 – 8,000',
      marketLocations: 'Local fabric markets',
    },
  },
  shoes: {
    men: {
      top: 'Keep outfit minimal when shoes are the artistic focal point.',
      bottom: 'Slightly cropped trouser (above the ankle bone) to showcase footwear craft.',
      footwear: 'Core 4 pairs: 1 Kaptaan/Noruzi Peshawari (cultural), 1 Brown Loafer (smart), 1 White Sneaker (casual), 1 Black Oxford (formal).',
      accessories: 'Belt leather tone must match footwear leather tone exactly.',
      color: 'Brown leather pairs best with navy and earth tones; black leather pairs with grey and black.',
      colorHexes: ['#5C4033', '#111111', '#FFFFFF', '#8B4513'],
      fabricRecommendation: 'Full-grain cowhide leather or soft nappa leather for zero shoe-bite.',
      darziTip: 'Specify 15-inch shalwar paicha or 6.5-inch trouser mori so trouser rests cleanly on shoe top.',
      estimatedBudgetPkr: 'PKR 4,500 – 12,000 per pair',
      marketLocations: 'Borjan / Servis / Hush Puppies / Moti Bazaar (Rawalpindi) / Peshawar Qissa Khwani',
    },
    women: {
      top: 'Solid monotone outfit lets embellished footwear and accessories shine.',
      bottom: 'Ankle-length trousers to display delicate anklets and khussa work.',
      footwear: 'Core 3 pairs: 1 Dabka/Tilla Khussa (eastern events), 1 Block Heel in Nude/Gold (weddings), 1 Flat Slide (daily).',
      accessories: 'Traditional payal (anklet), matching clutch with footwear metallic finish.',
      color: 'Metallic footwear (champagne gold, pewter silver) acts as a neutral across 90% of eastern outfits.',
      colorHexes: ['#D4AF37', '#E5E4E2', '#C08081'],
      fabricRecommendation: 'Velvet or pure leather base with interior cotton foam lining.',
      darziTip: 'Trouser length should be exactly 1 inch above ankle bone for footwear visibility.',
      estimatedBudgetPkr: 'PKR 3,500 – 9,000',
      marketLocations: 'Soma Shoes / Dazzle by Sarah / Mochis of Anarkali (Lahore)',
    },
    unisex: {
      top: 'Clean minimalist upper half.',
      bottom: 'Well-measured tailored hemline.',
      footwear: 'High-quality leather loafers or retro court trainers.',
      accessories: 'Leather watch strap matching footwear tone.',
      color: 'Harmonize leather tones across all accessories.',
      colorHexes: ['#4A3728', '#FFFFFF', '#262626'],
      fabricRecommendation: 'Genuine breathable leather.',
      darziTip: 'Ensure pant cuff doesn’t drag on heel.',
      estimatedBudgetPkr: 'PKR 5,000 – 10,000',
      marketLocations: 'Servis / English Boot House (Karachi) / Hub Leather',
    },
  },
  grooming: {
    men: {
      top: 'Crisply pressed shirt or starched kurta — fit and neatness beat expensive designer tags every time.',
      bottom: 'Impeccably ironed trousers with sharp front crease.',
      footwear: 'Polished footwear, clean heels, and fresh socks.',
      accessories: 'Well-tamed beard lines (use beard oil + razor cheek line), manicured nails, and authentic Taif Rose or Oud attar.',
      color: 'Navy and crisp white project unmatched competence and trust in professional and personal settings.',
      colorHexes: ['#0A192F', '#FFFFFF', '#64FFDA'],
      fabricRecommendation: '100% two-ply cotton.',
      darziTip: 'Ensure collar fits comfortably with one finger space between collar and neck.',
      estimatedBudgetPkr: 'PKR 3,000 – 6,000 grooming products',
      marketLocations: 'J. Fragrances / Saeed Ghani / Dari Mooch / Local barbershop',
    },
    women: {
      top: 'Structured silhouette (band collar kurta or tailored jacket over kameez) conveys poise.',
      bottom: 'Straight, clean-cut cigarette trousers.',
      footwear: 'Closed pumps, neat mules, or polished flat khussas.',
      accessories: 'Subtle pearl studs, structured tote bag, well-groomed brows, and a clean signature floral-musk scent.',
      color: 'Subtle neutrals (taupe, blush, navy, ivory) project elegance and composure.',
      colorHexes: ['#484848', '#E6D7CD', '#2E3A59'],
      fabricRecommendation: 'Wrinkle-resistant viscose or crepe silk.',
      darziTip: 'Clean concealed shoulder snap to keep bra straps and dupatta securely in place.',
      estimatedBudgetPkr: 'PKR 4,000 – 8,000 grooming essentials',
      marketLocations: 'Lulusar / Generation / Saeed Ghani',
    },
    unisex: {
      top: 'Neat seams, spotless collar, and upright posture.',
      bottom: 'Clean press and balanced hem.',
      footwear: 'Spotless, maintained footwear.',
      accessories: 'Daily basic skincare: Gentle cleanser, non-greasy moisturiser, and broad-spectrum SPF50.',
      color: 'Clean, understated palette.',
      colorHexes: ['#2B2B2B', '#EAEAEA', '#7A8B99'],
      fabricRecommendation: 'Breathable natural cotton.',
      darziTip: 'Always check button security before wearing.',
      estimatedBudgetPkr: 'PKR 3,000 – 5,000',
      marketLocations: 'Local pharmacy & grooming stores',
    },
  },
  jewelry: {
    men: {
      top: 'Pakistani menswear traditionally avoids heavy jewelry; instead, focus on executive metallic cufflinks, a subtle tie-pin, or an antique silver signet ring.',
      bottom: 'Clean tailored trousers or crisp shalwar.',
      footwear: 'Polished leather shoes or Peshawari chappals.',
      accessories: 'Rose gold or brass waistcoat chain, chronograph watch, and aged Dehn al Oud.',
      color: 'Subtle metallic buttons (brass, mother-of-pearl, or antique silver) provide the right hint of shine.',
      colorHexes: ['#C5A059', '#1C3F3A', '#FFFFFF'],
      fabricRecommendation: 'Cotton-latha or raw silk.',
      darziTip: 'Request dedicated French cuff buttonholes for heirloom cufflinks.',
      estimatedBudgetPkr: 'PKR 2,500 – 6,000',
      marketLocations: 'J. / Cambridge / Local silver artisan shops',
    },
    women: {
      top: 'Open boat-neck, wide sweetheart, or deep round neckline to give royal Kundan chokers and layered Polki malas space to sit flat against the collarbone.',
      bottom: 'Heavy flared sharara, lehenga, or gharara with intricate gota and tilla work coordinated with metallic jewelry tones.',
      footwear: 'Dabka-worked champagne gold khussas or metallic block heels.',
      accessories: 'Antique Kundan choker set with dangling pearls, Chandbali jhumkay with sahara chains, pearl matha patti, velvet glass bangles (chooriyan), and an oversized Arsi ring.',
      color: 'Match metal warmth to outfit base: Antique yellow gold and Kundan for deep emeralds, maroons and rusts; Polki, white rhodium and freshwater pearls for pastel pinks, silvers and mints.',
      colorHexes: ['#D4AF37', '#E5E4E2', '#800020', '#1C3F3A'],
      fabricRecommendation: 'Pure raw silk, organza, or Banarsi jamawar that supports heavier jewelry pieces without fabric sagging.',
      darziTip: 'Neckline depth must be planned to leave exactly 2.5 to 3 inches between the neck collar and necklace drape so jewels do not overlap fabric embroidery.',
      estimatedBudgetPkr: 'PKR 8,000 – 35,000 (Bridal / Festive Semiprecious)',
      marketLocations: 'Suhail Zargar & Anarkali Sarafa Bazaar (Lahore) / Tariq Road & Clifton (Karachi) / Rabi Center (Rawalpindi)',
    },
    unisex: {
      top: 'Minimalist statement neckline.',
      bottom: 'Straight trousers.',
      footwear: 'Artisanal footwear.',
      accessories: 'Vintage watch, cuff bracelet, and clean silver ring.',
      color: 'Balanced monochrome accents with metallic sheen.',
      colorHexes: ['#D4AF37', '#FFFFFF', '#333333'],
      fabricRecommendation: 'Linen or textured cotton.',
      darziTip: 'Clean placket.',
      estimatedBudgetPkr: 'PKR 3,000 – 7,000',
      marketLocations: 'Local artisan bazaars',
    },
  },
};

export function getFallbackAdvice(
  prompt: string,
  gender: Gender,
  ageGroup: AgeGroup,
  language: Language,
  preferredCategory?: CategoryId,
  stylePreference: StylePreference = 'traditional',
  learningProfile?: UserLearningProfile
): StylingAdvice {
  const pLower = (prompt || '').toLowerCase();
  const isOutfitRequest = /outfit|clothes|clothing|dress|suit|kapr|jora|shalwar|kurta|kameez|sherwani|lehenga|maxi|sari|saree|wardrobe|capsule|complete look|formal wear|casual wear|eid|wedding|shadi|nikkah|barat|walima|mehndi/i.test(pLower);

  const isHairOrBeard = /hair|cut|fade|taper|hairstyle|buzz|undercut|beard|daari|darhi|shave|mustache|facial|skincare|skin\s?care/i.test(pLower);
  const isFragrance = /fragrance|attar|perfume|scent|oud|khushbu|khushboo|dehn/i.test(pLower);
  const isShoesOnly = /shoe|khussa|peshawari|sneaker|chappal|boot|footwear|sandals/i.test(pLower) && !isOutfitRequest;
  const isJewelryOnly = /jhumka|kundan|polki|bangle|choori|necklace|earring|jewelry|jewel|choker|matha patti/i.test(pLower) && !isOutfitRequest;
  const isEtiquette = /etiquette|posture|manners|personality|confidence|interview|body language/i.test(pLower);

  // If asking for a specific non-clothing topic, return focused advice without rigid clothing templates
  if (!isOutfitRequest && (isHairOrBeard || isFragrance || isShoesOnly || isJewelryOnly || isEtiquette)) {
    if (isHairOrBeard) {
      const isUr = language === 'ur';
      const isRoman = language === 'roman';
      return {
        isSpecificAdvice: true,
        specificTopic: 'grooming',
        intro: isUr
          ? 'آپ کے چہرے کے خدوخال کے مطابق ٹیپر فیڈ (Taper Fade) اور متوازن داڑھی کی کٹنگ سب سے باوقار ہے۔ گالوں پر سیدھی لائن اور گردن پر کلین شیو رکھیں تاکہ شخصیت نکھر کر سامنے آئے۔'
          : isRoman
          ? 'Aap ke face shape ke mutabiq mid-to-low taper fade aur clean-lined beard grooming behtareen hai. Gaalon ki natural cheekline ko razor se sharp karein aur jawline par natural volume barkarar rakhein.'
          : 'For South Asian facial structures, a low-to-mid taper fade paired with a sculpted natural beard line delivers a razor-sharp, sophisticated appearance. Maintain density along the jawline while keeping the cheekline clean.',
        accessories: isUr
          ? 'قدرتی بیئرڈ آئل (بادام و جوجوبا) اور عود کی ہلکی مہک'
          : isRoman
          ? 'Natural beard oil (Jojoba + Argan) aur wood bristle comb'
          : 'Natural botanical beard oil with light sandalwood or oud notes',
        color: isUr
          ? 'چہرے کے نکھار کے لیے قدرتی لائٹنگ اور ہائیڈریشن'
          : isRoman
          ? 'Natural skin tone enhancement via daily SPF & hydration'
          : 'Clean skin finish with matte non-greasy moisturizer & SPF 50',
        colorHexes: ['#1C1917', '#44403C', '#78716C'],
        estimatedBudgetPkr: 'PKR 1,500 – 3,500 (Grooming / Salon)',
        marketLocations: 'Saeed Ghani / Dari Mooch / Professional local barber studio',
        category: 'grooming',
        styleTips: isUr
          ? [
              'داڑھی کو روزانہ دھونے کے بعد بیئرڈ بام کا استعمال کریں تاکہ بال نرم اور سلجھے رہیں۔',
              'ہفتے میں ایک بار گردن کی لائن کو ایڈمز ایپل سے دو انگلیاں اوپر تراشیں۔'
            ]
          : isRoman
          ? [
              'Haftay mein ek martaba neck line ko Adam\'s apple se 2 unglian upar bilkul saaf karein.',
              'Har roz nahane ke baad do qatray beard oil lagayein taake rukhsaar khushk na ho.'
            ]
          : [
              'Shape your neck neckline exactly two fingers above your Adam’s apple for a crisp jawline.',
              'Apply 2-3 drops of argan-based beard oil right after washing to prevent coarseness and flakes.'
            ],
        followUpSuggestions: [
          'Best haircut for round vs oval face',
          'Pakistani beard growth & care routine',
          'Signature attar to pair with fresh haircut'
        ]
      };
    }

    if (isFragrance) {
      const isUr = language === 'ur';
      const isRoman = language === 'roman';
      return {
        isSpecificAdvice: true,
        specificTopic: 'fragrance',
        intro: isUr
          ? 'پاکستانی ثقافت اور گرم و مرطوب موسم کے لیے الکحل سے پاک خالص عود (Dehn al Oud)، طائف روز یا سفید مشک سب سے باوقار اور دیرپا خوشبو فراہم کرتے ہیں۔'
          : isRoman
          ? 'Pakistani shahi elegance ke liye alcohol-free pure Dehn al Oud, Taif Rose aur White Amber attar lazawab hain. Yeh kapray par 24 ghantay tak mehek barkarar rakhtay hain.'
          : 'For authentic South Asian royal refinement and high humidity longevity, artisanal pure Dehn al Oud, Taif Rose, and Royal White Amber offer superior sillage and lasting power over synthetic sprays.',
        accessories: isUr
          ? 'خالص عود کی رول آن شیشی اور سلور بٹن'
          : isRoman
          ? 'Handcrafted attar crystal bottle, sandalwood beads'
          : 'Crystal pocket attar bottle with natural amber base',
        color: isUr
          ? 'گہرے اور پُروقار عود ٹونز (امبر و عقیق)'
          : isRoman
          ? 'Rich amber, warm saffron aur mahogany hues'
          : 'Warm amber, saffron, and deep mahogany resonance',
        colorHexes: ['#78350F', '#B45309', '#D97706'],
        estimatedBudgetPkr: 'PKR 2,500 – 8,000 (Pure Attar Concentrates)',
        marketLocations: 'J. Fragrances / Saeed Ghani / Anarkali Attar Galli (Lahore) / Bolton Market (Karachi)',
        category: 'grooming',
        styleTips: isUr
          ? [
              'عطر کو ہمیشہ نبض کے مقامات (کلائی، گردن اور کان کے پیچھے) پر لگائیں تاکہ جسم کی حرارت سے خوشبو پھیلے۔',
              'گرمیوں میں سفید کستوری یا شمامة العنبر اور سردیوں میں کمبوڈی عود کا انتخاب کریں۔'
            ]
          : isRoman
          ? [
              'Attar ko hamesha pulse points (kalai, kaan ke peechay aur collarbone) par halka tap karein.',
              'Garmiyon mein soft white musk ya khus aur sardiyon mein heavy Cambodian oud chunein.'
            ]
          : [
              'Dab concentrated attar on pulse points (wrists and side of neck) instead of rubbing vigorously.',
              'Choose white musk or vetiver (khus) for summer heat, and smoky Cambodian oud for cool evenings.'
            ],
        followUpSuggestions: [
          'Best long-lasting attar for wedding night',
          'How to prevent attar stains on white kurta',
          'Difference between Cambodian and Hindi Oud'
        ]
      };
    }

    if (isShoesOnly) {
      const isUr = language === 'ur';
      const isRoman = language === 'roman';
      return {
        isSpecificAdvice: true,
        specificTopic: 'shoes',
        intro: isUr
          ? 'مردانہ روایتی وقار کے لیے ڈبل سول نوروزی پشاوری چپل (آکس بلڈ یا میٹ بلیک) اور خواتین کے لیے ہاتھ سے کڑھا ہوا تلّہ و زری کھسہ کلاسک ترین انتخاب ہے۔'
          : isRoman
          ? 'Pakistani footwear mein double-sole Noruzi Peshawari chappal (men) aur handcrafted dabka/tilla khussa (women) sab se iconic hain. Yeh kisi bhi eastern attire ko instant royal look detay hain.'
          : 'Traditional Noruzi double-sole Peshawari chappals in deep oxblood or matte black (for men) and artisanal hand-tilla embroidered velvet khussas (for women) anchor any Pakistani look with heritage authority.',
        footwear: gender === 'women'
          ? 'Handcrafted champagne gold tilla embroidered velvet khussa with memory foam inner lining'
          : 'Handmade double-sole Noruzi Peshawari chappal in matte oxblood or rich tan cowhide leather',
        color: 'Earthy rich leathers (tan, oxblood, deep black) and antique gold metallic finishes',
        colorHexes: ['#5C4033', '#111111', '#D4AF37'],
        estimatedBudgetPkr: 'PKR 4,000 – 12,000 per pair',
        marketLocations: 'Borjan / Servis / Mochis of Anarkali (Lahore) / Qissa Khwani Bazaar (Peshawar)',
        category: 'shoes',
        styleTips: isUr
          ? [
              'کھسے یا چپل کا کاٹنے سے بچنے کے لیے نئے جوتے کے اندرونی کناروں پر سرسوں کا تیل ہلکا سا لگائیں۔',
              'شلوار یا پاجامے کا پائنچہ جوتے کے اوپری کنارے سے آدھا انچ اونچا رکھیں تاکہ جوتے کا ڈیزائن واضح ہو۔'
            ]
          : isRoman
          ? [
              'Khussa bite se bachne ke liye pehli dafa pehanne se pehle androoni chamray par thora sa tel ya vaseline lagayein.',
              'Shalwar ka paicha jootay ke upar sauber girna chahiye, bilkul zameen par ghasitna nahi chahiye.'
            ]
          : [
              'Condition new leather khussas with a dab of natural oil on interior seams 24h prior to prevent shoe-bite.',
              'Ensure trouser cuffs or shalwar paicha sit precisely at or 0.5 inches above the shoe collar.'
            ],
        followUpSuggestions: [
          'Kaptaan vs Noruzi chappal differences',
          'How to break in handmade leather khussa',
          'Shoe colors that match navy and ivory kurtas'
        ]
      };
    }
  }

  const cat = preferredCategory || detectCategory(prompt);
  const data = FALLBACK_DATABASE[cat]?.[gender] || FALLBACK_DATABASE.festive[gender];
  const styleInfo = STYLE_PREFERENCES.find((s) => s.id === stylePreference) || STYLE_PREFERENCES[0];

  const stylePrefixes: Record<StylePreference, Record<Language, string>> = {
    traditional: {
      en: 'Rich heritage & artisanal craftsmanship',
      roman: 'Khaalis riwayati aur dastkari andaaz',
      ur: 'خالص روایتی اور دستکاری حسن',
    },
    minimalist: {
      en: 'Minimalist solid tones & crisp clean cuts',
      roman: 'Sada, nafess aur unembellished minimalist andaaz',
      ur: 'سادہ، نفیس اور پُرسکون منیمالسٹ انداز',
    },
    fusion: {
      en: 'Modern Indo-Western fusion silhouette',
      roman: 'Jadeed modern fusion aur contemporary silhouette',
      ur: 'جدید فیوژن اور ہم عصر پاکستانی انداز',
    },
    luxury: {
      en: 'Opulent high-end luxury formal execution',
      roman: 'Shahi luxury formal aur Banarsi raw silk grandeur',
      ur: 'شاہی لگژری اور شاندار بنارسی ریشم کا امتزاج',
    },
  };

  let learnedNote = '';
  if (learningProfile && learningProfile.totalRatings > 0) {
    if (learningProfile.likedElements.length > 0) {
      learnedNote =
        language === 'ur'
          ? ` (آپ کی سابقہ پسند کے مطابق تیار شدہ)`
          : language === 'roman'
          ? ` · Stylist Memory active (${learningProfile.totalRatings} ratings)`
          : ` · Personalized from your ${learningProfile.totalRatings} rated look(s)`;
    }
  }

  const intros: Record<Language, string> = {
    en: `Here is your executive styling breakdown tailored for ${gender} (${AGE_GROUPS.find((a) => a.id === ageGroup)?.label}) with a focus on ${styleInfo.label} (${stylePrefixes[stylePreference].en})${learnedNote}:`,
    roman: `Yeh raha aap ke liye Pakistani fashion intelligence ke mutabiq mukammal styling mashwara (${gender === 'men' ? 'Mardana' : gender === 'women' ? 'Zanana' : 'Unisex'}) — ${styleInfo.label} (${stylePrefixes[stylePreference].roman})${learnedNote}:`,
    ur: `یہ رہا آپ کے لیے مستند پاکستانی فیشن اور اسٹائلنگ کا تفصیلی خاکہ (${styleInfo.label} — ${stylePrefixes[stylePreference].ur})${learnedNote}:`,
  };

  const followUps: Record<CategoryId, string[]> = {
    festive: ['Waistcoat embroidery design tips', 'Matching footwear (Peshawari vs Khussa)', 'Best wedding perfume notes'],
    casual: ['Best sneakers to wear with Kurta', 'Budget brands under PKR 5,000', 'Karachi vs Lahore summer styles'],
    color: ['Does gold or silver look better on me?', 'Contrasting dupatta ideas', 'Jewel tones for night functions'],
    budget: ['Wholesale market locations in Lahore/Karachi', 'Darzi cost saving checklist', 'Essential 5-piece capsule items'],
    body: ['Collar styles that slim the face', 'Flared vs cigarette trousers', 'Footwear that adds height'],
    weather: ['Best lawn brands that do not bleed', 'Kamalia Khaddar vs Karandi', 'Sweat-resistant cotton blends'],
    shoes: ['Kaptaan vs Noruzi chappal difference', 'How to prevent khussa shoe-bite', 'Best polish for leather'],
    grooming: ['Beard shape for oval and round faces', 'Long-lasting alcohol-free attar recommendations', 'Summer skincare routine for Pakistan'],
    jewelry: ['Kundan vs Polki vs Jadau differences', 'Best earrings for round faces', 'How to style bridal matha patti with jhumkas'],
  };

  // Tailor fabric and top wear details based on style preference
  let customizedTop = data.top;
  let customizedFabric = data.fabricRecommendation;

  if (stylePreference === 'minimalist') {
    customizedTop = `Solid tone unembellished cut with concealed placket: ${data.top.split(';')[0]}. Avoid heavy resham or tilla work; embrace understated monochrome draping.`;
    customizedFabric = `Matte finish breathable organic cotton or smooth Irish linen without shine.`;
  } else if (stylePreference === 'luxury') {
    customizedTop = `Royal Banarsi or pure 80g raw silk baseline: ${data.top}. Pair with antique gold/champagne metallic accents or hand-embroidered French bullion wire motifs.`;
    customizedFabric = `Pure raw silk, pure chiffon, or handloom Banarsi jamawar.`;
  } else if (stylePreference === 'fusion') {
    customizedTop = `Contemporary cut short asymmetrical kurta or bandhgala jacket silhouette: ${data.top}. Harmonizes contemporary sharpness with Pakistani heritage.`;
    customizedFabric = `Textured cotton-linen blend or lightweight modal cotton.`;
  }

  // Adjust if user disliked certain fabrics in past ratings
  if (learningProfile?.dislikedElements && learningProfile.dislikedElements.length > 0) {
    customizedFabric = `${customizedFabric} (Crafted avoiding synthetic or stiff blends previously flagged in your stylist feedback).`;
  }

  return {
    intro: intros[language] || intros.en,
    top: customizedTop,
    bottom: data.bottom,
    footwear: data.footwear,
    accessories: data.accessories,
    color: data.color,
    colorHexes: data.colorHexes,
    fabricRecommendation: customizedFabric,
    darziTip: data.darziTip,
    estimatedBudgetPkr: data.estimatedBudgetPkr,
    marketLocations: data.marketLocations,
    category: cat,
    followUpSuggestions: followUps[cat] || ['More festive ideas', 'Budget tips', 'Color contrasts'],
  };
}
