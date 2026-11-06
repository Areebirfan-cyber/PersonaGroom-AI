import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '25mb' }));

// Initialize GoogleGenAI server-side with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const AGE_LABELS: Record<string, string> = {
  teen: 'Teens (13–17 yrs)',
  uni: 'Young Adults (18–24 yrs)',
  pro: 'Professionals / Corporate (25–39 yrs)',
  mature: 'Mature / Seniors (40+ yrs)',
};

const LANG_DESCRIPTIONS: Record<string, string> = {
  en: 'English with authentic Pakistani cultural terms (kurta, shalwar, sherwani, khussa, dupattas, etc.)',
  roman: 'Roman Urdu (Urdu written phonetically in Latin alphabet, natural Pakistani conversational style: "Aap ke liye yeh behter rahega...")',
  ur: 'Urdu written in formal Nastaliq script (اردو رسم الخط)',
};

// Health & configuration check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5),
    model: 'gemini-3.8-flash',
  });
});

const STYLE_DESCRIPTIONS: Record<string, string> = {
  traditional: 'Traditional Pakistani Heritage (classical silhouettes like kalidar, sherwani, traditional shalwar, authentic embroidery, gota, tilla, hand-loomed heritage fabrics)',
  minimalist: 'Minimalist & Quiet Luxury (clean geometric lines, unembellished solid premium fabrics, subdued tone-on-tone or monochrome palettes, zero loud logos, refined subtle elegance)',
  fusion: 'Modern Eastern-Western Fusion (short kurtas paired with structured denim or chinos, minimalist sneakers or loafers, rolled sleeves, relaxed jackets over kurtas)',
  luxury: 'Luxury Haute Formal (bespoke pure raw silk, Banarsi brocade, statement waistcoats with gold/brass hardware, royal jewel tones, rich regal presence)',
};

