/**
 * AIの利用回数の「枠」（先生1人・直近1時間）で使う、記録名（ai_usage_log.prompt_type）の一覧。
 *
 * 2026-09-13 かずき決定（案A）：各枠は、自分の機能の分だけを数える。
 * 以前は相談・準備・記録の枠（/api/ai・20回）と授業中のヒントの枠（/api/ai/stream・40回）が、
 * ほかの機能の記録（生徒向け翻訳・4つのボタン・絵など）まで合算していた。そのため、
 * 翻訳を使う授業では生徒向け翻訳が40回を超えた時点で授業中のヒントが止まり、
 * 授業の後は準備・記録・相談が20回の枠で止まることがあった（本番の記録で1時間57回に達した先生あり）。
 */
export const AI_USAGE_TYPE = {
    transcribe: 'transcribe',                     // 生徒の声の文字起こし（/api/ai/transcribe・1800回）
    studentTranslation: 'student_translation',    // 生徒向け翻訳（/api/ai の別枠・600回）
    liveAssistant: 'live_assistant',              // 授業中のヒント（/api/ai/stream・40回）
    improvise: 'improvise',                       // 例文・練習問題・やさしく言い換え（/api/materials/improvise・60回）
    illustrate: 'illustrate',                     // 絵で見せる（/api/materials/illustrate・20回）
    knowledgeExtraction: 'knowledge_extraction',  // 記録からの抜き出し（授業記録の保存ごとに1回・枠なし）
} as const;

/** 相談・準備・記録の枠（/api/ai・20回）に入れない記録名。ほかの呼び出し先が自分の枠で数えている分 */
export const OUTSIDE_GENERAL_BUCKET = `(${Object.values(AI_USAGE_TYPE).join(',')})`;
