// Maps nationality strings (as entered by teachers) to feedback language codes.
// Covers the languages supported in FEEDBACK_LANGUAGES.
const NATIONALITY_TO_LANG: Record<string, string> = {
    // English
    'アメリカ': 'en', 'アメリカ合衆国': 'en', '米国': 'en',
    'イギリス': 'en', 'オーストラリア': 'en', 'カナダ': 'en',
    'ニュージーランド': 'en', 'アイルランド': 'en',
    'America': 'en', 'USA': 'en', 'US': 'en', 'UK': 'en', 'Australia': 'en',

    // Spanish
    'スペイン': 'es', 'メキシコ': 'es', 'アルゼンチン': 'es',
    'コロンビア': 'es', 'チリ': 'es', 'ペルー': 'es', 'ベネズエラ': 'es',
    'エクアドル': 'es', 'ボリビア': 'es', 'パラグアイ': 'es',
    'ウルグアイ': 'es', 'キューバ': 'es',
    'Spain': 'es', 'Mexico': 'es',

    // Portuguese
    'ブラジル': 'pt', 'ポルトガル': 'pt',
    'Brazil': 'pt', 'Portugal': 'pt',

    // Korean
    '韓国': 'ko', '大韓民国': 'ko', '朝鮮': 'ko',
    'Korea': 'ko', 'South Korea': 'ko',

    // Chinese
    '中国': 'zh', '台湾': 'zh', '香港': 'zh',
    'China': 'zh', 'Taiwan': 'zh',

    // French
    'フランス': 'fr', 'ベルギー': 'fr', 'スイス': 'fr',
    'カメルーン': 'fr', 'コートジボワール': 'fr',
    'France': 'fr', 'Belgium': 'fr',
};

export const LANG_CODE_TO_NAME: Record<string, string> = {
    en: 'English', es: 'Español', pt: 'Português',
    ko: '한국어', zh: '中文', fr: 'Français', ja: '日本語',
};

export function nationalityToLangCode(nationality: string | null | undefined): string {
    if (!nationality) return 'en';
    const trimmed = nationality.trim();
    return NATIONALITY_TO_LANG[trimmed] ?? 'en';
}

export function nationalityToLangName(nationality: string | null | undefined): string {
    return LANG_CODE_TO_NAME[nationalityToLangCode(nationality)] ?? 'English';
}