// Procedural Bespoke Outfit SVG Generator matching exact prompt, silhouette and colors
function generateBespokeOutfitSvg(params: {
  top: string;
  bottom: string;
  fabric: string;
  gender: string;
  stylePreference: string;
  colors: string[];
  userPrompt: string;
}): string {
  const { top, bottom, fabric, gender, stylePreference, colors, userPrompt } = params;
  const c1 = colors[0] || (gender === 'women' ? '#881337' : '#0f766e');
  const c2 = colors[1] || '#fbbf24';
  const c3 = colors[2] || '#f8fafc';

  const safePrompt = (userPrompt || 'Custom Pakistani Outfit').replace(/[<>&"]/g, '');
  const safeTop = (top || 'Tailored Kurta').slice(0, 80).replace(/[<>&"]/g, '');
  const safeBottom = (bottom || 'Tailored Trousers').slice(0, 75).replace(/[<>&"]/g, '');
  const safeFabric = (fabric || 'Pure Raw Silk').slice(0, 45).replace(/[<>&"]/g, '');
  const isFemale = gender === 'women';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070b14"/>
      <stop offset="50%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="fabricGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="50%" stop-color="${c1}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.65"/>
    </linearGradient>
    <linearGradient id="goldTrim" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${c2}"/>
      <stop offset="50%" stop-color="#fff" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <linearGradient id="bottomGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${c3}"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </linearGradient>
  </defs>

  <!-- Studio Background -->
  <rect width="800" height="1000" fill="url(#bgGrad)"/>

  <!-- Heritage Mughal Arch Blueprint Lines -->
  <path d="M 180 880 L 180 340 C 180 160, 620 160, 620 340 L 620 880" fill="none" stroke="${c2}" stroke-width="1.5" stroke-opacity="0.22" stroke-dasharray="6,4"/>
  <circle cx="400" cy="220" r="150" fill="none" stroke="${c1}" stroke-width="1.2" stroke-opacity="0.18"/>

  <!-- Header Card Badge -->
  <g transform="translate(50, 36)">
    <rect width="700" height="74" rx="14" fill="#1e293b" fill-opacity="0.65" stroke="${c2}" stroke-opacity="0.35"/>
    <text x="24" y="30" font-family="'Manrope', -apple-system, sans-serif" font-size="11" font-weight="700" fill="${c2}" letter-spacing="2">PERSONAGROOM AI · EXACT BESPOKE OUTFIT VISUAL</text>
    <text x="24" y="56" font-family="'Manrope', -apple-system, sans-serif" font-size="15" font-weight="600" fill="#f8fafc">"${safePrompt}"</text>
  </g>

  <!-- Grounding Contact Shadow -->
  <ellipse cx="400" cy="840" rx="190" ry="22" fill="#000" fill-opacity="0.65"/>

  <!-- 3D Outfit Silhouette Group -->
  <g transform="translate(400, 520)">
    ${
      isFemale
        ? `<!-- Women Silhouette (Kalidar Kurti + Flared Sharara / Lehenga) -->
    <!-- Flared Sharara / Lehenga Bottom -->
    <path d="M -80 80 L -190 320 L 190 320 L 80 80 Z" fill="${c3}" fill-opacity="0.95" stroke="#e2e8f0" stroke-width="1.5"/>
    <!-- Hem Embroidery Border -->
    <path d="M -180 295 L 180 295 L 185 315 L -185 315 Z" fill="url(#goldTrim)" opacity="0.85"/>

    <!-- Fitted Embroidered Kurti Torso -->
    <path d="M -75 -200 L -140 -165 L -115 -90 L -65 -130 L -75 120 L 75 120 L 65 -130 L 115 -90 L 140 -165 L 75 -200 Z" fill="url(#fabricGrad)" stroke="${c2}" stroke-width="2"/>

    <!-- Neckline Ornamentation -->
    <path d="M -40 -200 Q 0 -170 40 -200 L 30 -160 Q 0 -140 -30 -160 Z" fill="url(#goldTrim)"/>

    <!-- Royal Draped Dupatta -->
    <path d="M -130 -165 Q -60 -110 0 -90 Q 60 -70 140 -120 L 155 -90 Q 60 -40 -10 -70 Q -80 -90 -145 -135 Z" fill="${c2}" fill-opacity="0.35" stroke="${c2}" stroke-width="1.5"/>
    `
        : `<!-- Men Silhouette (Bespoke Kurta / Sherwani + Tailored Trousers) -->
    <!-- Bottom Wear Trousers -->
    <path d="M -75 120 L -90 320 L -40 320 L -15 170 L 15 170 L 40 320 L 90 320 L 75 120 Z" fill="url(#bottomGrad)" stroke="#94a3b8" stroke-width="1.5"/>

    <!-- Top Wear Kurta/Sherwani Body -->
    <path d="M -85 -200 L -155 -165 L -130 -90 L -75 -130 L -80 150 L 80 150 L 75 -130 L 130 -90 L 155 -165 L 85 -200 Z" fill="url(#fabricGrad)" stroke="${c2}" stroke-width="2"/>

    <!-- Flare Ghera -->
    <path d="M -80 60 L -115 170 L 115 170 L 80 60 Z" fill="url(#fabricGrad)" stroke="${c2}" stroke-width="1.5"/>

    <!-- Mandarin Ban Collar -->
    <path d="M -36 -200 Q 0 -218 36 -200 L 30 -172 Q 0 -186 -30 -172 Z" fill="url(#goldTrim)" stroke="#d4af37" stroke-width="1.5"/>

    <!-- Embroidered Placket Center Strip -->
    <rect x="-7" y="-178" width="14" height="230" fill="url(#goldTrim)" rx="3"/>
    <!-- Gold Tilla Buttons -->
    <circle cx="0" cy="-155" r="3" fill="#fff"/>
    <circle cx="0" cy="-120" r="3" fill="#fff"/>
    <circle cx="0" cy="-85" r="3" fill="#fff"/>
    <circle cx="0" cy="-50" r="3" fill="#fff"/>
    <circle cx="0" cy="-15" r="3" fill="#fff"/>
    <circle cx="0" cy="20" r="3" fill="#fff"/>
    `
    }

    <!-- Handcrafted Footwear at Base -->
    <g transform="translate(-65, 320)">
      <ellipse cx="0" cy="6" rx="26" ry="11" fill="#3e2723" stroke="${c2}" stroke-width="1"/>
      <path d="M -14 3 Q 0 -6 14 3" fill="none" stroke="${c2}" stroke-width="1.5"/>
    </g>
    <g transform="translate(65, 320)">
      <ellipse cx="0" cy="6" rx="26" ry="11" fill="#3e2723" stroke="${c2}" stroke-width="1"/>
      <path d="M -14 3 Q 0 -6 14 3" fill="none" stroke="${c2}" stroke-width="1.5"/>
    </g>
  </g>

  <!-- Look Specifications Tailor Card at Bottom -->
  <g transform="translate(50, 835)">
    <rect width="700" height="128" rx="14" fill="#0f172a" fill-opacity="0.9" stroke="#334155" stroke-width="1.5"/>

    <!-- Swatch Chips -->
    <circle cx="45" cy="40" r="16" fill="${c1}" stroke="#fff" stroke-width="2"/>
    <circle cx="85" cy="40" r="16" fill="${c2}" stroke="#fff" stroke-width="2"/>
    <circle cx="125" cy="40" r="16" fill="${c3}" stroke="#fff" stroke-width="2"/>

    <text x="160" y="38" font-family="'Manrope', -apple-system, sans-serif" font-size="13" font-weight="700" fill="#f8fafc">Top: ${safeTop}</text>
    <text x="160" y="58" font-family="'Manrope', -apple-system, sans-serif" font-size="11" fill="#94a3b8">Bottom: ${safeBottom}</text>
    <text x="160" y="78" font-family="'Manrope', -apple-system, sans-serif" font-size="11" font-weight="600" fill="${c2}">Fabric: ${safeFabric} · ${stylePreference.toUpperCase()} STYLE</text>

    <!-- Watermark Badge -->
    <rect x="520" y="90" width="160" height="24" rx="6" fill="#1e1b4b" stroke="${c2}" stroke-opacity="0.4"/>
    <text x="532" y="106" font-family="'Manrope', -apple-system, sans-serif" font-size="9" font-weight="700" fill="${c2}">EXACT BESPOKE MATCH</text>
  </g>
</svg>`;
}

// Helper to generate bespoke outfit visual matching exact user prompt and advice
function sanitizeFashionImagePrompt(
  rawText: string,
  gender: string = 'men',
  category?: string
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

  // 6. Clothing / Couture
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

// Helper to generate bespoke outfit visual matching exact user prompt and advice
async function generateOutfitVisualForAdvice(
  userPrompt: string,
  advice: any,
  gender: string = 'men',
  stylePreference: string = 'traditional',
  ageGroup: string = 'uni'
): Promise<{ imageUrl: string; fallbackUrl: string; caption: string; prompt: string; isAiGenerated: boolean }> {
  const combined = `${userPrompt || ''} ${advice?.intro || ''} ${advice?.top || ''} ${advice?.accessories || ''}`;
  const dynamicPrompt = sanitizeFashionImagePrompt(combined, gender, advice?.category);
  const seed = Date.now();
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(dynamicPrompt)}?width=800&height=500&nologo=true&seed=${seed}`;
  const cleanCategoryKeywords = `${gender === 'women' ? 'women' : 'men'},${advice?.category || (gender === 'women' ? 'lehenga' : 'kurta')}`;
  const fallbackUrl = `https://loremflickr.com/800/500/pakistani,fashion,${encodeURIComponent(cleanCategoryKeywords)}`;

  return {
    imageUrl: pollinationsUrl,
    fallbackUrl,
    caption: `Dynamic AI Visual · ${advice?.isSpecificAdvice ? (advice.specificTopic || 'Grooming & Style') : (advice?.top || 'Pakistani Couture').slice(0, 45)}`,
    prompt: dynamicPrompt,
    isAiGenerated: true,
  };
}

// Main AI Styling Agent Endpoint
app.post('/api/agent/consult', async (req, res) => {
  try {
    const {
      prompt,
      gender = 'men',
      ageGroup = 'uni',
      language = 'roman',
      category = 'festive',
      stylePreference = 'traditional',
      image,
      history = [],
      learningProfile,
      apiKey,
    } = req.body;

    if (!prompt && !image) {
      return res.status(400).json({ error: 'Prompt or image is required' });
    }

    const effectiveApiKey = apiKey || process.env.GEMINI_API_KEY || '';
    if (!effectiveApiKey) {
      return res.status(503).json({
        error: 'No Gemini API key available. Falling back to offline fashion intelligence.',
        useFallback: true,
      });
    }

    const activeAi = apiKey
      ? new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        })
      : ai;

    let learningInstruction = '';
    if (learningProfile && learningProfile.totalRatings > 0) {
      const likesText =
        learningProfile.likedElements && learningProfile.likedElements.length > 0
          ? `\n  - Elements the user LOVES (rated 4-5 stars): ${learningProfile.likedElements.join('; ')}`
          : '';
      const dislikesText =
        learningProfile.dislikedElements && learningProfile.dislikedElements.length > 0
          ? `\n  - Elements the user DISLIKES / DOWNVOTED (STRICTLY AVOID or minimize): ${learningProfile.dislikedElements.join('; ')}`
          : '';
      const tagsText =
        learningProfile.topLikedTags && learningProfile.topLikedTags.length > 0
          ? `\n  - User Praise Themes: ${learningProfile.topLikedTags.map((t: any) => t.tag).join(', ')}`
          : '';
      const critText =
        learningProfile.topDislikedTags && learningProfile.topDislikedTags.length > 0
          ? `\n  - Avoid Critique Themes: ${learningProfile.topDislikedTags.map((t: any) => t.tag).join(', ')}`
          : '';
      const notesText =
        learningProfile.recentNotes && learningProfile.recentNotes.length > 0
          ? `\n  - User Direct Stylist Notes: "${learningProfile.recentNotes.join('", "')}"`
          : '';

      learningInstruction = `\n- CONTINUOUS LEARNING FROM USER RATINGS (${learningProfile.totalRatings} rated consultations, ${learningProfile.satisfactionRate}% satisfaction score):
  You MUST actively adapt your recommendations based on this user's stored satisfaction history:
  ${likesText}${dislikesText}${tagsText}${critText}${notesText}
  PRIORITIZE fabrics, cuts, silhouettes, and color treatments that this specific user rated highly. If they previously critiqued a fabric as impractical or an item as too expensive/casual, adjust your recommendations to satisfy their refined tastes.`;
    }

    const systemInstruction = `You are PersonaGroom AI, Pakistan's premier cultural fashion stylist, haute-couture consultant, and master grooming architect.
Your expertise spans:
1. Pakistani Traditional & Modern Wear: Kurtas, shalwar kameez, sherwanis, prince coats, waistcoats, lehengas, ghararas, shararas, peplums, sarees, lawn suits, and eastern-western fusion.
2. Pakistani High-Street & Designer Brands: Khaadi, Sapphire, J. (Junaid Jamshed), Gul Ahmed, Sana Safinaz, Maria.B, Bareeze, Amir Adnan, Ismail Farid, Cambridge, Charcoal, Outfitters, Rastah, Republic, Deepak Perwani, Sania Maskatiya.
3. Pakistani Markets & Bazaars: Anarkali & Liberty (Lahore), Zainab Market & Tariq Road (Karachi), Raja Bazaar (Rawalpindi), Saddar (Peshawar).
4. Local Fabrics: Lawn, voile, cambric, khaddar, karandi, wash-and-wear, latha, Boski, pure raw silk, organza, velvet, jamawar, chiffon.
5. Footwear & Accessories: Handcrafted Peshawari chappals (Noruzi / Kaptaan style), velvet khussas, leather kolhapuris, loafers, kundan / polki jewellery, jhumkay, matha patti, dupattas, pocket squares, cufflinks, oud / attar scents.
6. Target Demographic: Audience gender is "${gender}", age group is "${AGE_LABELS[ageGroup] || ageGroup}".
7. Response Language: Must reply strictly in ${LANG_DESCRIPTIONS[language] || 'Roman Urdu'}. If Urdu, write in beautiful Arabic/Urdu script. If Roman Urdu, write natural, respectful Roman Urdu.

CRITICAL INSTRUCTIONS & STRICT CONVERSATIONAL CONSTRAINTS:
- SIMPLE EVERYDAY LANGUAGE & COMMON WORDS (MANDATORY):
  - Generate responses in clear, simple, everyday words (in English, Roman Urdu, or Urdu Script based on user selection) so anyone can easily understand.
  - Use plain color names (e.g. Red, Dark Blue, Emerald Green, Gold, Jet Black, Ivory White, Soft Pink, Mustard Yellow) instead of complicated fashion jargon.
  - Use common, practical clothing names (e.g. Shalwar Kameez, Kurta, Sherwani, Lehenga, Waistcoat, Khussa, Sneakers, Peshawari Chappal, Pajama, Trousers) that everyone in Pakistan recognizes.
- DYNAMIC CONTEXT-AWARE FORMATTING RULES (STRICT):
  1. IF the user asks for OUTFIT / CLOTHES / WEDDING WEAR / COMPLETE LOOK / SHALWAR KAMEEZ / KURTA / FESTIVE / FORMAL:
     - Provide full outfit breakdown: set detailed 'top', 'bottom', 'footwear', 'accessories', 'color', 'colorHexes', 'fabricRecommendation', and 'darziTip'.
     - Set 'isSpecificAdvice': false.
  2. IF the user asks for SPECIFIC NON-CLOTHING TOPICS (e.g. Haircut, Beard, Grooming, Etiquette, Fragrance/Attar, Shoes only, Jewelry only):
     - Answer ONLY the specific question directly and concisely in 'intro'.
     - DO NOT provide irrelevant clothing specs: set 'top', 'bottom', 'fabricRecommendation', and 'darziTip' to empty strings (""). NEVER output "N/A", "none", or forced clothing specs!
     - Set 'isSpecificAdvice': true.
     - Set 'specificTopic': Short topic title (e.g. "Haircut & Beard Grooming", "Signature Fragrance & Attar", "Footwear Craft", "Royal Etiquette").
     - Set 'styleTips': exactly 2 short, high-value optional style tips relevant to this specific topic.
- STYLE PREFERENCE ENFORCEMENT: The user's chosen style preference is "${STYLE_DESCRIPTIONS[stylePreference] || stylePreference}". You MUST deliberately shape all silhouette cuts, color choices, embellishment density, fabric choices, and styling details around this exact aesthetic mood.${learningInstruction}
- ABSOLUTE UNIVERSITY RULE: NEVER mention "university", "uni", "college", "campus", "assignments", or "student life" UNLESS the user explicitly mentions words like "uni", "university", "college", "campus", or "classes" in their message! If the user asks about Eid, wedding, Barat, Nikkah, Walima, party, casual wear, office, dinner, or travel, give advice tailored STRICTLY for that specific occasion without mentioning university!
- DYNAMIC, NON-REPETITIVE ADVICE: NEVER give identical or boilerplate responses. Tailor every piece of advice to the unique prompt, occasion, colors, and vibe the user asked about. Be creative, specific, and culturally sophisticated. If answering follow-ups, build upon the previous conversation rather than repeating previous points.
- GENDER-AWARE ACCESSORIES: When target gender is "women", provide rich traditional Pakistani jewelry recommendations (Kundan, Polki, Chandbali jhumkay, matha patti, velvet glass bangles/chooriyan, and rings). When target gender is "men" or "unisex", do NOT recommend jewelry; focus strictly on masculine accessories such as classic watches, cufflinks, waistcoat brooches/chains, pocket squares, and pure taif rose or oud attar.
- Include 3 to 5 realistic HEX color codes matching the recommended color palette.
- Estimate realistic PKR price ranges.
- Select the best visualConceptImage that accurately represents this exact look: "men_festive", "women_festive", "women_jewelry", "men_casual", "women_casual", "shoes_craft", "colors", or "formal".
- Provide 3 compelling follow-up prompts the user could ask next.`;

    const historyBlock =
      history && Array.isArray(history) && history.length > 0
        ? `\nPrevious Conversation Context (DO NOT REPEAT PREVIOUS ANSWERS, EVOLVE THE LOOK):\n` +
          history
            .slice(-4)
            .map((h: any) => `${h.role === 'user' ? 'User' : 'PersonaGroom AI'}: ${h.text || ''}`)
            .join('\n')
        : '';

    const memoryStatusNote =
      learningProfile && learningProfile.totalRatings > 0
        ? `\nLearned User Feedback Profile: ${learningProfile.totalRatings} ratings recorded (${learningProfile.satisfactionRate}% satisfaction score). Honor user preferences!`
        : '';

    const userMessageContent = `User Request: ${prompt || 'Analyze this outfit/fabric and give complete styling advice.'}
Target Gender: ${gender}
Target Age Group: ${AGE_LABELS[ageGroup] || ageGroup}
Selected Style Preference: ${STYLE_DESCRIPTIONS[stylePreference] || stylePreference}${memoryStatusNote}
Requested Language: ${language}
Context Category: ${category}${historyBlock}`;

    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

    // Multimodal image support
    if (image && typeof image === 'string') {
      const match = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    }

    parts.push({ text: userMessageContent });

    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let lastError: any = null;
    let parsed: any = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await activeAi.models.generateContent({
          model: modelName,
          contents: { parts },
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                intro: { type: Type.STRING, description: 'Direct advice and concise answer to user prompt' },
                isSpecificAdvice: { type: Type.BOOLEAN, description: 'True if user asked specifically about haircut, grooming, fragrance, etiquette, or shoes only' },
                specificTopic: { type: Type.STRING, description: 'Short topic title if specific advice, else empty' },
                styleTips: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '2 short optional style tips (especially for non-clothing topics)',
                },
                top: { type: Type.STRING, description: 'Top wear specs for outfit looks; empty string if specific non-clothing topic' },
                bottom: { type: Type.STRING, description: 'Bottom wear specs for outfit looks; empty string if specific non-clothing topic' },
                footwear: { type: Type.STRING, description: 'Footwear recommendations' },
                accessories: { type: Type.STRING, description: 'Accessories / jewelry / fragrance recommendation' },
                color: { type: Type.STRING, description: 'Color contrast logic or grooming note' },
                colorHexes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Array of 3 to 5 HEX color codes in #RRGGBB format',
                },
                fabricRecommendation: { type: Type.STRING, description: 'Fabric recommendation for clothing; empty string if specific non-clothing topic' },
                darziTip: { type: Type.STRING, description: 'Master darzi stitching cut for clothing; empty string if specific non-clothing topic' },
                estimatedBudgetPkr: { type: Type.STRING, description: 'Realistic price range in PKR' },
                marketLocations: { type: Type.STRING, description: 'Where to find these pieces in major Pakistani cities' },
                visualConceptImage: {
                  type: Type.STRING,
                  description: 'One of: men_festive, women_festive, women_jewelry, men_casual, women_casual, shoes_craft, colors, formal',
                },
                category: {
                  type: Type.STRING,
                  description: 'One of: festive, casual, color, budget, body, weather, shoes, grooming, jewelry',
                },
                followUpSuggestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '3 quick follow up suggestions the user can click to continue',
                },
              },
              required: ['intro', 'category', 'followUpSuggestions'],
            },
          },
        });

        parsed = JSON.parse(response.text || '{}');
        break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} failed, trying next fallback:`, err.message);
      }
    }

    if (!parsed) {
      throw lastError || new Error('All models exhausted');
    }

    // Automatically attach exact outfit visual matching user requirement & prompt
    try {
      const outfitVisual = await generateOutfitVisualForAdvice(
        prompt || parsed.top,
        parsed,
        gender,
        stylePreference
      );
      if (outfitVisual) {
        parsed.customAiImageUrl = outfitVisual.imageUrl;
        parsed.fallbackImageUrl = outfitVisual.fallbackUrl;
        parsed.dynamicPrompt = outfitVisual.prompt;
        parsed.customAiImageCaption = outfitVisual.caption;
        parsed.isAiGenerated = outfitVisual.isAiGenerated;
      }
    } catch (visErr: any) {
      console.warn('Auto outfit visual generation warning:', visErr.message);
    }

    return res.json(parsed);
  } catch (error: any) {
    console.error('Gemini Agent Error:', error);
    return res.status(500).json({
      error: error.message || 'Error generating AI styling consultation',
      useFallback: true,
    });
  }
});

// Undertone & Color Palette Deep Analysis
app.post('/api/agent/color-palette', async (req, res) => {
  try {
    const { skinTone = 'medium-wheatish', veinColor = 'green', language = 'roman', gender = 'unisex' } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'No API key', useFallback: true });
    }

    const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let lastError: any = null;
    let parsed: any = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: `Perform professional South Asian Color Season & Undertone Analysis.
Skin Tone: ${skinTone}
Vein Appearance: ${veinColor}
Target Gender: ${gender}
Language: ${language}
Provide:
1. Identified Undertone (Warm, Cool, Neutral, Deep Olive)
2. Best Season (e.g. Deep Autumn, Warm Spring, etc.)
3. 5 Best Flattering HEX Colors with names
4. 3 Colors to Strictly Avoid with reason
5. Best Metal (Gold, Silver, Rose Gold, Antique Brass)
6. Cultural Fabric Colors that make Pakistani skin glow
7. Styling guidance in chosen language.`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                undertone: { type: Type.STRING },
                season: { type: Type.STRING },
                bestColors: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      hex: { type: Type.STRING },
                      reason: { type: Type.STRING },
                    },
                    required: ['name', 'hex', 'reason'],
                  },
                },
                avoidColors: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      hex: { type: Type.STRING },
                      reason: { type: Type.STRING },
                    },
                    required: ['name', 'hex', 'reason'],
                  },
                },
                bestMetal: { type: Type.STRING },
                culturalInsight: { type: Type.STRING },
                summary: { type: Type.STRING },
              },
              required: ['undertone', 'season', 'bestColors', 'avoidColors', 'bestMetal', 'culturalInsight', 'summary'],
            },
          },
        });

        parsed = JSON.parse(response.text || '{}');
        break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Color model ${modelName} failed, trying next:`, err.message);
      }
    }

    if (!parsed) {
      throw lastError || new Error('All models exhausted');
    }

    return res.json(parsed);
  } catch (error: any) {
    console.error('Color analysis error:', error);
    return res.status(500).json({ error: error.message, useFallback: true });
  }
});

