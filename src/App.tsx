import React, { useState, useEffect, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Theme,
  Language,
  Gender,
  AgeGroup,
  CategoryId,
  ChatMessage,
  StylingAdvice,
  SavedLook,
  StylePreference,
  AdviceRating,
  UserLearningProfile,
} from './types';
import {
  CATEGORIES,
  AGE_GROUPS,
  STYLE_PREFERENCES,
  UI_TRANSLATIONS,
  QUICK_PROMPTS,
  detectCategory,
  getFallbackAdvice,
  resolveLookImage,
  calculateLearningProfile,
} from './data/fashionKnowledge';
import { LookbookModal } from './components/LookbookModal';
import { DarziSpecModal } from './components/DarziSpecModal';
import { ColorStudioModal } from './components/ColorStudioModal';
import { BudgetPlannerModal } from './components/BudgetPlannerModal';
import { AdviceRatingCard } from './components/AdviceRatingCard';
import { StylistMemoryModal } from './components/StylistMemoryModal';
import { ImageLightboxModal } from './components/ImageLightboxModal';
import { ThreeFashionRunwayModal } from './components/ThreeFashionRunwayModal';
import { GeminiChatbotModal } from './components/GeminiChatbotModal';
import { ImageStudioModal } from './components/ImageStudioModal';
import { LiveVoiceModal } from './components/LiveVoiceModal';
import { AuthModal } from './components/AuthModal';
import { useAuth } from './context/AuthContext';
import {
  saveLookToFirestore,
  deleteLookFromFirestore,
  fetchSavedLooksFromFirestore,
  saveRatingToFirestore,
  fetchRatingsFromFirestore,
  saveUserProfileToFirestore,
  fetchUserProfileFromFirestore,
  saveChatSessionToFirestore,
  fetchChatSessionFromFirestore,
} from './lib/firestoreData';
import { sanitizeInput } from './lib/security';
import {
  Mic,
  MicOff,
  Paperclip,
  Send,
  Volume2,
  X,
  Bookmark,
  BookmarkCheck,
  Scissors,
  Palette,
  DollarSign,
  Sparkles,
  BookOpen,
  Share2,
  Check,
  Bot,
  RefreshCw,
  Eye,
  Camera,
  Brain,
  SlidersHorizontal,
  Maximize2,
  Menu,
  Box,
  Radio,
  Wand2,
  Database,
  Search,
} from 'lucide-react';

interface FailSafeImageCardProps {
  primarySrc: string;
  fallbackSrc: string;
  localFallbackSrc: string;
  caption: string;
  isAiGen: boolean;
  isGenerating: boolean;
  onOpenLightbox: () => void;
  onRegenerate: () => void;
}

