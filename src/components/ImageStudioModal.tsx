import React, { useState, useRef } from 'react';
import {
  Sparkles,
  X,
  Upload,
  RefreshCw,
  Image as ImageIcon,
  Wand2,
  Download,
  Check,
  AlertCircle,
  Eye,
  RotateCcw,
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

// ==========================================
// Color Mapping & Parsing (Tab 1 & Tab 2)
// ==========================================
interface ColorRule {
  regex: RegExp;
  hex: string;
  name: string;
  hue: number;
  sat: number;
  isMonochrome?: 'black' | 'white';
}

const COLOR_RULES: ColorRule[] = [
  { regex: /\b(midnight blue|royal blue|navy)\b/i, hex: '#1e3a8a', name: 'Navy', hue: 222, sat: 0.78 },
  { regex: /\bblue\b/i, hex: '#2563eb', name: 'Blue', hue: 217, sat: 0.85 },
  { regex: /\b(emerald|green)\b/i, hex: '#047857', name: 'Green', hue: 163, sat: 0.90 },
  { regex: /\bmaroon\b/i, hex: '#7f1d1d', name: 'Maroon', hue: 0, sat: 0.63 },
  { regex: /\b(red|ruby)\b/i, hex: '#b91c1c', name: 'Red', hue: 0, sat: 0.75 },
  { regex: /\b(pink|peach)\b/i, hex: '#f9a8c9', name: 'Pink', hue: 336, sat: 0.85 },
  { regex: /\b(ivory|white|cream)\b/i, hex: '#f8fafc', name: 'Ivory', hue: 210, sat: 0.05, isMonochrome: 'white' },
  { regex: /\bblack\b/i, hex: '#111827', name: 'Black', hue: 0, sat: 0.05, isMonochrome: 'black' },
  { regex: /\b(grey|gray)\b/i, hex: '#6b7280', name: 'Grey', hue: 215, sat: 0.10 },
  { regex: /\b(mustard|gold)\b/i, hex: '#d4af37', name: 'Gold', hue: 46, sat: 0.70 },
  { regex: /\bpurple\b/i, hex: '#6d28d9', name: 'Purple', hue: 263, sat: 0.70 },
];

// Roman Urdu + additional words for Tab 2 photo recoloring
const RECOLOR_TARGETS: Array<{ regex: RegExp; hue: number; sat: number; isMonochrome?: 'black' | 'white' }> = [
  { regex: /\b(midnight blue|royal blue|navy|neela|blue|asmani)\b/i, hue: 220, sat: 0.78 },
  { regex: /\b(emerald|green|hara|sabz)\b/i, hue: 160, sat: 0.85 },
  { regex: /\bmaroon\b/i, hue: 350, sat: 0.65 },
  { regex: /\b(red|ruby|laal|surkh)\b/i, hue: 355, sat: 0.82 },
  { regex: /\b(pink|peach|gulabi)\b/i, hue: 335, sat: 0.82 },
  { regex: /\b(ivory|white|cream|safed|chitta)\b/i, hue: 210, sat: 0.05, isMonochrome: 'white' },
  { regex: /\b(black|kala|kaala|siyah)\b/i, hue: 0, sat: 0.05, isMonochrome: 'black' },
  { regex: /\b(grey|gray|surmai)\b/i, hue: 215, sat: 0.10 },
  { regex: /\b(mustard|gold|peela|zard|yellow)\b/i, hue: 45, sat: 0.80 },
  { regex: /\b(purple|jamni|violet)\b/i, hue: 265, sat: 0.72 },
];

function extractPromptColors(text: string): { mainColor: string; bottomColor: string } {
  const matches: Array<{ index: number; hex: string }> = [];

  for (const rule of COLOR_RULES) {
    const m = rule.regex.exec(text);
    if (m && m.index !== undefined) {
      matches.push({ index: m.index, hex: rule.hex });
    }
  }

  // Sort matches in the order they appear in the user prompt
  matches.sort((a, b) => a.index - b.index);

  // First color = main garment, second color (if any) = bottom, trim = gold. Teal default only when no color word exists.
  const mainColor = matches.length > 0 ? matches[0].hex : '#0f766e';
  const bottomColor = matches.length > 1 ? matches[1].hex : '#f8fafc';

  return { mainColor, bottomColor };
}

// ==========================================
// TAB 1: Procedural SVG Generator
// ==========================================
function generateBespokeOutfitSvg(
  prompt: string,
  gender: Gender
): string {
  const lower = prompt.toLowerCase();
  const { mainColor, bottomColor } = extractPromptColors(lower);
  const trimGold = '#d4af37';
  const isVelvet = lower.includes('velvet');

  // Silhouette detection:
  // "sherwani" / "coat"
  // "kurta"
  // "lehenga" / "anarkali" / "gown" / "sharara" / "frock"
  let silhouette: 'sherwani' | 'kurta' | 'lehenga' = 'sherwani';

  if (
    lower.includes('lehenga') ||
    lower.includes('anarkali') ||
    lower.includes('gown') ||
    lower.includes('sharara') ||
    lower.includes('frock') ||
    (gender === 'women' && !lower.includes('sherwani') && !lower.includes('kurta'))
  ) {
    silhouette = 'lehenga';
  } else if (lower.includes('kurta') || lower.includes('shalwar')) {
    silhouette = 'kurta';
  } else {
    silhouette = 'sherwani';
  }

  // Common SVG definitions
  const defs = `
    <defs>
      <radialGradient id="pgBgGrad" cx="50%" cy="35%" r="70%">
        <stop offset="0%" stop-color="#1e2238" />
        <stop offset="65%" stop-color="#0b0f19" />
        <stop offset="100%" stop-color="#04060a" />
      </radialGradient>
      <linearGradient id="pgGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fef08a" />
        <stop offset="40%" stop-color="#d4af37" />
        <stop offset="80%" stop-color="#996515" />
        <stop offset="100%" stop-color="#fef08a" />
      </linearGradient>
      <linearGradient id="pgVelvet" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22" />
        <stop offset="35%" stop-color="#ffffff" stop-opacity="0.0" />
        <stop offset="70%" stop-color="#ffffff" stop-opacity="0.28" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.0" />
      </linearGradient>
      <filter id="pgShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.65" />
      </filter>
    </defs>
  `;

  let garmentContent = '';

  if (silhouette === 'sherwani') {
    // 1) Sherwani / Coat:
    // - Long sleeves to the wrists
    // - Knee-length slim coat
    // - Mandarin collar
    // - Gold buttons
    // - Ivory churidar
    garmentContent = `
      <!-- Stand / Neck -->
      <path d="M 270 120 L 330 120 L 325 150 L 275 150 Z" fill="#2d3748" />

      <!-- Mandarin / Ban Collar -->
      <path d="M 264 142 Q 300 135 336 142 L 336 162 Q 300 155 264 162 Z" fill="${mainColor}" stroke="url(#pgGold)" stroke-width="2.5" />

      <!-- Ivory Churidar (Bottom) -->
      <!-- Left leg -->
      <path d="M 252 510 L 246 705 L 278 705 L 290 510 Z" fill="${bottomColor}" />
      <!-- Right leg -->
      <path d="M 310 510 L 322 705 L 354 705 L 348 510 Z" fill="${bottomColor}" />
      <!-- Churidar gather creases at ankles -->
      <path d="M 246 660 Q 262 663 278 660 M 246 675 Q 262 678 278 675 M 246 690 Q 262 693 278 690" stroke="#cbd5e1" stroke-width="1.5" fill="none" opacity="0.8" />
      <path d="M 322 660 Q 338 663 354 660 M 322 675 Q 338 678 354 675 M 322 690 Q 338 693 354 690" stroke="#cbd5e1" stroke-width="1.5" fill="none" opacity="0.8" />

      <!-- Footwear (Khussa) -->
      <ellipse cx="262" cy="718" rx="20" ry="8" fill="#1e293b" stroke="url(#pgGold)" stroke-width="1.5" />
      <ellipse cx="338" cy="718" rx="20" ry="8" fill="#1e293b" stroke="url(#pgGold)" stroke-width="1.5" />

      <!-- Left Long Sleeve (to wrist) -->
      <path d="M 215 170 L 160 300 L 165 475 L 195 475 L 230 310 L 245 220 Z" fill="${mainColor}" filter="url(#pgShadow)" />
      <rect x="165" y="468" width="30" height="7" rx="2" fill="url(#pgGold)" />

      <!-- Right Long Sleeve (to wrist) -->
      <path d="M 385 170 L 440 300 L 435 475 L 405 475 L 370 310 L 355 220 Z" fill="${mainColor}" filter="url(#pgShadow)" />
      <rect x="405" y="468" width="30" height="7" rx="2" fill="url(#pgGold)" />

      <!-- Slim Knee-Length Sherwani Torso -->
      <path d="M 220 162 L 264 162 Q 300 168 336 162 L 380 162 L 395 320 L 410 520 L 190 520 L 205 320 Z" fill="${mainColor}" filter="url(#pgShadow)" />

      ${isVelvet ? `<path d="M 220 162 L 264 162 Q 300 168 336 162 L 380 162 L 395 320 L 410 520 L 190 520 L 205 320 Z" fill="url(#pgVelvet)" />` : ''}

      <!-- Center Front Placket -->
      <line x1="300" y1="162" x2="300" y2="520" stroke="url(#pgGold)" stroke-width="3" />

      <!-- Gold Buttons along placket -->
      <circle cx="300" cy="190" r="4.5" fill="url(#pgGold)" />
      <circle cx="300" cy="225" r="4.5" fill="url(#pgGold)" />
      <circle cx="300" cy="260" r="4.5" fill="url(#pgGold)" />
      <circle cx="300" cy="295" r="4.5" fill="url(#pgGold)" />
      <circle cx="300" cy="330" r="4.5" fill="url(#pgGold)" />
      <circle cx="300" cy="365" r="4.5" fill="url(#pgGold)" />
      <circle cx="300" cy="400" r="4.5" fill="url(#pgGold)" />
      <circle cx="300" cy="435" r="4.5" fill="url(#pgGold)" />

      <!-- Chest Pocket with Gold Trim -->
      <path d="M 240 230 L 275 230 L 275 234 L 240 234 Z" fill="url(#pgGold)" />
      <path d="M 246 226 L 254 218 L 262 226 Z" fill="#ffffff" opacity="0.9" />

      <!-- Hem Gold Border -->
      <path d="M 190 514 L 410 514 L 410 520 L 190 520 Z" fill="url(#pgGold)" />
    `;
  } else if (silhouette === 'kurta') {
    // 2) Kurta:
    // - Long sleeves to wrists
    // - Straight kurta to the knee
    // - Shalwar
    garmentContent = `
      <!-- Neck / Collar -->
      <path d="M 270 120 L 330 120 L 325 150 L 275 150 Z" fill="#2d3748" />
      <path d="M 262 142 Q 300 135 338 142 L 338 162 Q 300 156 262 162 Z" fill="${mainColor}" stroke="url(#pgGold)" stroke-width="2" />

      <!-- Shalwar (Bottom) -->
      <path d="M 230 490 Q 200 600 240 705 L 280 705 Q 295 620 295 490 Z" fill="${bottomColor}" />
      <path d="M 370 490 Q 400 600 360 705 L 320 705 Q 305 620 305 490 Z" fill="${bottomColor}" />
      <!-- Shalwar Folds -->
      <path d="M 238 650 Q 255 660 270 650 M 330 650 Q 345 660 362 650" stroke="#cbd5e1" stroke-width="1.5" fill="none" opacity="0.7" />

      <!-- Footwear (Peshawari Chappal) -->
      <ellipse cx="260" cy="718" rx="22" ry="7" fill="#1e293b" stroke="url(#pgGold)" stroke-width="1.2" />
      <ellipse cx="340" cy="718" rx="22" ry="7" fill="#1e293b" stroke="url(#pgGold)" stroke-width="1.2" />

      <!-- Left Long Sleeve to wrist -->
      <path d="M 210 170 L 155 310 L 160 470 L 192 470 L 225 320 L 240 210 Z" fill="${mainColor}" filter="url(#pgShadow)" />
      <rect x="160" y="464" width="32" height="6" rx="2" fill="url(#pgGold)" />

      <!-- Right Long Sleeve to wrist -->
      <path d="M 390 170 L 445 310 L 440 470 L 408 470 L 375 320 L 360 210 Z" fill="${mainColor}" filter="url(#pgShadow)" />
      <rect x="408" y="464" width="32" height="6" rx="2" fill="url(#pgGold)" />

      <!-- Straight Cut Kurta Body -->
      <path d="M 215 162 L 262 162 Q 300 166 338 162 L 385 162 L 395 330 L 405 500 L 365 500 L 365 370 L 235 370 L 235 500 L 195 500 L 205 330 Z" fill="${mainColor}" filter="url(#pgShadow)" />

      ${isVelvet ? `<path d="M 215 162 L 262 162 Q 300 166 338 162 L 385 162 L 395 330 L 405 500 L 365 500 L 365 370 L 235 370 L 235 500 L 195 500 L 205 330 Z" fill="url(#pgVelvet)" />` : ''}

      <!-- Embroidered Ban & Placket -->
      <path d="M 292 162 L 308 162 L 308 300 L 292 300 Z" fill="${mainColor}" stroke="url(#pgGold)" stroke-width="2" />
      <circle cx="300" cy="185" r="3.5" fill="url(#pgGold)" />
      <circle cx="300" cy="215" r="3.5" fill="url(#pgGold)" />
      <circle cx="300" cy="245" r="3.5" fill="url(#pgGold)" />
      <circle cx="300" cy="275" r="3.5" fill="url(#pgGold)" />

      <!-- Kurta Chaak (Side Slits) Trim -->
      <line x1="235" y1="370" x2="235" y2="500" stroke="url(#pgGold)" stroke-width="1.5" />
      <line x1="365" y1="370" x2="365" y2="500" stroke="url(#pgGold)" stroke-width="1.5" />
      <line x1="235" y1="500" x2="365" y2="500" stroke="url(#pgGold)" stroke-width="2.5" />
    `;
  } else {
    // 3) Lehenga / Anarkali / Gown:
    // - Fitted bodice with long flared skirt
    // - Long fitted sleeves to wrists
    // - Rich flared kalidar ghera
    // - Gold border trim
    garmentContent = `
      <!-- Neckline -->
      <path d="M 260 130 Q 300 165 340 130 Z" fill="#2d3748" />

      <!-- Flared Kalidar Skirt (Lehenga Ghera) -->
      <path d="M 240 290 L 360 290 L 460 670 L 140 670 Z" fill="${bottomColor}" filter="url(#pgShadow)" />
      <!-- Kali Panel Accents -->
      <line x1="260" y1="290" x2="190" y2="670" stroke="#cbd5e1" stroke-width="1" opacity="0.6" />
      <line x1="280" y1="290" x2="250" y2="670" stroke="#cbd5e1" stroke-width="1" opacity="0.6" />
      <line x1="300" y1="290" x2="300" y2="670" stroke="#cbd5e1" stroke-width="1" opacity="0.6" />
      <line x1="320" y1="290" x2="350" y2="670" stroke="#cbd5e1" stroke-width="1" opacity="0.6" />
      <line x1="340" y1="290" x2="410" y2="670" stroke="#cbd5e1" stroke-width="1" opacity="0.6" />

      <!-- Broad Gold Gota / Zardozi Border at Skirt Hem -->
      <path d="M 140 648 L 460 648 L 460 670 L 140 670 Z" fill="url(#pgGold)" />
      <line x1="140" y1="638" x2="460" y2="638" stroke="url(#pgGold)" stroke-width="2" />

      <!-- Footwear -->
      <ellipse cx="270" cy="690" rx="14" ry="5" fill="#1e293b" stroke="url(#pgGold)" stroke-width="1.2" />
      <ellipse cx="330" cy="690" rx="14" ry="5" fill="#1e293b" stroke="url(#pgGold)" stroke-width="1.2" />

      <!-- Left Long Sleeve to wrist -->
      <path d="M 225 155 L 165 280 L 175 465 L 202 465 L 235 295 L 248 190 Z" fill="${mainColor}" filter="url(#pgShadow)" />
      <rect x="175" y="458" width="27" height="7" rx="2" fill="url(#pgGold)" />

      <!-- Right Long Sleeve to wrist -->
      <path d="M 375 155 L 435 280 L 425 465 L 398 465 L 365 295 L 352 190 Z" fill="${mainColor}" filter="url(#pgShadow)" />
      <rect x="398" y="458" width="27" height="7" rx="2" fill="url(#pgGold)" />

      <!-- Fitted Bodice / Choli -->
      <path d="M 225 155 Q 300 178 375 155 L 360 290 L 240 290 Z" fill="${mainColor}" filter="url(#pgShadow)" />

      ${isVelvet ? `<path d="M 225 155 Q 300 178 375 155 L 360 290 L 240 290 Z" fill="url(#pgVelvet)" />` : ''}

      <!-- Neckline Gold Border -->
      <path d="M 245 150 Q 300 188 355 150" stroke="url(#pgGold)" stroke-width="4" fill="none" />
      <!-- Waistband Gold Border -->
      <path d="M 240 286 L 360 286 L 360 294 L 240 294 Z" fill="url(#pgGold)" />

      <!-- Sheer Dupatta Drape Across Shoulder -->
      <path d="M 220 150 Q 275 220 285 360 L 240 360 Q 230 220 200 150 Z" fill="url(#pgGold)" opacity="0.35" />
      <path d="M 220 150 Q 275 220 285 360" stroke="url(#pgGold)" stroke-width="2" fill="none" />
    `;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 760" width="100%" height="100%">
      ${defs}
      <rect width="600" height="760" fill="url(#pgBgGrad)" />

      <!-- Subtle Atelier Grid Ambient -->
      <circle cx="300" cy="300" r="240" fill="none" stroke="#334155" stroke-width="0.5" opacity="0.25" />
      <circle cx="300" cy="300" r="180" fill="none" stroke="#334155" stroke-width="0.5" opacity="0.25" />

      ${garmentContent}

      <!-- Aesthetic Watermark / Label -->
      <text x="300" y="742" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="11" letter-spacing="2">
        PERSONAGROOM ATELIER • STYLE PREVIEW (FREE MODE)
      </text>
    </svg>
  `;

  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.trim());
}

// ==========================================
// TAB 2: In-Browser Canvas Recolor Engine
// ==========================================
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return [h, s, l];
}

function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    h = ((h % 360) + 360) % 360;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h / 360 + 1 / 3);
    g = hue2rgb(p, q, h / 360);
    b = hue2rgb(p, q, h / 360 - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

async function recolorOutfitPhotoOnCanvas(
  base64Image: string,
  targetRule: { hue: number; sat: number; isMonochrome?: 'black' | 'white' }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        // Constrain max size for swift responsiveness
        const maxDim = 1200;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // 1) Sample 4 corner pixels for background detection
        const cornerSamples: Array<[number, number, number]> = [];
        const samplePixel = (x: number, y: number) => {
          const idx = (y * w + x) * 4;
          return [data[idx], data[idx + 1], data[idx + 2]] as [number, number, number];
        };
        cornerSamples.push(samplePixel(2, 2));
        cornerSamples.push(samplePixel(Math.max(0, w - 3), 2));
        cornerSamples.push(samplePixel(2, Math.max(0, h - 3)));
        cornerSamples.push(samplePixel(Math.max(0, w - 3), Math.max(0, h - 3)));

        const isBgPixel = (r: number, g: number, b: number) => {
          for (const [cr, cg, cb] of cornerSamples) {
            const dist = Math.hypot(r - cr, g - cg, b - cb);
            if (dist < 38) return true;
          }
          return false;
        };

        // 2) Find dominant hue among non-background pixels
        // (ignoring near-white lit > 0.88, near-black lit < 0.12, low saturation sat < 0.15)
        const hueBins = new Float32Array(36);
        for (let y = 0; y < h; y += 3) {
          for (let x = 0; x < w; x += 3) {
            const idx = (y * w + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];
            if (a < 50 || isBgPixel(r, g, b)) continue;

            const [hue, sat, lit] = rgbToHsl(r, g, b);
            if (lit > 0.88 || lit < 0.12 || sat < 0.15) continue;

            const bin = Math.floor(hue / 10) % 36;
            hueBins[bin]++;
          }
        }

        let maxBin = 0;
        let maxCount = 0;
        for (let i = 0; i < 36; i++) {
          if (hueBins[i] > maxCount) {
            maxCount = hueBins[i];
            maxBin = i;
          }
        }
        const dominantHue = maxBin * 10 + 5;

        // 3) Rotate hue within ~40° hue distance, keeping lightness and texture
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 50 || isBgPixel(r, g, b)) continue;

          const [hue, sat, lit] = rgbToHsl(r, g, b);

          let hueDiff = Math.abs(hue - dominantHue);
          if (hueDiff > 180) hueDiff = 360 - hueDiff;

          if (hueDiff <= 40) {
            let newHue = targetRule.hue;
            let newSat = targetRule.sat;
            let newLit = lit;

            if (targetRule.isMonochrome === 'black') {
              newSat = 0.05;
              newLit = lit * 0.35;
            } else if (targetRule.isMonochrome === 'white') {
              newSat = 0.05;
              newLit = 0.5 + lit * 0.45;
            }

            const [nr, ng, nb] = hslToRgb(newHue, newSat, newLit);
            data[i] = nr;
            data[i + 1] = ng;
            data[i + 2] = nb;
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image on canvas'));
    img.src = base64Image;
  });
}

// ==========================================
// Main Component
// ==========================================
export const ImageStudioModal: React.FC<Props> = ({
  isOpen,
  onClose,
  gender,
  onApplyImageToLook,
}) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [prompt, setPrompt] = useState('');
  const [editInstruction, setEditInstruction] = useState('');
  const [baseImage, setBaseImage] = useState<string | null>(null);

  const [resultImage, setResultImage] = useState<string | null>(null);
  const [beforeAfterMode, setBeforeAfterMode] = useState<'after' | 'before'>('after');
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedToCloud, setSavedToCloud] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleTabChange = (newMode: 'create' | 'edit') => {
    setMode(newMode);
    setResultImage(null);
    setErrorMessage(null);
    setNoticeMessage(null);
    setSavedToCloud(false);
  };

  const handleGenerate = async () => {
    setErrorMessage(null);
    setNoticeMessage(null);
    setResultImage(null);
    setSavedToCloud(false);
    setIsGenerating(true);

    try {
      if (mode === 'create') {
        if (!prompt.trim()) {
          setErrorMessage('Please enter a description for your look.');
          setIsGenerating(false);
          return;
        }

        // Local Procedural SVG Generation (Free Mode, No Paid API, No Pollinations)
        const svgUrl = generateBespokeOutfitSvg(prompt.trim(), gender);
        setResultImage(svgUrl);

        // Save to Firestore gallery with tag 'preview'
        if (user) {
          try {
            await saveGeneratedImageToFirestore(user.uid, {
              id: 'img_' + Date.now(),
              userId: user.uid,
              prompt: prompt.trim(),
              imageUrl: svgUrl,
              modelUsed: 'preview',
              createdAt: new Date().toISOString(),
            });
            setSavedToCloud(true);
          } catch (saveErr) {
            console.warn('Could not save preview to gallery:', saveErr);
          }
        }
      } else {
        // Tab 2: Edit Existing Outfit Image
        if (!baseImage) {
          setErrorMessage('Please upload a reference outfit photo first.');
          setIsGenerating(false);
          return;
        }
        if (!editInstruction.trim()) {
          setErrorMessage('Please write your edit instruction.');
          setIsGenerating(false);
          return;
        }

        const lowerInstr = editInstruction.toLowerCase();

        // Check if instruction is a non-color edit (e.g. embroidery, changing cut/pattern)
        const nonColorKeywords = [
          'embroidery',
          'zardozi',
          'tilla',
          'cut',
          'pattern',
          'lace',
          'gota',
          'design',
          'style',
          'collar',
          'pocket',
          'fabric',
          'darzi',
        ];
        const hasNonColorKeyword = nonColorKeywords.some((kw) => lowerInstr.includes(kw));

        // Find target color
        let matchedTarget: { hue: number; sat: number; isMonochrome?: 'black' | 'white' } | null = null;
        for (const target of RECOLOR_TARGETS) {
          if (target.regex.test(lowerInstr)) {
            matchedTarget = target;
            break;
          }
        }

        if (!matchedTarget || hasNonColorKeyword) {
          setNoticeMessage('Free mode only supports colour change. Design edits need a paid image API.');
          setIsGenerating(false);
          return;
        }

        // Execute in-browser canvas recolor
        const editedPng = await recolorOutfitPhotoOnCanvas(baseImage, matchedTarget);
        setResultImage(editedPng);
        setBeforeAfterMode('after');

        // Save to Firestore gallery with tag 'preview'
        if (user) {
          try {
            await saveGeneratedImageToFirestore(user.uid, {
              id: 'img_' + Date.now(),
              userId: user.uid,
              prompt: 'Edited outfit photo',
              editInstruction: editInstruction.trim(),
              imageUrl: editedPng,
              modelUsed: 'preview',
              createdAt: new Date().toISOString(),
            });
            setSavedToCloud(true);
          } catch (saveErr) {
            console.warn('Could not save edited image to gallery:', saveErr);
          }
        }
      }
    } catch (err: any) {
      console.error('Image Studio operation failed:', err);
      setErrorMessage(err?.message || 'Operation failed. Please try again.');
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
      setResultImage(null);
      setErrorMessage(null);
      setNoticeMessage(null);
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600/30 border border-purple-500/40 text-purple-300">
              <Wand2 size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-bold text-white">Image Studio</h3>
                <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-purple-300 border border-purple-500/30">
                  {mode === 'create' ? 'Style preview (free mode)' : 'Free colour editor'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {mode === 'create'
                  ? 'Procedural Pakistani silhouette preview & bespoke color parsing'
                  : 'Fast client-side fabric recoloring for your uploaded look'}
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
            onClick={() => handleTabChange('create')}
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
            onClick={() => handleTabChange('edit')}
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
                Describe the Pakistani Look you want to preview:
              </label>
              <textarea
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  setErrorMessage(null);
                }}
                rows={3}
                placeholder="e.g. Royal midnight blue velvet sherwani with ivory churidar, gold buttons, and mandarin collar."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder:text-slate-500 focus:border-purple-500 outline-none"
              />
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Royal Midnight Blue Velvet Sherwani with Gold Buttons and Ivory Churidar',
                  'Emerald Green Raw Silk Kurta with Shalwar and Gold Tilla Trim',
                  'Maroon Bridal Lehenga with Gold Flared Kalis and Antique Gota',
                  'Ruby Red Sherwani with Gold Placket',
                ].map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setPrompt(sug);
                      setErrorMessage(null);
                    }}
                    className="rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 text-[11px] text-slate-300 transition cursor-pointer"
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
                    Reference Outfit Photo:
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
                      <img src={baseImage} alt="Reference" className="h-full w-full object-contain" />
                      <button
                        onClick={() => {
                          setBaseImage(null);
                          setResultImage(null);
                        }}
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
                      <span className="text-xs font-medium">Upload photo of outfit</span>
                    </button>
                  )}
                </div>

                {/* Edit Instruction Box */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Recolor Instruction:
                  </label>
                  <textarea
                    value={editInstruction}
                    onChange={(e) => {
                      setEditInstruction(e.target.value);
                      setErrorMessage(null);
                      setNoticeMessage(null);
                    }}
                    rows={5}
                    placeholder="e.g. Change color to royal blue, or 'is kurta ko neela kardo', 'make coat maroon', 'recolor to emerald green'."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder:text-slate-500 focus:border-purple-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Error Message Banner */}
          {errorMessage && (
            <div className="flex items-center justify-between rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-200">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={handleGenerate}
                className="flex items-center gap-1 rounded bg-red-800/60 hover:bg-red-700 px-2.5 py-1 text-[11px] font-semibold text-white transition cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Friendly Non-Color Edit Notice */}
          {noticeMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/40 p-3 text-xs text-amber-200">
              <AlertCircle size={16} className="text-amber-400 shrink-0" />
              <span>{noticeMessage}</span>
            </div>
          )}

          {/* Action Trigger */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400">
              {mode === 'create'
                ? 'Free instant procedural preview with custom colors & cuts'
                : 'Free client-side hue rotation preserving original fabric texture'}
            </span>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || (mode === 'create' ? !prompt.trim() : !editInstruction.trim() || !baseImage)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg transition hover:opacity-95 disabled:opacity-40 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>{mode === 'create' ? 'Generating preview...' : 'Recoloring fabric...'}</span>
                </>
              ) : (
                <>
                  <Wand2 size={14} />
                  <span>{mode === 'create' ? 'Generate Style Preview' : 'Apply Color Change'}</span>
                </>
              )}
            </button>
          </div>

          {/* Generated Result Showcase */}
          {resultImage && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Sparkles size={13} />
                  <span>{mode === 'create' ? 'Style Preview (Free Mode):' : 'Recolored Outfit:'}</span>
                </span>
                <div className="flex items-center gap-3">
                  {savedToCloud && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                      <Check size={12} />
                      <span>Saved to gallery (preview)</span>
                    </span>
                  )}

                  {/* Tab 2: Before / After Toggle */}
                  {mode === 'edit' && baseImage && (
                    <div className="flex items-center rounded-lg border border-slate-700 bg-slate-950 p-0.5 text-[11px]">
                      <button
                        onClick={() => setBeforeAfterMode('before')}
                        className={`px-2.5 py-1 rounded cursor-pointer transition ${
                          beforeAfterMode === 'before' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Before
                      </button>
                      <button
                        onClick={() => setBeforeAfterMode('after')}
                        className={`px-2.5 py-1 rounded cursor-pointer transition ${
                          beforeAfterMode === 'after' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        After
                      </button>
                    </div>
                  )}

                  {/* Download Button */}
                  <a
                    href={mode === 'edit' && beforeAfterMode === 'before' ? baseImage! : resultImage}
                    download={mode === 'create' ? 'personagroom-style-preview.svg' : 'personagroom-recolored.png'}
                    className="flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 text-xs text-slate-200 transition"
                  >
                    <Download size={12} />
                    <span>Download</span>
                  </a>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-purple-500/40 bg-slate-950 shadow-2xl flex items-center justify-center p-2 min-h-[300px]">
                <img
                  src={mode === 'edit' && beforeAfterMode === 'before' ? baseImage! : resultImage}
                  alt={mode === 'create' ? 'Style preview' : 'Recolored look'}
                  className="max-h-[400px] w-auto max-w-full object-contain rounded-xl"
                />

                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/80 p-3 backdrop-blur-sm">
                  <span className="text-xs text-slate-200 truncate max-w-[70%]">
                    {mode === 'create' ? prompt : editInstruction}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleGenerate}
                      className="flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 text-xs text-slate-200 transition cursor-pointer"
                    >
                      <RotateCcw size={12} />
                      <span>Retry</span>
                    </button>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