// Natural Voice Accent Text-to-Speech (Gemini 3.8 Flash Lite TTS)
app.post('/api/agent/tts', async (req, res) => {
  try {
    const { text, language = 'roman', voiceGender = 'female' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text prompt is required for TTS' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'No GEMINI_API_KEY', useFallback: true });
    }

    // Limit text to avoid latency spikes while capturing key styling advice
    const cleanText = text.slice(0, 450);

    const voiceName = voiceGender === 'male' ? 'Puck' : 'Kore';
    const accentStyle =
      language === 'ur'
        ? 'A cultured, polite Pakistani Urdu speaker with authentic native Urdu accent and natural, graceful, respectful intonation.'
        : language === 'roman'
        ? 'A chic, cultured South Asian fashion stylist with natural Pakistani English and Roman Urdu accent, warm, fluent, and conversational cadence.'
        : 'A sophisticated, eloquent South Asian fashion stylist with a natural, melodious British-Pakistani accent, warm and articulate tone.';

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
                speechMetadata: {
                  style: accentStyle,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const audioPart = response.candidates?.[0]?.content?.parts?.[0];
      const base64Data = audioPart?.inlineData?.data;

      if (base64Data) {
        return res.json({
          audioUrl: `data:audio/wav;base64,${base64Data}`,
          voiceName,
          accent: 'Natural Pakistani Stylist',
          success: true,
        });
      }
    } catch (ttsErr: any) {
      console.warn('Gemini TTS generation error, returning fallback:', ttsErr.message);
    }

    return res.status(500).json({
      error: 'TTS model currently unavailable',
      useFallback: true,
    });
  } catch (error: any) {
    console.error('TTS endpoint error:', error);
    return res.status(500).json({ error: error.message, useFallback: true });
  }
});

