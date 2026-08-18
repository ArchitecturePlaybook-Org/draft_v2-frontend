/**
 * Localization Utility
 * Auto-detects user environment variables for smart defaults.
 */

export function detectUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch (e) {
    return "UTC";
  }
}

export function detectUserUnitSystem(): "metric" | "imperial" {
  try {
    const locale = navigator.language || "en-US";
    // The US, Liberia, and Myanmar use Imperial (US Customary)
    // Though Myanmar and Liberia are transitioning to metric.
    if (locale.includes("en-US")) {
      return "imperial";
    }
    return "metric";
  } catch (e) {
    return "metric";
  }
}

export function detectUserCurrency(): string {
  try {
    const locale = navigator.language || "en-US";
    
    // Simplistic mapping for standard locales
    if (locale.includes("en-US")) return "USD";
    if (locale.includes("en-GB")) return "GBP";
    if (locale.includes("en-IN") || locale.includes("hi-IN")) return "INR";
    if (locale.includes("en-AU")) return "AUD";
    if (locale.includes("en-CA") || locale.includes("fr-CA")) return "CAD";
    if (locale.includes("ja-JP")) return "JPY";
    if (locale.includes("zh-CN")) return "CNY";
    
    // Most of Europe
    if (
      locale.includes("fr-FR") || locale.includes("de-DE") || 
      locale.includes("it-IT") || locale.includes("es-ES") ||
      locale.includes("nl-NL") || locale.includes("pt-PT")
    ) {
      return "EUR";
    }
    
    // Default to INR
    return "INR";
  } catch (e) {
    return "INR";
  }
}
