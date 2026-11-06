import React, { useState, useRef } from 'react';
import {
  Sparkles,
  X,
  Upload,
  RefreshCw,
  Image as ImageIcon,
  Wand2,
  Download,
  Bookmark,
  Check,
  Maximize2,
} from 'lucide-react';
import { Gender, StylePreference } from '../types';
import { useAuth } from '../context/AuthContext';
import { saveGeneratedImageToFirestore } from '../lib/firestoreData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  gender: Gender;
  stylePreference: StylePreference;
  onApplyImageToLook?: (imageUrl: string) => void;
}

export const ImageStudioModal: React.FC<Props> = ({
  isOpen,
  onClose,
  gender,
  stylePreference,
  onApplyImageToLook,
}) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [prompt, setPrompt] = useState('');
  const [editInstruction, setEditInstruction] = useState('');
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultFallbackUrl, setResultFallbackUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedToCloud, setSavedToCloud] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (mode === 'create' && !prompt.trim()) return;
    if (mode === 'edit' && (!baseImage || !editInstruction.trim())) return;

    setIsGenerating(true);
    setSavedToCloud(false);

    try {
      const res = await fetch('/api/agent/image-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          editInstruction: editInstruction.trim(),
          base64Image: baseImage,
          gender,
          stylePreference,
        }),
      });

      const data = await res.json();
      if (data.imageUrl) {
        setResultImage(data.imageUrl);
        if (data.fallbackUrl) {
          setResultFallbackUrl(data.fallbackUrl);
        }

        // Save to Firestore persistence without undefined fields
        if (user) {
          const imgRecord: any = {
            id: 'img_' + Date.now(),
            userId: user.uid,
            prompt: mode === 'create' ? prompt.trim() : editInstruction.trim(),
            imageUrl: data.imageUrl,
            modelUsed: data.modelUsed || 'gemini-nano-banana-2.1',
            createdAt: new Date().toISOString(),
          };
          if (mode === 'edit' && editInstruction.trim()) {
            imgRecord.editInstruction = editInstruction.trim();
          }
          await saveGeneratedImageToFirestore(user.uid, imgRecord);
          setSavedToCloud(true);
        }
      }
    } catch (err) {
      console.error('Image Studio generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBaseImage(String(reader.result));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-purple-500/30 bg-slate-900 text-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-600/30 border border-pink-500/40 text-pink-300">
              <Wand2 size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-bold text-white">Gemini Image Studio</h3>
                <span className="rounded-full bg-pink-500/20 px-2 py-0.5 text-[10px] font-semibold text-pink-300 border border-pink-500/30">
                  gemini-nano-banana-2.1
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Text-prompt outfit generation & bespoke image editing
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

        {/* Studio Mode Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 py-2.5 gap-2">
          <button
            onClick={() => setMode('create')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition cursor-pointer ${
              mode === 'create'
                ? 'bg-purple-600 text-white border border-purple-400 shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Sparkles size={13} />
            <span>Create from Text Prompt</span>
          </button>

          <button
            onClick={() => setMode('edit')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition cursor-pointer ${
              mode === 'edit'
                ? 'bg-purple-600 text-white border border-purple-400 shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ImageIcon size={13} />
            <span>Edit Existing Outfit Image</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {mode === 'create' ? (
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Describe the Pakistani Look you want to create:
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="e.g. Bespoke raw silk emerald green sherwani with gold zardozi embroidery on ban collar, tailored ivory churidar, and handcrafted velvet Peshawari chappals."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder:text-slate-500 focus:border-purple-500 outline-none"
              />
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Royal Midnight Blue Velvet Sherwani with Brass Buttons',
                  'Pastel Peach Kalidar Kurta with Fine Resham Threadwork',
                  'Raw Silk Ivory Kurta Shalwar with Textured Waistcoat',
                  'Bridal Maroon Lehenga with Antique Tilla Gota',
                ].map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(sug)}
                    className="rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 text-[11px] text-slate-300 transition"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Upload Image Slot */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Reference Outfit Image:
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleFileChange}
                  />
                  {baseImage ? (
                    <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-950 h-44 flex items-center justify-center">
                      <img src={baseImage} alt="Reference" className="h-full w-full object-cover" />
                      <button
                        onClick={() => setBaseImage(null)}
                        className="absolute top-2 right-2 rounded-full bg-slate-900/90 p-1 text-slate-300 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/60 p-6 text-slate-400 hover:border-purple-500 hover:text-purple-300 w-full h-44 transition cursor-pointer"
                    >
                      <Upload size={22} />
                      <span className="text-xs font-medium">Upload photo of fabric or outfit</span>
                    </button>
                  )}
                </div>

                {/* Edit Instruction Box */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Edit Instructions:
                  </label>
                  <textarea
                    value={editInstruction}
                    onChange={(e) => setEditInstruction(e.target.value)}
                    rows={5}
                    placeholder="e.g. Change the kurta color from cream to deep royal navy blue, add intricate antique gold thread embroidery along the placket, and swap the trousers for straight-cut trousers."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder:text-slate-500 focus:border-purple-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Trigger */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || (mode === 'create' ? !prompt.trim() : !editInstruction.trim() || !baseImage)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg transition hover:opacity-95 disabled:opacity-40 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Generating with gemini-nano-banana-2.1...</span>
                </>
              ) : (
                <>
                  <Wand2 size={14} />
                  <span>{mode === 'create' ? 'Generate Bespoke Visual' : 'Apply AI Edit'}</span>
                </>
              )}
            </button>
          </div>

          {/* Generated Result Showcase */}
          {resultImage && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Sparkles size={13} />
                  <span>Generated Studio Visual:</span>
                </span>
                {savedToCloud && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                    <Check size={12} />
                    <span>Saved to your Firestore gallery</span>
                  </span>
                )}
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-purple-500/40 bg-slate-950 shadow-2xl">
                <img
                  src={resultImage}
                  alt="Generated look"
                  className="max-h-[380px] w-full object-cover"
                  onError={(e) => {
                    const fallback =
                      resultFallbackUrl ||
                      (gender === 'women' ? '/assets/women_festive.jpg' : '/assets/men_festive.jpg');
                    if (e.currentTarget.src !== fallback) {
                      e.currentTarget.src = fallback;
                    }
                  }}
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/75 p-3 backdrop-blur-sm">
                  <span className="text-xs text-slate-200 truncate max-w-[70%]">
                    {mode === 'create' ? prompt : editInstruction}
                  </span>
                  {onApplyImageToLook && (
                    <button
                      onClick={() => {
                        onApplyImageToLook(resultImage);
                        onClose();
                      }}
                      className="rounded-lg bg-purple-600 px-3 py-1 text-xs font-semibold text-white hover:bg-purple-500 transition cursor-pointer"
                    >
                      Attach to Consultation
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