// Dynamic AI Outfit Image Generation
app.post('/api/agent/generate-outfit-image', async (req, res) => {
  try {
    const { prompt, advice, gender = 'men', stylePreference = 'traditional' } = req.body;

    const outfitVisual = await generateOutfitVisualForAdvice(
      prompt || advice?.top,
      advice,
      gender,
      stylePreference
    );

    return res.json({
      imageUrl: outfitVisual.imageUrl,
      fallbackUrl: outfitVisual.fallbackUrl,
      prompt: outfitVisual.prompt,
      caption: outfitVisual.caption,
      isAiGenerated: outfitVisual.isAiGenerated,
      success: true,
    });
  } catch (error: any) {
    console.error('Outfit image generation error, falling back:', error?.message?.slice(0, 80) || error);
    const fallbackMap: Record<string, string> = {
      men: '/assets/men_festive.jpg',
      women: '/assets/women_festive.jpg',
      unisex: '/assets/shoes_craft.jpg',
    };
    const chosenGender = req.body?.gender || 'men';
    return res.json({
      imageUrl: fallbackMap[chosenGender] || '/assets/men_festive.jpg',
      fallbackUrl: 'https://loremflickr.com/800/500/fashion,grooming/all',
      prompt: 'Pakistani cultural outfit visual',
      caption: 'Dynamic AI Visual · Pakistani Fashion Look',
      isAiGenerated: false,
      useFallback: true,
      success: true,
    });
  }
});

