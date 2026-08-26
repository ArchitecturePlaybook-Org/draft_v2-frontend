export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  locale: string;
  flagEmoji: string;
}

export const INDIAN_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English (IN)", locale: "en-IN", flagEmoji: "🇬🇧" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", locale: "hi-IN", flagEmoji: "🇮🇳" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", locale: "ta-IN", flagEmoji: "🇮🇳" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", locale: "te-IN", flagEmoji: "🇮🇳" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", locale: "kn-IN", flagEmoji: "🇮🇳" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", locale: "ml-IN", flagEmoji: "🇮🇳" },
  { code: "mr", name: "Marathi", nativeName: "मराठी", locale: "mr-IN", flagEmoji: "🇮🇳" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", locale: "bn-IN", flagEmoji: "🇮🇳" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", locale: "gu-IN", flagEmoji: "🇮🇳" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", locale: "pa-IN", flagEmoji: "🇮🇳" },
  { code: "or", name: "Odia", nativeName: "ଓଡ଼ିଆ", locale: "or-IN", flagEmoji: "🇮🇳" },
];

export const DEFAULT_LANGUAGE: LanguageOption = INDIAN_LANGUAGES[0];

export function getLanguageByCode(code: string): LanguageOption {
  const normalized = (code || "en").toLowerCase().trim();
  return INDIAN_LANGUAGES.find(l => l.code === normalized) || DEFAULT_LANGUAGE;
}
