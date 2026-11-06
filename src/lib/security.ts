/**
 * Security & Sanitization Utilities for PersonaGroom AI
 * Blocks Cross-Site Scripting (XSS), script injections, and protects environment credentials.
 */

export function sanitizeInput(input: string | null | undefined): string {
  if (!input) return '';
  
  // Strip control characters & null bytes
  let clean = String(input).replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '');

  // Strip script tags and event handlers
  clean = clean
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '');

  // Escape basic HTML sensitive delimiters to prevent injection
  clean = clean
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  return clean.trim();
}

/**
 * Decodes sanitized text safely for display inside React text nodes without executing HTML
 */
export function unescapeForDisplay(input: string | null | undefined): string {
  if (!input) return '';
  return String(input)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
}

/**
 * Safely reads environment variables without ever logging secrets to console
 */
export function safeGetEnv(key: string, fallback: string = ''): string {
  try {
    // Read from Vite import.meta.env
    const val = (import.meta as any).env?.[key];
    if (typeof val === 'string' && val.trim()) {
      return val.trim();
    }
  } catch {
    // ignore
  }
  return fallback;
}