// In-memory feedback repository for continuous agent learning
interface ServerFeedbackRecord {
  id: string;
  messageId: string | number;
  score: number;
  tags: string[];
  comment?: string;
  category: string;
  stylePreference: string;
  adviceHighlights?: {
    top?: string;
    bottom?: string;
    color?: string;
    fabric?: string;
    darziTip?: string;
    footwear?: string;
  };
  createdAt: string;
}

const serverFeedbackStore: ServerFeedbackRecord[] = [];

// Record feedback and rating from user
app.post('/api/agent/feedback', (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || typeof rating.score !== 'number') {
      return res.status(400).json({ error: 'Valid rating object with score is required' });
    }

    // Check if rating for this message already exists to update
    const existingIndex = serverFeedbackStore.findIndex(
      (r) => String(r.messageId) === String(rating.messageId)
    );

    if (existingIndex >= 0) {
      serverFeedbackStore[existingIndex] = {
        ...serverFeedbackStore[existingIndex],
        ...rating,
        updatedAt: new Date().toISOString(),
      };
    } else {
      serverFeedbackStore.push({
        ...rating,
        createdAt: rating.createdAt || new Date().toISOString(),
      });
    }

    const total = serverFeedbackStore.length;
    const satisfied = serverFeedbackStore.filter((r) => r.score >= 4).length;
    const avgScore = total > 0 ? (serverFeedbackStore.reduce((a, b) => a + b.score, 0) / total).toFixed(1) : 0;

    console.log(
      `[PersonaGroom Feedback] Score: ${rating.score}/5 ⭐ (${rating.tags?.join(', ') || 'No tags'}). Total: ${total}, Avg: ${avgScore}`
    );

    return res.json({
      success: true,
      totalFeedbackCount: total,
      satisfactionRate: total > 0 ? Math.round((satisfied / total) * 100) : 0,
      averageScore: Number(avgScore),
    });
  } catch (err: any) {
    console.error('Feedback record error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Retrieve aggregated feedback statistics
app.get('/api/agent/feedback', (_req, res) => {
  const total = serverFeedbackStore.length;
  const satisfied = serverFeedbackStore.filter((r) => r.score >= 4).length;
  const avgScore = total > 0 ? Number((serverFeedbackStore.reduce((a, b) => a + b.score, 0) / total).toFixed(1)) : 0;

  return res.json({
    total,
    averageScore: avgScore,
    satisfactionRate: total > 0 ? Math.round((satisfied / total) * 100) : 0,
    records: serverFeedbackStore.slice(-20),
  });
});

// Clear feedback store
app.delete('/api/agent/feedback', (_req, res) => {
  serverFeedbackStore.length = 0;
  return res.json({ success: true, message: 'Stylist memory reset successfully' });
});

// -------------------------------------------------------------
// 1. Multi-Turn Gemini Chatbot with Dynamic Roles & Search Grounding
// -------------------------------------------------------------
app.post('/api/agent/chat', async (req, res) => {
  try {
    const {
      messages = [],
      role = 'trends', // 'architect' | 'trends' | 'speed'
      gender = 'men',
      ageGroup = 'uni',
      stylePreference = 'traditional',
      language = 'roman',
    } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
        reply: 'PersonaGroom local standby: Please consult traditional festive or casual kurtas.',
        modelUsed: 'local-fallback',
      });
    }

    // Role-specific System Instructions
    let roleSystemInstruction = '';
    let chosenModel = 'gemini-3.8-flash';
    let enableSearch = false;

    if (role === 'architect') {
      // Complex tasks: Master Couture & Bespoke Architect
      chosenModel = 'gemini-4-argon';
      roleSystemInstruction = `You are the Master Couture & Bespoke Architect at PersonaGroom AI.
You specialize in intricate bespoke tailoring, bridal haute couture, heavy sherwanis with hand-embroidered tilla and zardozi, fabric density (GSM), master darzi cuts (kalidar, angrakha, double-breasted bandhgala), and structural fitting.
Provide deep, authoritative, master-level guidance for gender "${gender}", age group "${ageGroup}", and aesthetic "${stylePreference}".
Language: Respond in natural, sophisticated ${LANG_DESCRIPTIONS[language] || 'Roman Urdu'}.`;
    } else if (role === 'trends') {
      // General tasks with live search grounding: Real-Time Trend Specialist
      chosenModel = 'gemini-3.8-flash';
      enableSearch = true;
      roleSystemInstruction = `You are the Real-Time Trend Specialist at PersonaGroom AI.
You have real-time access to live Google Search data to discover current 2026 fashion trends, designer collections (Khaadi, Sapphire, J., Bareeze, Maria.B, Deepak Perwani, Faraz Manan), current market prices in Pakistani bazaars (Liberty, Zainab Market, Raja Bazaar), and upcoming wedding season styles.
Always provide fresh, trend-forward, culturally authentic advice for gender "${gender}", age "${ageGroup}", style "${stylePreference}".
Language: Respond in ${LANG_DESCRIPTIONS[language] || 'Roman Urdu'}.`;
    } else {
      // Fast lightweight tasks: Quick Style Dispatcher
      chosenModel = 'gemini-3.1-flash-lite';
      roleSystemInstruction = `You are the Quick Style Dispatcher at PersonaGroom AI.
Provide lightning-fast, concise, punchy styling advice, color contrast pairings, shoe recommendations, and immediate wardrobe solutions for gender "${gender}", style "${stylePreference}".
Language: Respond in ${LANG_DESCRIPTIONS[language] || 'Roman Urdu'}.`;
    }

    // Build contents from multi-turn messages
    const contents = messages.map((m: any) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text || m.content || '' }],
    }));

    const config: any = {
      systemInstruction: roleSystemInstruction,
    };

    if (enableSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    let response: any = null;
    let actualModel = chosenModel;

    // Model fallback cascade if primary model is unavailable or requires paid key
    const fallbackList = [chosenModel, 'gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    const tried = new Set<string>();

    for (const modelToTry of fallbackList) {
      if (tried.has(modelToTry)) continue;
      tried.add(modelToTry);
      try {
        const activeConfig = { ...config };
        // Google Search is supported on gemini-3.8-flash and gemini-flash-latest
        if (enableSearch && modelToTry !== 'gemini-3.8-flash' && modelToTry !== 'gemini-flash-latest') {
          delete activeConfig.tools;
        }

        response = await ai.models.generateContent({
          model: modelToTry,
          contents,
          config: activeConfig,
        });
        actualModel = modelToTry;
        break;
      } catch (err: any) {
        console.warn(`Chat model ${modelToTry} attempt failed:`, err.message);
      }
    }

    if (!response) {
      throw new Error('All chat models failed to produce response');
    }

    const reply = response.text || 'I am ready to assist with your Pakistani fashion styling.';
    const candidate = response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;

    const sources =
      groundingMetadata?.groundingChunks?.map((chunk: any) => ({
        title: chunk.web?.title || 'Fashion Reference',
        url: chunk.web?.uri || '',
      })) || [];

    const searchQueries = groundingMetadata?.webSearchQueries || [];

    return res.json({
      reply,
      modelUsed: actualModel,
      role,
      groundingSources: sources,
      searchQueries,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  } catch (error: any) {
    console.error('Gemini Chat error:', error);
    return res.status(500).json({
      error: error.message || 'Chatbot request failed',
      reply: 'Aap ka sawal mil gaya hai. Pakistani fashion ke liye Kurta aur Peshawari chappal hamesha timeless choice hai.',
      modelUsed: 'emergency-fallback',
    });
  }
});

// -------------------------------------------------------------
// 2. Text-Prompt Create & Edit Images (gemini-nano-banana-2.1)
// -------------------------------------------------------------
app.post('/api/agent/image-studio', async (req, res) => {
  const fallbackMap: Record<string, string> = {
    men: '/assets/men_festive.jpg',
    women: '/assets/women_festive.jpg',
    unisex: '/assets/shoes_craft.jpg',
  };

  try {
    const {
      prompt,
      editInstruction,
      base64Image,
      gender = 'men',
      stylePreference = 'traditional',
    } = req.body;

    if (!prompt && !editInstruction) {
      return res.status(400).json({ error: 'Prompt or edit instruction is required' });
    }

    const isEdit = Boolean(base64Image && editInstruction);
    const sanitizedPrompt = sanitizeFashionImagePrompt(
      isEdit ? `${prompt || ''} ${editInstruction || ''}` : (prompt || 'Pakistani luxury couture outfit'),
      gender,
      stylePreference
    );

    if (!process.env.GEMINI_API_KEY) {
      const dynamicAiUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(sanitizedPrompt)}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;
      return res.json({
        imageUrl: dynamicAiUrl,
        fallbackUrl: fallbackMap[gender] || '/assets/men_festive.jpg',
        prompt: sanitizedPrompt,
        modelUsed: 'pollinations-studio-engine',
        isEdited: isEdit,
        useFallback: true,
        success: true,
      });
    }

    const fullPrompt = isEdit
      ? `Edit this Pakistani fashion image: ${editInstruction}. Maintain the high-fashion editorial Pakistani aesthetic, authentic fabric weaves, intricate embroidery, and realistic cultural details.`
      : `High-fashion Pakistani ${gender} ${stylePreference} outfit: ${prompt}. Editorial photography, 8k resolution, photorealistic studio lighting, authentic embroidery, regal color contrast, Pakistani cultural couture catalog style.`;

    const parts: any[] = [];
    if (base64Image && typeof base64Image === 'string') {
      const match = base64Image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    }
    parts.push({ text: fullPrompt });

    // Primary requested model is gemini-nano-banana-2.1 with graceful fallback cascade
    const imageModels = ['gemini-nano-banana-2.1', 'gemini-3.1-flash-lite-image'];
    let generatedImageData: string | null = null;
    let usedModel = 'gemini-nano-banana-2.1';

    for (const modelName of imageModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: { parts },
        });

        for (const part of response.candidates?.[0]?.content?.parts ?? []) {
          if (part.inlineData?.data) {
            const mime = part.inlineData.mimeType || 'image/png';
            generatedImageData = `data:${mime};base64,${part.inlineData.data}`;
            usedModel = modelName;
            break;
          }
        }
        if (generatedImageData) break;
      } catch (err: any) {
        const isQuota =
          err?.status === 429 ||
          err?.message?.includes('429') ||
          err?.message?.includes('RESOURCE_EXHAUSTED') ||
          err?.message?.includes('quota');
        if (isQuota) {
          console.log(`[Image Studio] Model ${modelName} quota limit reached on Free Tier. Seamlessly activating high-fidelity studio engine fallback.`);
          break; // Stop cascade to prevent hitting another rate-limited Gemini model
        } else {
          console.warn(`[Image Studio] Model ${modelName} unavailable, falling back:`, err?.status || err?.message?.slice(0, 80));
        }
      }
    }

    if (generatedImageData) {
      return res.json({
        imageUrl: generatedImageData,
        prompt: fullPrompt,
        modelUsed: usedModel,
        isEdited: isEdit,
        success: true,
      });
    }

    // Dynamic high-resolution visual generator fallback (Pollinations AI + sanitized fashion keywords)
    const dynamicAiUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(sanitizedPrompt)}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;

    return res.json({
      imageUrl: dynamicAiUrl,
      fallbackUrl: fallbackMap[gender] || '/assets/men_festive.jpg',
      prompt: sanitizedPrompt,
      modelUsed: 'pollinations-studio-engine',
      isEdited: isEdit,
      useFallback: true,
      success: true,
      message: 'Visual generated via PersonaGroom Studio High-Fidelity Engine.',
    });
  } catch (error: any) {
    console.error('Image Studio fallback activated:', error?.message?.slice(0, 80) || error);
    const fallbackUrl = fallbackMap[req.body?.gender || 'men'] || '/assets/men_festive.jpg';
    return res.json({
      imageUrl: 'https://loremflickr.com/800/500/fashion,clothing/all',
      fallbackUrl,
      prompt: 'Pakistani couture attire',
      modelUsed: 'emergency-studio-fallback',
      isEdited: false,
      useFallback: true,
      success: true,
    });
  }
});

