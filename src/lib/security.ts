/**
 * Security & Sanitization Utilities for PersonaGroom AI
 * Blocks Cross-Site Scripting (XSS), script injections, and protects environment credentials.
 */

export function sanitizeInput(input: string | null | undefined): string {
  if (!input) return '';
  
  // Keep only: remove control characters, trim, and limit length to 1000 characters
  // React already escapes text natively, so no HTML entity escaping is needed
  return String(input)
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, 1000);
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
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
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
