import { ja } from './ja';
import { en } from './en';
import { zh } from './zh';
import { es } from './es';
import { fr } from './fr';
import { ko } from './ko';
import { pt } from './pt';

export type Locale = 'ja' | 'en' | 'zh' | 'es' | 'fr' | 'ko' | 'pt';
export type Translations = typeof ja;

export const locales: Record<Locale, { flag: string; name: string }> = {
    ja: { flag: '🇯🇵', name: '日本語' },
    en: { flag: '🇬🇧', name: 'English' },
    zh: { flag: '🇨🇳', name: '中文' },
    es: { flag: '🇪🇸', name: 'Español' },
    fr: { flag: '🇫🇷', name: 'Français' },
    ko: { flag: '🇰🇷', name: '한국어' },
    pt: { flag: '🇧🇷', name: 'Português' },
};

const translations: Record<Locale, Translations> = { ja, en, zh, es, fr, ko, pt };

export function getTranslations(locale: Locale): Translations {
    return translations[locale] || translations.ja;
}

export function detectLocale(): Locale {
    if (typeof navigator === 'undefined') return 'ja';
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith('ja')) return 'ja';
    if (lang.startsWith('ko')) return 'ko';
    if (lang.startsWith('zh')) return 'zh';
    if (lang.startsWith('es')) return 'es';
    if (lang.startsWith('fr')) return 'fr';
    if (lang.startsWith('pt')) return 'pt';
    if (lang.startsWith('en')) return 'en';
    return 'en'; // デフォルトは英語（外国人向けツールなので）
}
