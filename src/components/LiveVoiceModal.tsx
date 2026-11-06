import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Radio,
  RefreshCw,
} from 'lucide-react';
import { Gender, Language } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  gender: Gender;
  language: Language;
}

interface DialogueTurn {
  id: string;
  sender: 'user' | 'stylist';
  text: string;
  timestamp: string;
}

export const LiveVoiceModal: React.FC<Props> = ({
  isOpen,
  onClose,
  gender,
  language,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dialogue, setDialogue] = useState<DialogueTurn[]>([
    {
      id: 'live_init',
      sender: 'stylist',
      text: 'Assalam-o-Alaikum! PersonaGroom Live voice stylist active. Speak your fashion requirement or occasion.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const turnsEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    turnsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dialogue, isProcessing]);

  // Clean up audio on unmount or close
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const startVoiceTurn = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. You can type in the prompt instead.');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.lang = language === 'ur' ? 'ur-PK' : 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = async (event: any) => {
        const spoken = event.results[0][0].transcript;
        setIsListening(false);
        if (!spoken) return;

        const userTurn: DialogueTurn = {
          id: 'user_' + Date.now(),
          sender: 'user',
          text: spoken,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setDialogue((prev) => [...prev, userTurn]);
        sendToLiveApi(spoken);
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech Recognition error:', err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  const stopVoiceTurn = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  };

  const sendToLiveApi = async (spokenText: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/agent/live-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: spokenText,
          history: dialogue.map((d) => ({
            role: d.sender === 'stylist' ? 'assistant' : 'user',
            text: d.text,
          })),
          gender,
          language,
        }),
      });

      const data = await res.json();
      const stylistTurn: DialogueTurn = {
        id: 'stylist_' + Date.now(),
        sender: 'stylist',
        text: data.transcript || 'Ji, aap ke liye yeh outfit bilkul munasib rahega.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setDialogue((prev) => [...prev, stylistTurn]);

      if (data.audioUrl) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        const audio = new Audio(data.audioUrl);
        audioRef.current = audio;
        setIsPlayingAudio(true);
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => setIsPlayingAudio(false);
        audio.play().catch(() => setIsPlayingAudio(false));
      }
    } catch (err) {
      console.error('Live voice error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-purple-500/30 bg-slate-900 text-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600/30 border border-purple-500/40 text-purple-300">
              <Radio size={18} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-white">PersonaGroom Live</h3>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
                  gemini-3.8-live
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Real-Time Voice Conversations & Live Spoken Stylist
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

        {/* Live Audio Visualizer Canvas Banner */}
        <div className="flex flex-col items-center justify-center py-6 bg-gradient-to-b from-purple-950/40 to-slate-900 border-b border-slate-800">
          <div className="relative flex items-center justify-center mb-3">
            <div
              className={`h-24 w-24 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                isListening
                  ? 'border-pink-500 bg-pink-500/20 shadow-xl shadow-pink-500/30 scale-105'
                  : isPlayingAudio
                  ? 'border-purple-500 bg-purple-500/20 shadow-xl shadow-purple-500/30 scale-105'
                  : 'border-slate-700 bg-slate-800/80'
              }`}
            >
              {isPlayingAudio ? (
                <Volume2 size={36} className="text-purple-400 animate-bounce" />
              ) : isListening ? (
                <Mic size={36} className="text-pink-400 animate-pulse" />
              ) : (
                <Radio size={36} className="text-slate-400" />
              )}
            </div>

            {/* Audio Wave Ring */}
            {(isListening || isPlayingAudio) && (
              <span className="absolute inset-0 rounded-full border border-purple-500/50 animate-ping" />
            )}
          </div>

          <p className="text-xs font-semibold text-slate-200">
            {isListening
              ? 'Listening to your voice...'
              : isPlayingAudio
              ? 'Stylist speaking...'
              : isProcessing
              ? 'Gemini Live processing...'
              : 'Tap microphone below to talk to stylist'}
          </p>
        </div>

        {/* Real-Time Dialogue Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {dialogue.map((turn) => (
            <div
              key={turn.id}
              className={`flex flex-col ${turn.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  turn.sender === 'user'
                    ? 'rounded-br-xs bg-purple-600 text-white'
                    : 'rounded-bl-xs bg-slate-800 border border-slate-700 text-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                  <Sparkles size={11} className="text-purple-400" />
                  <span>{turn.sender === 'user' ? 'You' : 'PersonaGroom Live'}</span>
                  <span className="ml-auto">{turn.timestamp}</span>
                </div>
                <p className="leading-relaxed">{turn.text}</p>
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex items-center gap-2 rounded-xl bg-slate-800/60 p-2.5 text-xs text-slate-400 w-fit">
              <RefreshCw size={13} className="animate-spin text-purple-400" />
              <span>Synthesizing live response...</span>
            </div>
          )}

          <div ref={turnsEndRef} />
        </div>

        {/* Mic Control Bar */}
        <div className="flex items-center justify-center border-t border-slate-800 bg-slate-950 p-4">
          <button
            onClick={isListening ? stopVoiceTurn : startVoiceTurn}
            disabled={isProcessing}
            className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold shadow-xl transition-all duration-200 cursor-pointer ${
              isListening
                ? 'bg-rose-600 hover:bg-rose-500 text-white scale-105'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 text-white'
            }`}
          >
            {isListening ? (
              <>
                <MicOff size={18} />
                <span>Stop Listening</span>
              </>
            ) : (
              <>
                <Mic size={18} />
                <span>Start Talking</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