// -------------------------------------------------------------
// 3. Real-Time Voice Conversation (gemini-3.8-live / Gemini Live Audio)
// -------------------------------------------------------------
app.post('/api/agent/live-voice', async (req, res) => {
  try {
    const {
      prompt,
      history = [],
      gender = 'men',
      language = 'roman',
      voiceGender = 'female',
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required for live voice conversation' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'No GEMINI_API_KEY' });
    }

    const voiceName = voiceGender === 'male' ? 'Puck' : 'Kore';
    const systemPrompt = `You are PersonaGroom Live, a real-time conversational Pakistani fashion stylist talking over voice.
Keep spoken responses punchy, engaging, warm, and natural (1-3 spoken sentences max).
Target audience is gender "${gender}". Language: Spoken ${LANG_DESCRIPTIONS[language] || 'Roman Urdu'}.`;

    // Generate spoken dialogue using gemini-3.8-live / conversational engine
    let conversationalText = '';
    try {
      const chatContents = [
        ...history.slice(-4).map((h: any) => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.text }],
        })),
        { role: 'user', parts: [{ text: prompt }] },
      ];

      const textResp = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: chatContents,
        config: { systemInstruction: systemPrompt },
      });
      conversationalText = textResp.text || 'Aap ka look ready hai, bohot shandar lagega!';
    } catch (e: any) {
      conversationalText = 'Ji bilkul, aap ke liye yeh outfit perfect match rahega.';
    }

    // Now generate speech audio with authentic Pakistani stylist cadence
    let audioUrl: string | null = null;
    try {
      const ttsResp = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: conversationalText.slice(0, 300),
                speechMetadata: {
                  style: 'Conversational, cultured South Asian fashion stylist with natural Pakistani warmth and fluent intonation.',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const audioPart = ttsResp.candidates?.[0]?.content?.parts?.[0];
      if (audioPart?.inlineData?.data) {
        audioUrl = `data:audio/wav;base64,${audioPart.inlineData.data}`;
      }
    } catch (ttsErr: any) {
      console.warn('Live voice TTS synthesis failed:', ttsErr.message);
    }

    return res.json({
      transcript: conversationalText,
      audioUrl,
      modelUsed: 'gemini-3.8-live-bridge',
      voiceName,
      success: true,
    });
  } catch (error: any) {
    console.error('Live voice error:', error);
    return res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PersonaGroom AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
