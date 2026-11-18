// Content filter for name/username validation
// Mirrors the backend content_filter.py logic

const SUBSTRING_PROHIBITED = [
  // Gambling / Betting keywords
  'matka', 'satta', 'sattamatka', 'disawar', 'gambl', 'bookie', 'casino',
  'lottery', 'betting',
  // Adult / NSFW / Vulgar
  'porn', 'porno', 'xxx', 'nude', 'nudes', 'erotic', 'chutiya', 'bhosd',
  'madarchod', 'behenchod', 'bhenchod', 'randi', 'harami', 'kamina',
  'pussy', 'vagina', 'penis', 'choot', 'lund', 'lauda', 'lawda', 'gaand',
  'fuck', 'bitch', 'bastard',
  // Impersonation / System
  'admin', 'administrator', 'moderator', 'dpsara', 'customercare', 'helpdesk',
  'superuser',
];

const WORD_PROHIBITED = [
  'sex', 'sexy', 'adult', 'boobs', 'dick', 'gand', 'chut', 'bc', 'mc',
  'official', 'support', 'root',
];

const LEET_MAP: Record<string, string> = {
  '@': 'a', '4': 'a', '8': 'b', '3': 'e', '1': 'i', '!': 'i',
  '0': 'o', '$': 's', '5': 's', '7': 't', '+': 't',
};

const MASKED_PATTERNS: Array<{ term: string; pattern: RegExp }> = [
  { term: 'matka', pattern: /m[\W_*]*[a4@*]+[\W_*]*t[\W_*]*k[\W_*]*[a4@*]+/i },
  { term: 'satta', pattern: /s[\W_*]*[a4@*]+[\W_*]*t[\W_*]*t+[\W_*]*[a4@*]+/i },
  { term: 'sex',   pattern: /(?:^|[\W_\d])s[\W_*]*[e3*@]+[\W_*]*x(?:y|ual)?(?:$|[\W_\d])/i },
  { term: 'porn',  pattern: /p[\W_*]*[o0*]+[\W_*]*r[\W_*]*n/i },
  { term: 'xxx',   pattern: /x[\W_*]*x[\W_*]*x/i },
  { term: 'fuck',  pattern: /f[\W_*]*[u*]+[\W_*]*c?k/i },
  { term: 'bitch', pattern: /b[\W_*]*[i1!*]+[\W_*]*t[\W_*]*c[\W_*]*h/i },
];

function applyLeet(s: string): string {
  let r = s;
  for (const [k, v] of Object.entries(LEET_MAP)) {
    r = r.split(k).join(v);
  }
  return r;
}

/** Returns the prohibited term if found, or null if clean. */
export function checkRestrictedKeywords(text: string | null | undefined): string | null {
  if (!text) return null;
  const raw = text.trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  const leet = applyLeet(lower);

  // 1. Obfuscated / masked patterns
  for (const { term, pattern } of MASKED_PATTERNS) {
    if (pattern.test(lower) || pattern.test(leet)) return term;
  }

  // 2. Normalize
  const compact = leet.replace(/[^a-z0-9]/g, '');
  const spaced  = leet.replace(/[^a-z0-9]+/g, ' ').trim();
  const tokens  = spaced.split(/\s+/);

  // 3. Substring in compact / lower
  for (const term of SUBSTRING_PROHIBITED) {
    if (compact.includes(term) || lower.includes(term)) return term;
  }

  // 4. Word / boundary check
  for (const term of WORD_PROHIBITED) {
    if (tokens.includes(term)) return term;
    if (new RegExp(`\\b${term}\\b`).test(spaced)) return term;
    if (new RegExp(`(?:^|\\d)${term}(?:\\d|$)`).test(compact)) return term;
    if (term === 'sex' && (compact.includes('sexy') || /sex(?:y|ual)?/.test(compact))) return term;
  }

  return null;
}
