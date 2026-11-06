import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  X,
  Sparkles,
  Search,
  ExternalLink,
  Zap,
  Crown,
  Compass,
  RefreshCw,
  User as UserIcon,
} from 'lucide-react';
import { Language, Gender, StylePreference, AgeGroup } from '../types';
import { useAuth } from '../context/AuthContext';
import { saveChatMessageToFirestore } from '../lib/firestoreData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  gender: Gender;
  stylePreference: StylePreference;
  ageGroup: AgeGroup;
}

interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  modelUsed?: string;
  groundingSources?: { title: string; url: string }[];
  searchQueries?: string[];
  timestamp: string;
}

export const GeminiChatbotModal: React.FC<Props> = ({
  isOpen,
  onClose,
  language,
  gender,
  stylePreference,
  ageGroup,
}) => {
  const { user } = useAuth();
  const [role, setRole] = useState<'trends' | 'architect' | 'speed'>('trends');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: 'init-1',
      role: 'assistant',
      text: 'Assalam-o-Alaikum! Main aap ka dedicated PersonaGroom Gemini Stylist hoon. Kis event ya cultural outfit ke bare mein mashwara chahte hain?',
      modelUsed: 'gemini-3.8-flash',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen) return null;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const queryText = input.trim();
    if (!queryText || loading) return;

    const userMsg: ChatMessageItem = {
      id: 'msg_' + Date.now(),
      role: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    if (user) {
      saveChatMessageToFirestore(user.uid, userMsg as any);
    }

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, text: m.text })),
          role,
          gender,
          ageGroup,
          stylePreference,
          language,
        }),
      });

      const data = await res.json();
      const botMsg: ChatMessageItem = {
        id: 'msg_bot_' + Date.now(),
        role: 'assistant',
        text: data.reply || 'Aap ke outfit ke liye classic kurta aur Peshawari chappal behtareen rahay ga.',
        modelUsed: data.modelUsed || (role === 'architect' ? 'gemini-4-argon' : role === 'speed' ? 'gemini-3.1-flash-lite' : 'gemini-3.8-flash'),
        groundingSources: data.groundingSources || [],
        searchQueries: data.searchQueries || [],
        timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);

      if (user) {
        saveChatMessageToFirestore(user.uid, botMsg as any, botMsg.modelUsed, botMsg.groundingSources);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const fallbackMsg: ChatMessageItem = {
        id: 'msg_err_' + Date.now(),
        role: 'assistant',
        text: 'Maaf kijiye ga, network connection mein thori rukawat ayi hai. Lekin traditional wash-and-wear kurta ban collar ke sath hamesha elegant lagta hai.',
        modelUsed: 'gemini-3.8-flash',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-purple-500/30 bg-slate-900 text-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600/30 border border-purple-500/40 text-purple-300">
              <Bot size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-white">Gemini Multi-Turn Stylist</h3>
                <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-300 border border-purple-500/30">
                  {role === 'architect' ? 'gemini-4-argon' : role === 'speed' ? 'gemini-3.1-flash-lite' : 'gemini-3.8-flash'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Live Pakistani Couture Intelligence & Search Grounding
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Role Switcher Toolbar */}
        <div className="flex items-center gap-1.5 border-b border-slate-800 bg-slate-950/40 px-5 py-2 overflow-x-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
            Stylist Role:
          </span>

          <button
            onClick={() => setRole('trends')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer shrink-0 ${
              role === 'trends'
                ? 'bg-purple-600 text-white border border-purple-400 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Search size={12} className="text-amber-400" />
            <span>Trend Specialist (Google Search)</span>
          </button>

          <button
            onClick={() => setRole('architect')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer shrink-0 ${
              role === 'architect'
                ? 'bg-purple-600 text-white border border-purple-400 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Crown size={12} className="text-yellow-400" />
            <span>Couture Architect (gemini-4-argon)</span>
          </button>

          <button
            onClick={() => setRole('speed')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer shrink-0 ${
              role === 'speed'
                ? 'bg-purple-600 text-white border border-purple-400 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Zap size={12} className="text-cyan-400" />
            <span>Quick Dispatcher (gemini-3.1-flash-lite)</span>
          </button>
        </div>

        {/* Scrollable Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-md ${
                  m.role === 'user'
                    ? 'rounded-br-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'rounded-bl-xs border border-slate-700/80 bg-slate-800/90 text-slate-100'
                }`}
              >
                {m.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-1.5 border-b border-slate-700/60 pb-1">
                    <Sparkles size={12} className="text-purple-400" />
                    <span className="text-[10px] font-semibold text-purple-300">
                      {m.modelUsed || 'Gemini Stylist'}
                    </span>
                    <span className="text-[9px] text-slate-400 ml-auto">{m.timestamp}</span>
                  </div>
                )}

                <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>

                {/* Google Search Grounding Sources */}
                {m.groundingSources && m.groundingSources.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-700/70">
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-300 mb-1.5">
                      <Search size={11} />
                      <span>Google Search Live Sources:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {m.groundingSources.map((src, idx) => (
                        <a
                          key={idx}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded-md bg-slate-900/90 border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300 hover:text-white hover:border-amber-400/50 transition"
                        >
                          <span className="truncate max-w-[160px]">{src.title}</span>
                          <ExternalLink size={9} className="opacity-70" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {m.role === 'user' && (
                <span className="text-[9px] text-slate-500 mt-1 mr-1">{m.timestamp}</span>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 rounded-xl bg-slate-800/70 border border-slate-700 p-3 max-w-[70%] text-slate-300 text-xs">
              <RefreshCw size={13} className="animate-spin text-purple-400" />
              <span>PersonaGroom Gemini is researching trends...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="border-t border-slate-800 bg-slate-950/90 p-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 focus-within:border-purple-500 transition">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                role === 'trends'
                  ? 'Ask about 2026 Eid/wedding trends or bazaar prices...'
                  : role === 'architect'
                  ? 'Ask about bespoke cuts, kalidar flare, or tilla density...'
                  : 'Quick styling question...'
              }
              className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex items-center justify-center rounded-lg bg-purple-600 p-2 text-white hover:bg-purple-500 disabled:opacity-40 transition cursor-pointer"
            >
              <Send size={15} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