const FailSafeImageCard: React.FC<FailSafeImageCardProps> = ({
  primarySrc,
  fallbackSrc,
  localFallbackSrc,
  caption,
  isAiGen,
  isGenerating,
  onOpenLightbox,
  onRegenerate,
}) => {
  const cleanCat = encodeURIComponent(
    (caption.toLowerCase().includes('lehenga') || caption.toLowerCase().includes('women') ? 'women,lehenga' : 'men,kurta')
  );
  const dynamicFlickrFallback = fallbackSrc && fallbackSrc.startsWith('http')
    ? fallbackSrc
    : `https://loremflickr.com/800/500/pakistani,fashion,${cleanCat}`;

  const [currentSrc, setCurrentSrc] = useState(primarySrc);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    setCurrentSrc(primarySrc);
    setIsLoaded(false);
    setHasTimedOut(false);
  }, [primarySrc]);

  // 4-second Fail-Safe timeout handler: switches immediately to dynamic pakistani fashion search fallback
  useEffect(() => {
    if (isLoaded) return;
    const timer = setTimeout(() => {
      if (
        !isLoaded &&
        currentSrc !== dynamicFlickrFallback &&
        currentSrc !== localFallbackSrc
      ) {
        console.warn('Image loading timed out (4s); switching to dynamic Pakistani fashion search fallback');
        setHasTimedOut(true);
        setCurrentSrc(dynamicFlickrFallback);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [isLoaded, currentSrc, dynamicFlickrFallback, localFallbackSrc]);

  const handleError = () => {
    // Cascade gracefully: Primary (Pollinations) -> Dynamic Fallback (LoremFlickr Pakistani Fashion) -> Local Curated Asset
    if (currentSrc !== dynamicFlickrFallback && currentSrc !== localFallbackSrc) {
      setCurrentSrc(dynamicFlickrFallback);
    } else if (currentSrc !== localFallbackSrc) {
      setCurrentSrc(localFallbackSrc);
    }
    setIsLoaded(true);
  };

  return (
    <div className="space-y-1.5">
      <figure
        onClick={onOpenLightbox}
        className="group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-secondary/20 shadow-xs transition duration-300 hover:border-primary/60 min-h-[16rem]"
      >
        {!isLoaded && !isGenerating && (
          <div className="absolute inset-0 bg-secondary/60 animate-pulse flex flex-col items-center justify-center gap-2 z-10 backdrop-blur-xs">
            <RefreshCw size={24} className="animate-spin text-primary" />
            <span className="text-[11px] font-medium text-muted-foreground tracking-wide">
              {hasTimedOut ? 'Loading Fast Dynamic Search Fallback...' : 'Loading Dynamic AI Outfit...'}
            </span>
          </div>
        )}

        <img
          src={currentSrc}
          alt={caption}
          loading="lazy"
          onLoad={(e) => {
            const img = e.currentTarget;
            // Refusal detection: if width is 0 or tiny placeholder
            if (img.naturalWidth === 0 || img.naturalWidth < 10) {
              handleError();
            } else {
              setIsLoaded(true);
            }
          }}
          onError={handleError}
          className={`h-64 sm:h-72 w-full object-cover transition duration-500 group-hover:scale-103 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center gap-2 z-20">
          <span className="rounded-full bg-black/75 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md flex items-center gap-1.5 shadow-lg">
            <Maximize2 size={13} /> Click for Full View & Zoom
          </span>
        </div>

        {isAiGen && (
          <div className="absolute top-2.5 left-2.5 rounded-full bg-primary/95 text-primary-foreground px-2.5 py-1 text-[10px] font-bold tracking-wide backdrop-blur-md shadow-md flex items-center gap-1.5 border border-white/20 z-20">
            <Sparkles size={11} className="text-amber-300" />
            <span>✨ Attached Look: Exact Custom Visual Matching Your Request</span>
          </div>
        )}

        {isGenerating && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center gap-2.5 p-4 text-center z-30">
            <RefreshCw size={26} className="animate-spin text-primary" />
            <span className="text-xs font-bold text-white tracking-wide">
              Architecting Exact Bespoke Outfit Visual...
            </span>
            <span className="text-[10px] text-slate-300 max-w-xs leading-relaxed">
              Generating high-fidelity custom visual matching your requested colors, silhouette & cuts
            </span>
          </div>
        )}

        <figcaption className="bg-secondary/90 px-3.5 py-2 text-[11px] uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span className="font-semibold text-foreground flex items-center gap-1 truncate max-w-[70%]">
            {caption}
          </span>
          <span className="text-[10px] text-primary flex items-center gap-1 shrink-0 font-medium">
            <Maximize2 size={11} /> Full Screen
          </span>
        </figcaption>
      </figure>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-xs">
        <button
          type="button"
          onClick={onRegenerate}
          disabled={isGenerating}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline transition disabled:opacity-50 cursor-pointer"
        >
          <Sparkles size={13} className={isGenerating ? 'animate-spin' : ''} />
          <span>
            {isGenerating
              ? 'Architecting AI outfit visual...'
              : isAiGen
              ? 'Regenerate Bespoke AI Look'
              : 'Generate Bespoke AI Look Visual'}
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenLightbox}
          className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
        >
          <Maximize2 size={12} />
          <span>Open in Fullscreen</span>
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('persona_theme') || localStorage.getItem('personagroom_theme');
      return (saved as Theme) || 'dark';
    } catch {
      return 'dark';
    }
  });
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('persona_lang');
      return (saved as Language) || 'roman';
    } catch {
      return 'roman';
    }
  });
  const [gender, setGender] = useState<Gender>(() => {
    try {
      const saved = localStorage.getItem('persona_gender');
      return (saved as Gender) || 'men';
    } catch {
      return 'men';
    }
  });
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(() => {
    try {
      const saved = localStorage.getItem('persona_age');
      return (saved as AgeGroup) || 'uni';
    } catch {
      return 'uni';
    }
  });
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('persona_api_key') || '';
    } catch {
      return '';
    }
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [stylePreference, setStylePreference] = useState<StylePreference>(() => {
    try {
      const saved = localStorage.getItem('personagroom_style_preference');
      return (saved as StylePreference) || 'traditional';
    } catch {
      return 'traditional';
    }
  });

  // Save settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('persona_theme', theme);
      localStorage.setItem('personagroom_theme', theme);
    } catch (e) {
      console.error(e);
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('persona_lang', language);
    } catch (e) {
      console.error(e);
    }
  }, [language]);

  useEffect(() => {
    try {
      localStorage.setItem('persona_gender', gender);
    } catch (e) {
      console.error(e);
    }
  }, [gender]);

  useEffect(() => {
    try {
      localStorage.setItem('persona_age', ageGroup);
    } catch (e) {
      console.error(e);
    }
  }, [ageGroup]);

  useEffect(() => {
    try {
      localStorage.setItem('persona_api_key', customApiKey);
    } catch (e) {
      console.error(e);
    }
  }, [customApiKey]);

  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isConsulting, setIsConsulting] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [activeSpeechIndex, setActiveSpeechIndex] = useState<number | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('persona_chat_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save chat history to localStorage
  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem('persona_chat_history', JSON.stringify(messages.slice(-20)));
      }
    } catch (e) {
      console.error(e);
    }
  }, [messages]);

  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem('persona_chat_history');
    setToastMessage('Chat history cleared.');
    setTimeout(() => setToastMessage(null), 2500);
  };
  const [savedLooks, setSavedLooks] = useState<SavedLook[]>(() => {
    try {
      const stored = localStorage.getItem('personagroom_saved_looks');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // User ratings & continuous learning feedback history
  const [ratings, setRatings] = useState<AdviceRating[]>(() => {
    try {
      const stored = localStorage.getItem('personagroom_ratings');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isStylistMemoryOpen, setIsStylistMemoryOpen] = useState(false);

  // Compute live agent learning profile based on stored user ratings
  const learningProfile = useMemo<UserLearningProfile>(() => {
    return calculateLearningProfile(ratings);
  }, [ratings]);

  // Modals state
  const [isLookbookOpen, setIsLookbookOpen] = useState(false);
  const [isDarziOpen, setIsDarziOpen] = useState(false);
  const [activeDarziLook, setActiveDarziLook] = useState<
    { title: string; advice: StylingAdvice; gender?: string } | undefined
  >(undefined);
  const [isColorStudioOpen, setIsColorStudioOpen] = useState(false);
  const [isBudgetPlannerOpen, setIsBudgetPlannerOpen] = useState(false);

  // New Features Modal States
  const [is3dRunwayOpen, setIs3dRunwayOpen] = useState(false);
  const [isGeminiChatbotOpen, setIsGeminiChatbotOpen] = useState(false);
  const [isImageStudioOpen, setIsImageStudioOpen] = useState(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const {
    user,
    guestUser,
    currentUser,
    isAuthenticated,
    loading: authLoading,
    userProfile,
    syncProfilePreferences,
  } = useAuth();
  const activeUserId = user?.uid || guestUser?.uid || null;

  // Real-time restore of state when user logs in or page refreshes (F5)
  useEffect(() => {
    if (!activeUserId) return;

    // 1. Restore User Profile
    fetchUserProfileFromFirestore(activeUserId)
      .then((prof) => {
        if (prof) {
          if (prof.theme && prof.theme !== theme) setTheme(prof.theme);
          if (prof.preferredGender && prof.preferredGender !== gender) setGender(prof.preferredGender);
          if (prof.ageGroup && prof.ageGroup !== ageGroup) setAgeGroup(prof.ageGroup);
          if (prof.language && prof.language !== language) setLanguage(prof.language);
          if (prof.stylePreference && prof.stylePreference !== stylePreference)
            setStylePreference(prof.stylePreference);
        }
      })
      .catch((e) => console.warn('Could not sync user profile:', e));

    // 2. Restore Saved Looks & Wardrobe
    fetchSavedLooksFromFirestore(activeUserId)
      .then((cloudLooks) => {
        if (cloudLooks && cloudLooks.length > 0) {
          setSavedLooks((prev) => {
            const map = new Map(prev.map((l) => [l.id, l]));
            cloudLooks.forEach((l) => map.set(l.id, l));
            return Array.from(map.values());
          });
        }
      })
      .catch((e) => console.warn('Could not sync looks from database:', e));

    // 3. Restore Ratings
    fetchRatingsFromFirestore(activeUserId)
      .then((cloudRatings) => {
        if (cloudRatings && cloudRatings.length > 0) {
          setRatings((prev) => {
            const map = new Map(prev.map((r) => [r.id, r]));
            cloudRatings.forEach((r) => map.set(r.id, r));
            return Array.from(map.values());
          });
        }
      })
      .catch((e) => console.warn('Could not sync ratings from database:', e));

    // 4. Restore Chat Messages Session on F5
    fetchChatSessionFromFirestore(activeUserId)
      .then((cloudMsgs) => {
        if (cloudMsgs && cloudMsgs.length > 1) {
          setMessages(cloudMsgs);
        }
      })
      .catch((e) => console.warn('Could not sync chat session:', e));
  }, [activeUserId]);

  // Real-time Auto-Sync chat session on every new message generated
  useEffect(() => {
    if (!activeUserId || messages.length <= 1) return;
    saveChatSessionToFirestore(activeUserId, messages);
  }, [messages, activeUserId]);

  // Lightbox Modal state
  const [activeLightboxImage, setActiveLightboxImage] = useState<{
    src: string;
    caption: string;
    advice?: StylingAdvice;
    gender?: Gender;
    msgId?: string | number;
  } | null>(null);

  // AI Image generation state
  const [generatingImageMsgId, setGeneratingImageMsgId] = useState<string | number | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  // Natural Voice TTS state
  const [playingAudioMsgId, setPlayingAudioMsgId] = useState<string | number | null>(null);
  const [isGeneratingTts, setIsGeneratingTts] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Mobile layout state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [agentOnline, setAgentOnline] = useState<boolean>(true);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  const isUrdu = language === 'ur';
  const t = UI_TRANSLATIONS[language];

  // Save looks to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('personagroom_saved_looks', JSON.stringify(savedLooks));
    } catch (e) {
      console.error(e);
    }
  }, [savedLooks]);

  // Save ratings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('personagroom_ratings', JSON.stringify(ratings));
    } catch (e) {
      console.error(e);
    }
  }, [ratings]);

  // Handle saving rating from advice card
  const handleSaveRating = async (rating: AdviceRating) => {
    setRatings((prev) => {
      const idx = prev.findIndex((r) => String(r.messageId) === String(rating.messageId));
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = rating;
        return next;
      }
      return [...prev, rating];
    });

    // Confetti celebration if 5-star rating!
    if (rating.score === 5) {
      try {
        confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } });
      } catch {}
    }

    // Sync with backend feedback endpoint for agent learning
    try {
      await fetch('/api/agent/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });
    } catch (err) {
      console.warn('Could not sync feedback to server:', err);
    }

    // Persist to Firestore cloud database or LocalStorage vault
    if (activeUserId) {
      saveRatingToFirestore(activeUserId, rating);
    }
  };

  const handleResetStylistMemory = async () => {
    setRatings([]);
    localStorage.removeItem('personagroom_ratings');
    try {
      await fetch('/api/agent/feedback', { method: 'DELETE' });
    } catch {}
  };

  // Save stylePreference to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('personagroom_style_preference', stylePreference);
    } catch (e) {
      console.error(e);
    }
  }, [stylePreference]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isConsulting]);

  // Check backend agent health on mount
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => {
        setAgentOnline(Boolean(data?.hasApiKey));
      })
      .catch(() => setAgentOnline(false));
  }, []);

  const handleSend = async (userPromptText?: string, forcedCategory?: CategoryId) => {
    const rawPrompt = sanitizeInput((userPromptText ?? inputPrompt).trim());
    if (!rawPrompt && !attachedImage) return;
    if (isConsulting) return;

    const detectedCat = forcedCategory || detectCategory(rawPrompt);
    const userImg = attachedImage;

    const newUserMsg: ChatMessage = {
      id: Date.now(),
      role: 'user',
      text: rawPrompt || (userImg ? 'Analyze my photo / unstitched suit fabric' : ''),
      image: userImg || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputPrompt('');
    setAttachedImage(null);
    setIsConsulting(true);

    try {
      // Build conversation history for multi-turn context
      const conversationHistory = messages.slice(-5).map((m) => ({
        role: m.role,
        text:
          m.text ||
          (m.advice
            ? `${m.advice.intro} Top: ${m.advice.top}. Bottom: ${m.advice.bottom}. Footwear: ${m.advice.footwear}.`
            : ''),
      }));

      // Call backend AI agent endpoint
      const response = await fetch('/api/agent/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: rawPrompt,
          gender,
          ageGroup,
          language,
          category: detectedCat,
          stylePreference,
          image: userImg || undefined,
          history: conversationHistory,
          learningProfile,
          apiKey: customApiKey || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Agent response error: ${response.status}`);
      }

      const adviceData: StylingAdvice = await response.json();
      adviceData.category = adviceData.category || detectedCat;

      const botMsgId = Date.now() + 1;
      setMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          role: 'bot',
          advice: adviceData,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      // If backend did not already attach customAiImageUrl, automatically generate and attach it
      if (!adviceData.customAiImageUrl) {
        handleGenerateAiLook(adviceData, botMsgId, rawPrompt);
      }
    } catch {
      // Offline / fallback knowledge base
      await new Promise((resolve) => setTimeout(resolve, 500));
      const fallbackAdvice = getFallbackAdvice(
        rawPrompt,
        gender,
        ageGroup,
        language,
        detectedCat,
        stylePreference,
        learningProfile
      );
      const fallbackMsgId = Date.now() + 1;
      setMessages((prev) => [
        ...prev,
        {
          id: fallbackMsgId,
          role: 'bot',
          advice: fallbackAdvice,
          error:
            language === 'ur'
              ? 'مقامی نالج بیس سے اسٹائلنگ فراہم کی گئی ہے۔'
              : language === 'roman'
              ? 'Built-in Pakistani fashion intelligence active'
              : 'Grounded via built-in Pakistani fashion intelligence',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      // Automatically generate bespoke outfit visual matching user requirement
      if (!fallbackAdvice.customAiImageUrl) {
        handleGenerateAiLook(fallbackAdvice, fallbackMsgId, rawPrompt);
      }
    } finally {
      setIsConsulting(false);
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setToastMessage('Voice typing unsupported on this browser');
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }

    if (isListening) {
      speechRecognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === 'en' ? 'en-US' : 'ur-PK';
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    speechRecognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  // Natural Voice Text-To-Speech with AI Voice & Regional Fallback
  const handlePlayNaturalVoice = async (advice: StylingAdvice, msgId: string | number) => {
    // If currently playing this specific message, toggle pause/stop
    if (playingAudioMsgId === msgId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setPlayingAudioMsgId(null);
      setIsGeneratingTts(false);
      return;
    }

    // Stop any existing playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setPlayingAudioMsgId(msgId);
    setIsGeneratingTts(true);

    const isSpecific = advice.isSpecificAdvice || (!advice.top && !advice.bottom);
    let spokenText = advice.intro;
    if (isSpecific) {
      if (advice.footwear && advice.footwear !== 'N/A') spokenText += `. ${t.footwear}: ${advice.footwear}`;
      if (advice.accessories && advice.accessories !== 'N/A') spokenText += `. ${advice.accessories}`;
      if (advice.color && advice.color !== 'N/A') spokenText += `. ${t.colorLogic}: ${advice.color}`;
      if (advice.styleTips && advice.styleTips.length > 0) {
        spokenText += `. Style tips: ${advice.styleTips.join('. ')}`;
      }
    } else {
      spokenText = `${advice.intro}. ${advice.top ? t.topWear + ': ' + advice.top + '.' : ''} ${advice.bottom ? t.bottomWear + ': ' + advice.bottom + '.' : ''} ${advice.footwear ? t.footwear + ': ' + advice.footwear + '.' : ''} ${advice.accessories || ''}. ${advice.color ? t.colorLogic + ': ' + advice.color + '.' : ''} ${advice.fabricRecommendation ? t.fabricLabel + ': ' + advice.fabricRecommendation : ''}`;
    }

    try {
      // Call natural AI voice TTS endpoint
      const res = await fetch('/api/agent/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: spokenText,
          language,
          voiceGender: gender === 'women' ? 'female' : 'male',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioUrl) {
          const audio = new Audio(data.audioUrl);
          audioRef.current = audio;
          setIsGeneratingTts(false);

          audio.onended = () => {
            setPlayingAudioMsgId(null);
            audioRef.current = null;
          };
          audio.onerror = () => {
            setPlayingAudioMsgId(null);
            audioRef.current = null;
          };

          await audio.play();
          return;
        }
      }
    } catch (e) {
      console.warn('AI natural TTS failed, falling back to browser speech:', e);
    }

    // Fallback to browser SpeechSynthesis with calibrated regional voice
    setIsGeneratingTts(false);
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(spokenText);
      const voices = window.speechSynthesis.getVoices();
      const regionalVoice =
        voices.find((v) => v.lang.startsWith('ur')) ||
        voices.find((v) => v.lang.includes('PK') || v.lang.includes('IN')) ||
        voices.find((v) => v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('neural'));

      if (regionalVoice) {
        utterance.voice = regionalVoice;
      }
      utterance.lang = language === 'en' ? 'en-GB' : 'ur-PK';
      utterance.rate = 0.92;
      utterance.pitch = 1.05;

      utterance.onend = () => setPlayingAudioMsgId(null);
      utterance.onerror = () => setPlayingAudioMsgId(null);

      window.speechSynthesis.speak(utterance);
    } else {
      setPlayingAudioMsgId(null);
    }
  };

  // Bespoke AI Outfit Image Generation
  const handleGenerateAiLook = async (advice: StylingAdvice, msgId: string | number, userPrompt?: string) => {
    setGeneratingImageMsgId(msgId);
    setLoadedImages((prev) => ({ ...prev, [String(msgId)]: false }));
    try {
      const res = await fetch('/api/agent/generate-outfit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt || advice.top,
          advice,
          gender,
          stylePreference,
          ageGroup,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.imageUrl) {
          // Update message in state
          setMessages((prev) =>
            prev.map((m) => {
              if (String(m.id) === String(msgId) && m.advice) {
                return {
                  ...m,
                  advice: {
                    ...m.advice,
                    customAiImageUrl: data.imageUrl,
                    fallbackImageUrl: data.fallbackUrl,
                    dynamicPrompt: data.prompt,
                    customAiImageCaption: data.caption,
                    isAiGenerated: data.isAiGenerated !== false,
                  },
                };
              }
              return m;
            })
          );

          // Update active lightbox if open for this look
          if (activeLightboxImage && activeLightboxImage.msgId === msgId) {
            setActiveLightboxImage((prev) =>
              prev ? { ...prev, src: data.imageUrl, caption: data.caption || prev.caption } : null
            );
          }

          try {
            confetti({
              particleCount: 35,
              spread: 60,
              origin: { y: 0.7 },
              colors: ['#D4AF37', '#1C3F3A', '#800020'],
            });
          } catch {}
        }
      }
    } catch (e) {
      console.error('Failed to generate AI visual:', e);
    } finally {
      setGeneratingImageMsgId(null);
    }
  };

  const toggleSaveLook = (advice: StylingAdvice) => {
    const exists = savedLooks.some(
      (l) => l.advice.top === advice.top && l.advice.bottom === advice.bottom
    );

    if (exists) {
      const targetLook = savedLooks.find(
        (l) => l.advice.top === advice.top && l.advice.bottom === advice.bottom
      );
      if (activeUserId && targetLook) {
        deleteLookFromFirestore(activeUserId, targetLook.id);
      }
      setSavedLooks((prev) =>
        prev.filter((l) => !(l.advice.top === advice.top && l.advice.bottom === advice.bottom))
      );
    } else {
      const catObj = CATEGORIES.find((c) => c.id === advice.category);
      const newLook: SavedLook = {
        id: 'look_' + Date.now(),
        title: `${catObj?.label || 'Custom Look'} · ${gender === 'men' ? 'Mardana' : 'Zanana'}`,
        advice,
        gender,
        ageGroup,
        savedAt: new Date().toISOString(),
      };
      setSavedLooks((prev) => [newLook, ...prev]);

      if (activeUserId) {
        saveLookToFirestore(activeUserId, newLook);
      }

      // Festive confetti trigger
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#D4AF37', '#1C3F3A', '#800020', '#FFFFFF'],
        });
      } catch {
        // no-op
      }
    }
  };

  const isLookSaved = (advice: StylingAdvice) => {
    return savedLooks.some(
      (l) => l.advice.top === advice.top && l.advice.bottom === advice.bottom
    );
  };

  const handleOpenDarziFromAdvice = (advice: StylingAdvice) => {
    const catObj = CATEGORIES.find((c) => c.id === advice.category);
    setActiveDarziLook({
      title: `${catObj?.label || 'Curated Outfit'} · Tailor Specification`,
      advice,
      gender,
    });
    setIsDarziOpen(true);
  };

  const handleCopyText = (advice: StylingAdvice, id: string | number) => {
    const isSpecific = advice.isSpecificAdvice || (!advice.top && !advice.bottom);
    let summary = `✨ PersonaGroom AI Styling\n${advice.intro}\n`;
    if (isSpecific) {
      if (advice.footwear && advice.footwear !== 'N/A') summary += `Footwear: ${advice.footwear}\n`;
      if (advice.accessories && advice.accessories !== 'N/A') summary += `Accessories/Grooming: ${advice.accessories}\n`;
      if (advice.color && advice.color !== 'N/A') summary += `Color Palette: ${advice.color}\n`;
      if (advice.styleTips && advice.styleTips.length > 0) {
        summary += `\nKey Tips:\n${advice.styleTips.map((tip, i) => `${i + 1}. ${tip}`).join('\n')}\n`;
      }
    } else {
      if (advice.top && advice.top !== 'N/A') summary += `Top: ${advice.top}\n`;
      if (advice.bottom && advice.bottom !== 'N/A') summary += `Bottom: ${advice.bottom}\n`;
      if (advice.footwear && advice.footwear !== 'N/A') summary += `Footwear: ${advice.footwear}\n`;
      if (advice.accessories && advice.accessories !== 'N/A') summary += `Accessories: ${advice.accessories}\n`;
      if (advice.color && advice.color !== 'N/A') summary += `Color Logic: ${advice.color}\n`;
      if (advice.fabricRecommendation && advice.fabricRecommendation !== 'N/A') summary += `Fabric: ${advice.fabricRecommendation}\n`;
      if (advice.darziTip && advice.darziTip !== 'N/A') summary += `Stitching Cut: ${advice.darziTip}\n`;
    }

    navigator.clipboard.writeText(summary.trim());
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className={`theme-${theme} relative flex h-[100dvh] w-full flex-col bg-background font-sans text-foreground md:flex-row overflow-hidden`}>
      {/* Mobile Top Header */}
      <header className="liquid-glass-navbar flex h-14 shrink-0 items-center justify-between border-b border-border px-4 md:hidden z-30">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="liquid-glass-pill rounded-lg border border-border p-2 text-foreground hover:bg-secondary/70 transition flex items-center justify-center cursor-pointer"
            aria-label="Open Studio Settings"
          >
            <SlidersHorizontal size={18} className="text-primary" />
          </button>
          <div>
            <h1 className="font-display text-lg font-bold leading-tight">
              Persona<span className="bg-gradient-brand bg-clip-text text-transparent">Groom</span>
            </h1>
            <span className="text-[10px] text-muted-foreground block -mt-0.5">
              {STYLE_PREFERENCES.find((s) => s.id === stylePreference)?.label} · {gender === 'men' ? 'Mardana' : 'Zanana'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIs3dRunwayOpen(true)}
            className="liquid-glass-pill rounded-lg border border-purple-500/40 p-2 text-purple-300 hover:bg-purple-500/20 transition cursor-pointer"
            title="3D Fashion Runway (Three.js)"
          >
            <Box size={16} />
          </button>

          <button
            type="button"
            onClick={() => setIsLiveVoiceOpen(true)}
            className="liquid-glass-pill rounded-lg border border-cyan-500/40 p-2 text-cyan-300 hover:bg-cyan-500/20 transition cursor-pointer"
            title="Gemini Live Voice"
          >
            <Radio size={16} />
          </button>

          <button
            type="button"
            onClick={() => setIsGeminiChatbotOpen(true)}
            className="liquid-glass-pill rounded-lg border border-amber-500/40 p-2 text-amber-300 hover:bg-amber-500/20 transition cursor-pointer"
            title="Gemini Search Grounded Chat"
          >
            <Search size={16} />
          </button>

          <button
            type="button"
            onClick={() => setIsImageStudioOpen(true)}
            className="liquid-glass-pill rounded-lg border border-pink-500/40 p-2 text-pink-300 hover:bg-pink-500/20 transition cursor-pointer"
            title="Image Studio (gemini-nano-banana-2.1)"
          >
            <Wand2 size={16} />
          </button>

          <button
            type="button"
            onClick={() => setIsLookbookOpen(true)}
            className="liquid-glass-pill relative rounded-lg border border-border p-2 text-foreground hover:bg-secondary/70 transition cursor-pointer"
            title="Saved Lookbook"
          >
            <BookOpen size={16} className="text-primary" />
            {savedLooks.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {savedLooks.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="liquid-glass-pill rounded-lg border border-border p-2 text-foreground hover:bg-secondary/70 transition cursor-pointer"
            title={isAuthenticated ? 'Studio Vault & Persistence' : 'Authentication Required'}
          >
            <Database size={16} className={isAuthenticated ? 'text-emerald-400' : 'text-primary animate-pulse'} />
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/65 backdrop-blur-xs transition-opacity md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar Controls (Slide-over drawer on mobile, fixed docked panel on desktop) */}
      <aside
        id="sidebar"
        className={`
          liquid-glass-sidebar fixed inset-y-0 left-0 z-50 flex h-full w-[85%] max-w-[340px] flex-col justify-between overflow-y-auto p-5 shadow-2xl transition-transform duration-300 ease-in-out
          md:static md:w-[330px] md:h-full md:translate-x-0 md:border-r md:border-border md:shadow-none
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="space-y-5">
          {/* Brand Heading & Mobile Close */}
          <div>
            <div className="flex items-center justify-between">
              <h1 className="font-display text-3xl font-bold leading-none tracking-tight">
                Persona<span className="bg-gradient-brand bg-clip-text text-transparent">Groom</span> AI
              </h1>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="AI Agent Ready" />
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground md:hidden"
                  aria-label="Close sidebar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground font-medium">
              Pakistani Fashion Intelligence & Grooming Studio
            </p>
          </div>

          {/* 9 Specialized Pakistani Modules */}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {/* 1. 🔮 3D Runway Studio */}
            <button
              onClick={() => setIs3dRunwayOpen(true)}
              className="liquid-glass-pill flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 p-2 text-xs font-semibold text-purple-300 hover:border-purple-400 hover:bg-purple-500/20 transition cursor-pointer"
            >
              <Box size={14} className="text-purple-400" />
              <span>🔮 3D Runway</span>
            </button>

            {/* 2. 🔍 Trends Chat */}
            <button
              onClick={() => setIsGeminiChatbotOpen(true)}
              className="liquid-glass-pill flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs font-semibold text-amber-300 hover:border-amber-400 hover:bg-amber-500/20 transition cursor-pointer"
            >
              <Search size={14} className="text-amber-400" />
              <span>🔍 Trends Chat</span>
            </button>

            {/* 3. 🪄 Image Studio & Lookbook */}
            <button
              onClick={() => setIsImageStudioOpen(true)}
              className="liquid-glass-pill flex items-center gap-1.5 rounded-lg border border-pink-500/40 bg-pink-500/10 p-2 text-xs font-semibold text-pink-300 hover:border-pink-400 hover:bg-pink-500/20 transition cursor-pointer"
            >
              <Wand2 size={14} className="text-pink-400" />
              <span>🪄 Image Studio</span>
            </button>

            {/* 4. 🎙️ Live Voice */}
            <button
              onClick={() => setIsLiveVoiceOpen(true)}
              className="liquid-glass-pill flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 p-2 text-xs font-semibold text-cyan-300 hover:border-cyan-400 hover:bg-cyan-500/20 transition cursor-pointer"
            >
              <Radio size={14} className="text-cyan-400" />
              <span>🎙️ Live Voice</span>
            </button>

            {/* 5. 🎨 Color Studio */}
            <button
              onClick={() => setIsColorStudioOpen(true)}
              className="liquid-glass-pill flex items-center gap-1.5 rounded-lg border border-border bg-card p-2 text-xs font-semibold text-foreground hover:border-primary/50 hover:bg-secondary transition cursor-pointer"
            >
              <Palette size={14} className="text-primary" />
              <span>🎨 Color Studio</span>
            </button>

            {/* 6. 💰 Budget Planner */}
            <button
              onClick={() => setIsBudgetPlannerOpen(true)}
              className="liquid-glass-pill flex items-center gap-1.5 rounded-lg border border-border bg-card p-2 text-xs font-semibold text-foreground hover:border-primary/50 hover:bg-secondary transition cursor-pointer"
            >
              <DollarSign size={14} className="text-primary" />
              <span>💰 Budget Planner</span>
            </button>

            {/* 7. ✂️ Darzi Slip (درزی) */}
            {/* 7. ✂️ Darzi Slip (درزی) */}
            <button
              onClick={() => {
                if (savedLooks.length > 0) {
                  handleOpenDarziFromAdvice(savedLooks[0].advice);
                } else {
                  handleOpenDarziFromAdvice(
                    getFallbackAdvice('Festive Eid look', gender, ageGroup, language, 'festive')
                  );
                }
              }}
              className={`liquid-glass-pill flex items-center gap-1.5 rounded-lg border border-border bg-card p-2 text-xs font-semibold text-foreground hover:border-primary/50 hover:bg-secondary transition cursor-pointer ${
                gender === 'women' ? 'col-span-1' : 'col-span-2 justify-center'
              }`}
            >
              <Scissors size={14} className="text-primary" />
              <span>✂️ Darzi Slip (درزی)</span>
            </button>

            {/* 8. 💍 Zewarat & Ornaments (Visible strictly for Women) */}
            {gender === 'women' && (
              <button
                onClick={() =>
                  handleSend(
                    'Recommend authentic Pakistani jewelry, bridal sets, Kundan, Polki, Chandbali Jhumkas, Matha Patti, or royal accessories for formal festive wear',
                    'jewelry'
                  )
                }
                className="liquid-glass-pill col-span-1 flex items-center gap-1.5 rounded-lg border border-border bg-card p-2 text-xs font-semibold text-foreground hover:border-primary/50 hover:bg-secondary transition cursor-pointer animate-in fade-in duration-200"
              >
                <Sparkles size={14} className="text-amber-400" />
                <span>💍 Zewarat & Ornaments</span>
              </button>
            )}

            {/* 9. 💈 Hair, Grooming & Etiquette Coaching */}
            <button
              onClick={() =>
                handleSend(
                  'Recommend tailored Pakistani haircut styling, beard grooming, signature Oud attar fragrance, and royal formal etiquette coaching for my age group and look',
                  'grooming'
                )
              }
              className="liquid-glass-pill col-span-2 flex items-center justify-center gap-2 rounded-lg border border-border bg-card p-2 text-xs font-semibold text-foreground hover:border-primary/50 hover:bg-secondary transition cursor-pointer"
            >
              <Sparkles size={14} className="text-cyan-400" />
              <span>💈 Hair, Grooming & Etiquette Coaching</span>
            </button>

            {/* Lookbook Drawer */}
            <button
              onClick={() => setIsLookbookOpen(true)}
              className="liquid-glass-pill col-span-2 flex items-center justify-between rounded-lg border border-border bg-card p-2 text-xs font-semibold text-foreground hover:border-primary/50 hover:bg-secondary transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <BookOpen size={14} className="text-primary" />
                <span>Saved Lookbook Collection</span>
              </div>
              {savedLooks.length > 0 && (
                <span className="rounded-full bg-primary/20 text-primary px-2 py-0.5 text-[10px] font-bold">
                  {savedLooks.length} looks
                </span>
              )}
            </button>

            {/* Studio Auth & Cloud Sync Banner */}
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="liquid-glass-pill col-span-2 flex items-center justify-between rounded-lg border border-border bg-card p-2 text-xs font-semibold text-foreground hover:border-primary/50 hover:bg-secondary transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Database size={14} className={isAuthenticated ? 'text-emerald-400' : 'text-primary'} />
                <span className="truncate">
                  {user
                    ? `Cloud: ${user.displayName?.split(' ')[0] || 'Synced'}`
                    : guestUser
                    ? `Guest: ${guestUser.displayName.split(' ')[0]}`
                    : 'Studio Auth Gate'}
                </span>
              </div>
              {user ? (
                <span className="rounded-full bg-emerald-500/20 text-emerald-400 px-2 py-0.5 text-[10px] font-bold shrink-0">
                  Synced
                </span>
              ) : guestUser ? (
                <span className="rounded-full bg-amber-500/20 text-amber-300 px-2 py-0.5 text-[10px] font-bold shrink-0">
                  Guest
                </span>
              ) : (
                <span className="rounded-full bg-purple-500/20 text-purple-300 px-2 py-0.5 text-[10px] font-bold shrink-0 animate-pulse">
                  Sign In
                </span>
              )}
            </button>
          </div>

          {/* Configuration Selectors */}
          <div className="space-y-4 pt-2 border-t border-border/80">
            {/* UI Theme */}
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Visual Theme
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'emerald', label: 'Emerald' },
                  { id: 'dark', label: 'Dark' },
                  { id: 'light', label: 'Light' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setTheme(item.id as Theme)}
                    className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                      theme === item.id
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border bg-card hover:border-primary/40'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language Engine */}
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Language Engine
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'roman', label: 'Roman Urdu' },
                  { id: 'en', label: 'English' },
                  { id: 'ur', label: 'اردو' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setLanguage(item.id as Language)}
                    className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                      language === item.id
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border bg-card hover:border-primary/40'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Gender */}
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Target Gender
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'men', label: 'Men' },
                  { id: 'women', label: 'Women' },
                  { id: 'unisex', label: 'Unisex' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setGender(item.id as Gender)}
                    className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                      gender === item.id
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border bg-card hover:border-primary/40'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Age Group */}
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Target Age Group
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {AGE_GROUPS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setAgeGroup(item.id)}
                    className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition text-left ${
                      ageGroup === item.id
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border bg-card hover:border-primary/40'
                    }`}
                  >
                    <span className="block">{item.label}</span>
                    <span className="block text-[10px] font-normal opacity-75">{item.sub} yrs</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Style Preferences Settings Section */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {t.stylePreferenceLabel || 'Style Preferences'}
                </p>
                <span className="text-[10px] font-semibold text-primary">
                  {STYLE_PREFERENCES.find((s) => s.id === stylePreference)?.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {STYLE_PREFERENCES.map((pref) => {
                  const isActive = stylePreference === pref.id;
                  return (
                    <button
                      key={pref.id}
                      onClick={() => setStylePreference(pref.id)}
                      title={pref.vibe}
                      className={`rounded-lg border px-2.5 py-2 text-xs font-semibold transition text-left ${
                        isActive
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                          : 'border-border bg-card hover:border-primary/40 text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{pref.emoji}</span>
                        <span className="truncate">{pref.label}</span>
                      </div>
                      <span
                        className={`block text-[10px] font-normal mt-0.5 truncate ${
                          isActive ? 'opacity-85' : 'text-muted-foreground'
                        }`}
                      >
                        {pref.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Stylist Memory & Learning Profile Card */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                  <Brain size={12} />
                  <span>Stylist Memory</span>
                </span>
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  {learningProfile.totalRatings > 0 ? `${learningProfile.satisfactionRate}% Satisfied` : 'Learning'}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {learningProfile.totalRatings > 0
                  ? `${learningProfile.totalRatings} consultation(s) rated · Agent adapts to your feedback`
                  : 'Rate looks with 1–5 stars to train the AI on your preferences.'}
              </p>
              <button
                type="button"
                onClick={() => setIsStylistMemoryOpen(true)}
                className="mt-2 w-full rounded-md bg-secondary border border-border px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary/80 hover:text-primary transition flex items-center justify-center gap-1.5"
              >
                <Brain size={12} className="text-primary" />
                <span>View Learned Taste Profile</span>
              </button>
            </div>

            {/* Gemini API Key (Optional) Input Field */}
            <div className="rounded-xl border border-border bg-card/60 p-2.5 space-y-1">
              <label htmlFor="geminiApiKeyInput" className="block text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Gemini API Key (Optional)
              </label>
              <input
                id="geminiApiKeyInput"
                type="password"
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                placeholder="AIzaSy... (Fallback active)"
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
              />
              <span className="block text-[9px] text-muted-foreground leading-tight">
                Wires directly to Google Gemini 3.8 Flash with offline rules fallback.
              </span>
            </div>

            {/* Advanced Styling Modules */}
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Styling Consultations
              </p>
              <div className="space-y-1">
                {CATEGORIES.filter((cat) => !cat.womenOnly || gender === 'women').map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleSend(cat.prompt, cat.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-foreground hover:bg-secondary transition"
                  >
                    <span className="text-sm">{cat.emoji}</span>
                    <span className="truncate">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Footer info */}
        <div className="mt-6 pt-4 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Bot size={12} className="text-primary" />
            <span>AI Studio Stylist Engine</span>
          </span>
          <span className="text-[10px] text-muted-foreground/80">
            {STYLE_PREFERENCES.find((s) => s.id === stylePreference)?.label}
          </span>
        </div>
      </aside>

      {/* Main Studio Canvas */}
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Top Status Header Dock */}
        <div className="absolute inset-x-0 top-3 z-10 flex flex-wrap items-center justify-center gap-1.5 px-4 pointer-events-none">
          <button
            type="button"
            onClick={() => setIsStylistMemoryOpen(true)}
            className="liquid-glass-navbar pointer-events-auto rounded-full border border-border px-3.5 py-1.5 text-xs font-medium shadow-elegant flex items-center gap-2 hover:border-primary/50 transition cursor-pointer"
            title="Click to view AI Stylist Learned Preferences"
          >
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-muted-foreground hidden lg:inline">AI Studio Engine —</span>
            <span className="font-semibold text-foreground">
              {STYLE_PREFERENCES.find((s) => s.id === stylePreference)?.label} Style
            </span>
            {learningProfile.totalRatings > 0 ? (
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <Brain size={11} /> {learningProfile.totalRatings} Learned
              </span>
            ) : null}
          </button>

          {/* 3D Runway Studio Button (Three.js) */}
          <button
            type="button"
            onClick={() => setIs3dRunwayOpen(true)}
            className="liquid-glass-navbar pointer-events-auto rounded-full border border-purple-500/40 px-3 py-1.5 text-xs font-semibold text-purple-300 shadow-elegant flex items-center gap-1.5 hover:bg-purple-500/20 hover:border-purple-400 transition cursor-pointer"
            title="Open Three.js 3D Fashion Runway"
          >
            <Box size={14} className="text-purple-400" />
            <span className="hidden sm:inline">3D Runway</span>
          </button>

          {/* Gemini Chatbot (Google Search Grounding) */}
          <button
            type="button"
            onClick={() => setIsGeminiChatbotOpen(true)}
            className="liquid-glass-navbar pointer-events-auto rounded-full border border-amber-500/40 px-3 py-1.5 text-xs font-semibold text-amber-300 shadow-elegant flex items-center gap-1.5 hover:bg-amber-500/20 hover:border-amber-400 transition cursor-pointer"
            title="Open Gemini Chat with Live Google Search Data"
          >
            <Search size={14} className="text-amber-400" />
            <span className="hidden sm:inline">Trends Chat</span>
          </button>

          {/* Text-Prompt Image Studio (gemini-nano-banana-2.1) */}
          <button
            type="button"
            onClick={() => setIsImageStudioOpen(true)}
            className="liquid-glass-navbar pointer-events-auto rounded-full border border-pink-500/40 px-3 py-1.5 text-xs font-semibold text-pink-300 shadow-elegant flex items-center gap-1.5 hover:bg-pink-500/20 hover:border-pink-400 transition cursor-pointer"
            title="Create & Edit Outfit Images with Text Prompts"
          >
            <Wand2 size={14} className="text-pink-400" />
            <span className="hidden md:inline">Image Studio</span>
          </button>

          {/* Real-Time Live Voice (gemini-3.8-live) */}
          <button
            type="button"
            onClick={() => setIsLiveVoiceOpen(true)}
            className="liquid-glass-navbar pointer-events-auto rounded-full border border-cyan-500/40 px-3 py-1.5 text-xs font-semibold text-cyan-300 shadow-elegant flex items-center gap-1.5 hover:bg-cyan-500/20 hover:border-cyan-400 transition cursor-pointer"
            title="Voice Conversations with Gemini Live"
          >
            <Radio size={14} className="text-cyan-400 animate-pulse" />
            <span className="hidden md:inline">Live Voice</span>
          </button>

          {/* Firebase Auth & Persistence */}
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="liquid-glass-navbar pointer-events-auto rounded-full border border-border px-3 py-1.5 text-xs font-semibold shadow-elegant flex items-center gap-1.5 hover:border-primary/50 transition cursor-pointer"
            title="Firebase Google Auth & Firestore Cloud Persistence"
          >
            <Database size={13} className={user ? 'text-emerald-400' : 'text-primary'} />
            <span className="hidden lg:inline">{user ? (user.displayName?.split(' ')[0] || 'Synced') : 'Firebase Sync'}</span>
          </button>

          {/* Clear Chat Button */}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearChat}
              className="liquid-glass-navbar pointer-events-auto rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground shadow-elegant flex items-center gap-1.5 transition cursor-pointer"
              title="Clear conversation history from localStorage"
            >
              <X size={13} />
              <span className="hidden sm:inline">Clear Chat</span>
            </button>
          )}
        </div>

        {/* Non-intrusive Toast Alert */}
        {toastMessage && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-slate-900/95 text-white border border-purple-500/40 px-4 py-2 text-xs font-medium shadow-2xl backdrop-blur-xl flex items-center gap-2">
            <span>ℹ️</span>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Chat / Consultation Scroll Stream */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 pt-16 md:px-10">
          <div className="mx-auto max-w-3xl space-y-6">
            {/* Welcome Studio Card */}
            <div
              className={`liquid-glass-card rounded-2xl border border-border p-6 shadow-elegant ${
                isUrdu ? 'font-urdu text-right leading-loose' : ''
              }`}
              dir={isUrdu ? 'rtl' : 'ltr'}
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-6 w-6 text-primary" />
                <h2 className="font-display text-2xl font-bold">{t.welcomeTitle}</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t.welcomeDesc}</p>

              {/* Quick Prompt Starters */}
              <div className="mt-4 pt-3 border-t border-border/60">
                <p className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground mb-2">
                  Suggested Fashion Scenarios:
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.filter((qp) => !qp.womenOnly || gender === 'women').map((qp, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(qp.prompt)}
                      className="liquid-glass-pill rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/60 hover:bg-secondary/70 transition cursor-pointer"
                    >
                      {qp.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Conversation Stream */}
            {messages.map((msg, index) => {
              if (msg.role === 'user') {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-gradient-brand px-5 py-3.5 text-sm text-primary-foreground shadow-elegant">
                      {msg.image && (
                        <div
                          onClick={() =>
                            setActiveLightboxImage({
                              src: msg.image!,
                              caption: 'Your Uploaded Outfit / Fabric',
                            })
                          }
                          className="group relative mb-2 cursor-pointer overflow-hidden rounded-xl border border-white/20 transition hover:border-white/50"
                          title="Click to view full image"
                        >
                          <img
                            src={msg.image}
                            alt="Uploaded outfit"
                            className="max-h-56 w-full object-cover transition duration-300 group-hover:scale-103"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center">
                            <span className="rounded-full bg-black/75 px-3 py-1 text-xs text-white flex items-center gap-1.5 backdrop-blur-md">
                              <Maximize2 size={13} /> View Full Image
                            </span>
                          </div>
                        </div>
                      )}
                      <p className="leading-relaxed font-medium">{msg.text}</p>
                      {msg.timestamp && (
                        <span className="block mt-1 text-[10px] opacity-75 text-right font-sans">
                          {msg.timestamp}
                        </span>
                      )}
                    </div>
                  </div>
                );
              }

              // Bot Advice Message Card
              const advice = msg.advice;
              if (!advice) return null;
              const isSaved = isLookSaved(advice);
              const catObj = CATEGORIES.find((c) => c.id === advice.category);

              return (
                <div
                  key={msg.id}
                  className={`liquid-glass-card rounded-2xl border border-border p-6 shadow-elegant transition space-y-4 ${
                    isUrdu ? 'font-urdu text-right leading-loose' : ''
                  }`}
                  dir={isUrdu ? 'rtl' : 'ltr'}
                >
                  {msg.error && (
                    <div className="rounded-lg bg-secondary/50 px-3 py-1.5 text-[11px] text-muted-foreground border border-border/80 flex items-center justify-between">
                      <span>{msg.error}</span>
                      <span className="text-[10px] opacity-60">Verified Fallback Engine</span>
                    </div>
                  )}

                  {/* Intro and Speech trigger */}
                  <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{catObj?.emoji || '✨'}</span>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-primary">
                          {catObj?.label || 'Curated Styling'}
                        </span>
                        <p className="text-sm font-medium text-foreground">{advice.intro}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handlePlayNaturalVoice(advice, msg.id)}
                        disabled={isGeneratingTts && playingAudioMsgId === msg.id}
                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                          playingAudioMsgId === msg.id
                            ? 'bg-primary text-primary-foreground shadow-sm animate-pulse'
                            : 'bg-secondary/70 text-foreground hover:bg-secondary hover:text-primary border border-border'
                        }`}
                        title="Listen Advice with Natural Voice Accent"
                        aria-label="Listen Advice"
                      >
                        {isGeneratingTts && playingAudioMsgId === msg.id ? (
                          <>
                            <RefreshCw size={13} className="animate-spin text-primary" />
                            <span className="text-[11px]">Loading Voice...</span>
                          </>
                        ) : playingAudioMsgId === msg.id ? (
                          <>
                            <Volume2 size={13} className="animate-bounce text-primary-foreground" />
                            <span className="text-[11px]">Playing Advice...</span>
                          </>
                        ) : (
                          <>
                            <Volume2 size={13} className="text-primary" />
                            <span className="text-[11px]">Listen Advice</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Core Structured Specifications & Dynamic Context-Aware Formatting */}
                  {(() => {
                    const hasValidTop =
                      advice.top &&
                      advice.top.trim() !== '' &&
                      advice.top.trim().toLowerCase() !== 'n/a';
                    const hasValidBottom =
                      advice.bottom &&
                      advice.bottom.trim() !== '' &&
                      advice.bottom.trim().toLowerCase() !== 'n/a';
                    const hasValidFootwear =
                      advice.footwear &&
                      advice.footwear.trim() !== '' &&
                      advice.footwear.trim().toLowerCase() !== 'n/a';
                    const hasValidAccessories =
                      advice.accessories &&
                      advice.accessories.trim() !== '' &&
                      advice.accessories.trim().toLowerCase() !== 'n/a';
                    const hasValidColor =
                      advice.color &&
                      advice.color.trim() !== '' &&
                      advice.color.trim().toLowerCase() !== 'n/a';

                    return (
                      <div className="space-y-3 pt-1">
                        {hasValidTop && (
                          <div className="flex items-start gap-2 text-xs sm:text-sm">
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                            <div>
                              <strong className="text-primary font-semibold">{t.topWear}:</strong>{' '}
                              <span className="text-foreground">{advice.top}</span>
                            </div>
                          </div>
                        )}

                        {hasValidBottom && (
                          <div className="flex items-start gap-2 text-xs sm:text-sm">
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                            <div>
                              <strong className="text-primary font-semibold">{t.bottomWear}:</strong>{' '}
                              <span className="text-foreground">{advice.bottom}</span>
                            </div>
                          </div>
                        )}

                        {hasValidFootwear && (
                          <div className="flex items-start gap-2 text-xs sm:text-sm">
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                            <div>
                              <strong className="text-primary font-semibold">{t.footwear}:</strong>{' '}
                              <span className="text-foreground">{advice.footwear}</span>
                            </div>
                          </div>
                        )}

                        {hasValidAccessories && (
                          <div className="flex items-start gap-2 text-xs sm:text-sm">
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                            <div>
                              <strong className="text-primary font-semibold">
                                {gender === 'women' ? t.jewelryAccessories : t.accessories}:
                              </strong>{' '}
                              <span className="text-foreground">{advice.accessories}</span>
                            </div>
                          </div>
                        )}

                        {hasValidColor && (
                          <div className="flex items-start gap-2 text-xs sm:text-sm">
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                            <div>
                              <strong className="text-primary font-semibold">{t.colorLogic}:</strong>{' '}
                              <span className="text-foreground">{advice.color}</span>
                            </div>
                          </div>
                        )}

                        {/* Optional 2 Short Style & Grooming Tips for Specific Topics */}
                        {advice.styleTips && advice.styleTips.length > 0 && (
                          <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 space-y-2 mt-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                              <Sparkles size={14} className="text-primary" />
                              <span>Key Style & Grooming Tips</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {advice.styleTips.map((tip, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-2 text-xs text-foreground bg-card/75 p-2.5 rounded-lg border border-border/50"
                                >
                                  <span className="text-primary font-bold shrink-0">💡</span>
                                  <span className="leading-relaxed">{tip}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Additional Value: Fabric & Darzi Cut Badges (Only shown when relevant for outfits) */}
                  {!advice.isSpecificAdvice &&
                    (advice.fabricRecommendation || advice.darziTip) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border/60">
                        {advice.fabricRecommendation &&
                          advice.fabricRecommendation.trim().toLowerCase() !== 'n/a' && (
                            <div className="bg-secondary/40 rounded-xl p-3 border border-border text-xs">
                              <span className="font-bold text-primary block text-[10px] uppercase">
                                {t.fabricLabel}
                              </span>
                              <span className="text-muted-foreground mt-0.5 block">
                                {advice.fabricRecommendation}
                              </span>
                            </div>
                          )}

                        {advice.darziTip &&
                          advice.darziTip.trim().toLowerCase() !== 'n/a' && (
                            <div className="bg-secondary/40 rounded-xl p-3 border border-border text-xs">
                              <span className="font-bold text-primary block text-[10px] uppercase">
                                {t.darziCut}
                              </span>
                              <span className="text-muted-foreground mt-0.5 block">
                                {advice.darziTip}
                              </span>
                            </div>
                          )}
                      </div>
                    )}

                  {/* Color Palette Chips */}
                  {advice.colorHexes && advice.colorHexes.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                          Look Palette:
                        </span>
                        <div className="flex items-center gap-1.5">
                          {advice.colorHexes.map((hex, idx) => (
                            <div
                              key={idx}
                              className="group relative flex items-center"
                              title={`Click to copy ${hex}`}
                            >
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(hex);
                                  setCopiedId(hex);
                                  setTimeout(() => setCopiedId(null), 1500);
                                }}
                                className="h-6 w-6 rounded-md border border-black/20 shadow-xs transition hover:scale-110"
                                style={{ backgroundColor: hex }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {advice.estimatedBudgetPkr && (
                        <div className="text-xs font-semibold text-foreground bg-secondary/80 px-2.5 py-1 rounded-md">
                          Est: {advice.estimatedBudgetPkr}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Visual Outfit Concept Card with Fail-Safe Dual Engine */}
                  {(() => {
                    const fallbackLookImage = resolveLookImage(advice, gender, msg.text || '', ageGroup);
                    const currentImgSrc = advice.customAiImageUrl || fallbackLookImage.src;
                    const fallbackUrl = advice.fallbackImageUrl || fallbackLookImage.fallbackSrc;
                    const localFallback =
                      gender === 'women'
                        ? advice.category === 'casual'
                          ? '/assets/women_casual.jpg'
                          : '/assets/women_festive.jpg'
                        : advice.category === 'casual'
                        ? '/assets/men_casual.jpg'
                        : '/assets/men_festive.jpg';
                    const currentCaption =
                      advice.customAiImageCaption ||
                      (advice.customAiImageUrl
                        ? `AI Bespoke Visual · ${stylePreference.toUpperCase()} Ensemble`
                        : fallbackLookImage.caption);
                    const isAiGen = Boolean(advice.customAiImageUrl || fallbackLookImage.src);
                    const isGenerating = generatingImageMsgId === msg.id;

                    return (
                      <FailSafeImageCard
                        primarySrc={currentImgSrc}
                        fallbackSrc={fallbackUrl}
                        localFallbackSrc={localFallback}
                        caption={currentCaption}
                        isAiGen={isAiGen}
                        isGenerating={isGenerating}
                        onOpenLightbox={() =>
                          setActiveLightboxImage({
                            src: currentImgSrc,
                            caption: currentCaption,
                            advice,
                            gender,
                            msgId: msg.id,
                          })
                        }
                        onRegenerate={() => handleGenerateAiLook(advice, msg.id, msg.text)}
                      />
                    );
                  })()}

                  {/* Card Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSaveLook(advice)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                          isSaved
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'border border-border bg-secondary hover:bg-secondary/80 text-foreground'
                        }`}
                      >
                        {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                        <span>{isSaved ? t.saved : t.saveLook}</span>
                      </button>

                      {!advice.isSpecificAdvice &&
                        (advice.top || advice.bottom || advice.darziTip) && (
                          <button
                            onClick={() => handleOpenDarziFromAdvice(advice)}
                            className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80 transition"
                          >
                            <Scissors size={14} className="text-primary" />
                            <span>{t.exportDarzi}</span>
                          </button>
                        )}

                      <button
                        onClick={() => handleCopyText(advice, msg.id)}
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80 transition"
                      >
                        {copiedId === msg.id ? (
                          <Check size={14} className="text-emerald-500" />
                        ) : (
                          <Share2 size={14} />
                        )}
                        <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* User Rating & Continuous Learning Feedback Card */}
                  <AdviceRatingCard
                    messageId={msg.id}
                    advice={advice}
                    language={language}
                    stylePreference={stylePreference}
                    existingRating={ratings.find((r) => String(r.messageId) === String(msg.id))}
                    onSaveRating={handleSaveRating}
                  />

                  {/* Follow-up Prompts */}
                  {advice.followUpSuggestions && advice.followUpSuggestions.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block mb-1.5">
                        {t.askFollowUp}:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {advice.followUpSuggestions.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            onClick={() => handleSend(sug, advice.category)}
                            className="rounded-lg border border-border/80 bg-card px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition"
                          >
                            + {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Loading Indicator */}
            {isConsulting && (
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm animate-pulse text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                <span>PersonaGroom AI is tailoring your Pakistani look...</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input Control Console */}
        <div className="liquid-glass-navbar border-t border-border px-4 py-3 md:px-10">
          <div className="mx-auto max-w-3xl space-y-2">
            {/* Attached Photo Preview */}
            {attachedImage && (
              <div className="relative inline-block">
                <div className="liquid-glass-card overflow-hidden rounded-xl border border-border shadow-sm">
                  <img src={attachedImage} alt="Fabric/Outfit preview" className="h-20 w-auto object-cover" />
                </div>
                <button
                  onClick={() => setAttachedImage(null)}
                  className="absolute -right-2 -top-2 rounded-full bg-foreground p-1 text-background hover:opacity-80 transition"
                  aria-label="Remove image"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Input Bar */}
            <div className="liquid-glass-input flex items-end gap-2 rounded-2xl border border-border p-2 shadow-elegant">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setAttachedImage(String(reader.result));
                  reader.readAsDataURL(file);
                  e.target.value = '';
                }}
              />

              {/* Attach Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl p-2.5 text-muted-foreground hover:bg-secondary hover:text-primary transition"
                title={t.attachPhoto}
                aria-label={t.attachPhoto}
              >
                <Paperclip size={18} />
              </button>

              {/* Voice Input Button */}
              <button
                onClick={handleVoiceInput}
                className={`rounded-xl p-2.5 transition ${
                  isListening
                    ? 'bg-primary text-primary-foreground animate-pulse'
                    : 'text-muted-foreground hover:bg-secondary hover:text-primary'
                }`}
                title={t.voiceListen}
                aria-label={t.voiceListen}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              {/* Text Area */}
              <textarea
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                placeholder={t.inputPlaceholder}
                className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
              />

              {/* Send Button */}
              <button
                onClick={() => handleSend()}
                disabled={isConsulting || (!inputPrompt.trim() && !attachedImage)}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-elegant transition hover:opacity-90 disabled:opacity-40"
              >
                <Send size={15} />
                <span className="hidden sm:inline">Consult</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <LookbookModal
        isOpen={isLookbookOpen}
        onClose={() => setIsLookbookOpen(false)}
        savedLooks={savedLooks}
        onRemoveLook={(id) => setSavedLooks((prev) => prev.filter((l) => l.id !== id))}
        language={language}
        onOpenDarziSlip={(look) => {
          setActiveDarziLook(look);
          setIsDarziOpen(true);
        }}
        onOpenLightbox={(look) => {
          const fallback = resolveLookImage(look.advice, look.gender);
          setActiveLightboxImage({
            src: look.advice.customAiImageUrl || fallback.src,
            caption: look.advice.customAiImageUrl
              ? `AI Bespoke Visual · ${look.title}`
              : look.title || fallback.caption,
            advice: look.advice,
            gender: look.gender,
          });
        }}
      />

      <DarziSpecModal
        isOpen={isDarziOpen}
        onClose={() => setIsDarziOpen(false)}
        look={activeDarziLook}
        language={language}
      />

      <ColorStudioModal
        isOpen={isColorStudioOpen}
        onClose={() => setIsColorStudioOpen(false)}
        language={language}
        gender={gender}
        onApplyPaletteToChat={(prompt) => handleSend(prompt, 'color')}
      />

      <BudgetPlannerModal
        isOpen={isBudgetPlannerOpen}
        onClose={() => setIsBudgetPlannerOpen(false)}
        language={language}
        gender={gender}
        onApplyBudgetToChat={(prompt) => handleSend(prompt, 'budget')}
      />

      <StylistMemoryModal
        isOpen={isStylistMemoryOpen}
        onClose={() => setIsStylistMemoryOpen(false)}
        profile={learningProfile}
        ratings={ratings}
        language={language}
        onResetMemory={handleResetStylistMemory}
      />

      {/* Image Lightbox Full View Modal */}
      {activeLightboxImage && (
        <ImageLightboxModal
          isOpen={Boolean(activeLightboxImage)}
          onClose={() => setActiveLightboxImage(null)}
          imageSrc={activeLightboxImage.src}
          imageCaption={activeLightboxImage.caption}
          advice={activeLightboxImage.advice}
          gender={activeLightboxImage.gender}
          language={language}
          onGenerateAiVariation={
            activeLightboxImage.advice && activeLightboxImage.msgId
              ? () => handleGenerateAiLook(activeLightboxImage.advice!, activeLightboxImage.msgId!)
              : undefined
          }
          isGeneratingAi={generatingImageMsgId === activeLightboxImage.msgId}
        />
      )}

      {/* 1. Three.js 3D Fashion Runway Studio Modal */}
      <ThreeFashionRunwayModal
        isOpen={is3dRunwayOpen}
        onClose={() => setIs3dRunwayOpen(false)}
        gender={gender}
        stylePreference={stylePreference}
        activeColorHex={savedLooks[0]?.advice?.colorHexes?.[0] || '#0f766e'}
        lookTitle={savedLooks[0]?.title || 'Bespoke Pakistani Couture'}
      />

      {/* 2. Multi-Turn Gemini Chatbot with Google Search Grounding */}
      <GeminiChatbotModal
        isOpen={isGeminiChatbotOpen}
        onClose={() => setIsGeminiChatbotOpen(false)}
        language={language}
        gender={gender}
        stylePreference={stylePreference}
        ageGroup={ageGroup}
      />

      {/* 3. Text Prompt Create & Edit Image Studio (gemini-nano-banana-2.1) */}
      <ImageStudioModal
        isOpen={isImageStudioOpen}
        onClose={() => setIsImageStudioOpen(false)}
        gender={gender}
        stylePreference={stylePreference}
        onApplyImageToLook={(img) => setAttachedImage(img)}
      />

      {/* 4. Real-Time Voice Conversation (gemini-3.8-live) */}
      <LiveVoiceModal
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
        gender={gender}
        language={language}
      />

      {/* 5. Firebase Auth & Firestore Persistence Modal (Compulsory Auth Gate) */}
      <AuthModal
        isOpen={isAuthModalOpen || (!authLoading && !isAuthenticated)}
        onClose={() => setIsAuthModalOpen(false)}
        isCompulsory={!isAuthenticated}
      />
    </div>
  );
}
