'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Loader2, Mail } from 'lucide-react';
import {
    PLAN_TIERS, PLAN_TIER_KEYS, tierPriceLabel, tierPerLessonLabel, ALL_TIER_PRICES_SET,
    TRIAL_DAYS, TRIAL_TRANSLATION_MINUTES, PACK_SENTENCE, PACK_PRICE_JPY, PACK_PRICE_LABEL, PACK_MINUTES, PACK_VALID_DAYS,
    BUSINESS_CONTACT_EMAIL, type PlanTier,
} from '@/lib/pricing';

// useSearchParams を使うため静的プリレンダリングを無効化
export const dynamic = 'force-dynamic';

/**
 * 料金の画面（2026-09-24 かずき「料金ページをASTAに入れて」）。
 * 構成は ChatGPT の料金ページと同じ：見出し → プランのカード3枚 → 40人超の問い合わせ → 比べる表 → よくある質問 → 注釈。
 * 3段とも機能は同じで、差は翻訳モードの月の分数だけ（案B・2026-09-23）。金額は環境変数（lib/pricing.ts）。
 * 元の案＝my-company/03/strategy/料金プラン比較ページ案_2026-09-24.html
 */

const CARD_FEATURES: Record<PlanTier, string[]> = {
    light: [
        '生徒の管理・授業の記録（生徒の数に上限なし）',
        '体験レッスンの判定と学習計画の自動作成',
        'ライブ授業のヒント・例文・練習問題・言い換え',
        '先生の言葉の訳（11言語）・記録の自動下書き',
    ],
    regular: ['ライトの全部', '翻訳モードがライトの2倍', '2〜3か月目に生徒が20人まで増えても足りる'],
    pro: ['レギュラーの全部', '翻訳モードがライトの4倍', '授業1回あたりの金額がいちばん安い'],
};
const CARD_WHO: Record<PlanTier, string> = {
    light: '生徒が10人くらいまで。まず始めたい先生に',
    regular: '生徒が20人くらいまで。英語が苦手でも翻訳モードで授業できる先生に',
    pro: '生徒が40人くらいまで。個人で教室を回している先生に',
};

const OK = <span className="inline-flex w-[22px] h-[22px] rounded-full bg-[#dff1ea] text-[#2a6f5a] items-center justify-center text-[13px]">✓</span>;
const NO = <span className="text-[#6f6884]">—</span>;

type Row = { name: string; sub?: string; cells: (React.ReactNode | string)[] | { span: string } };
type Group = { title: string; rows: Row[] };

function buildGroups(): Group[] {
    const minutes = (t: PlanTier) => <b>月{PLAN_TIERS[t].translationMinutes.toLocaleString('ja-JP')}分</b>;
    const students = (t: PlanTier) => <>上限なし<span className="block text-[12px] text-[#6f6884]">めやす{PLAN_TIERS[t].students}人</span></>;
    const all4 = [OK, OK, OK, OK];
    const pack = PACK_PRICE_JPY === null ? '準備中' : `${PACK_PRICE_LABEL} / 回`;
    return [
        { title: '生徒と記録', rows: [
            { name: '生徒の管理', sub: '生徒の1枚・前回の内容・つまずき', cells: all4 },
            { name: '登録できる生徒の数', cells: ['上限なし', students('light'), students('regular'), students('pro')] },
            { name: '授業の記録・宿題', sub: '授業が終わると自動で下書き', cells: all4 },
            { name: '授業中に作った物の保存', sub: '例文・練習問題・会話を90日間', cells: all4 },
        ] },
        { title: '授業の準備', rows: [
            { name: '体験レッスンの判定', sub: '会話のメモからレベルと目的を判定', cells: all4 },
            { name: '学習計画の自動作成・生徒に渡すリンク', sub: '11言語', cells: all4 },
            { name: '授業前の1枚', sub: '今日の指針・復習クイズ・導入の話し方', cells: all4 },
        ] },
        { title: 'ライブ授業', rows: [
            { name: '翻訳モード', sub: '生徒の声をその場で日本語に（英語・スペイン語・韓国語など10言語）',
              cells: [<><b>{TRIAL_TRANSLATION_MINUTES}分</b><span className="block text-[12px] text-[#6f6884]">{TRIAL_DAYS}日間で</span></>, minutes('light'), minutes('regular'), minutes('pro')] },
            { name: '先生の言葉の訳', sub: '先生の日本語に生徒の母語の訳を添える。オン・オフできる', cells: all4 },
            { name: 'ASTAのヒント', sub: '課の進め方・ことばの補助。1時間20回まで', cells: all4 },
            { name: '例文・練習問題・やさしく言い換え', sub: 'いまの会話と課に合わせて。1時間60回まで', cells: all4 },
            { name: 'ASTAに聞く', sub: '授業の相談・質問への答え', cells: all4 },
        ] },
        { title: '教材', rows: [
            { name: '自分の教材・みんなの教材', sub: '作った例文や練習問題を保存・公開', cells: all4 },
        ] },
        { title: '上限とお支払い', rows: [
            { name: '翻訳モードが上限に達したら', cells: { span: '翻訳モードだけ止まります（毎月1日に戻る）。ヒント・例文・記録はそのまま' } },
            { name: '追加パック', sub: `翻訳モード＋${PACK_MINUTES}分・買った日から${PACK_VALID_DAYS}日間`, cells: [NO, pack, pack, pack] },
            { name: 'プランの変更', cells: { span: 'いつでも。上げた分の差額は日割り。無料お試し中の変更は、お試しをそのまま続けられます' } },
            { name: 'お支払い', cells: { span: 'クレジットカード（Stripe）・毎月自動更新・日割りの返金なし' } },
        ] },
    ];
}

const FAQ: { q: string; a: string }[] = [
    { q: '翻訳モードの「分」はどう数えますか？', a: '翻訳モードをオンにしている間の、生徒が話している時間だけを数えます。生徒が黙っている間は数えません。60分の授業で生徒が20分話せば、20分です。' },
    { q: '上限に達したらどうなりますか？', a: `翻訳モードだけ止まり、授業は続けられます。ヒント・例文・記録・学習計画はそのまま使えます。残りが30分を切ると画面でお知らせします。翌月1日に元に戻ります。急ぎなら追加パック（＋${PACK_MINUTES}分）を買い足せます。` },
    { q: 'プランの目安の「生徒◯人」を超えたら？', a: '生徒の登録に上限はありません。目安は「毎回60分、翻訳モードをつけっぱなし」でも足りる人数です。実際は生徒が話す時間だけ数えるので、目安より多い生徒でも上限に届かないことがほとんどです。' },
    { q: `${TRIAL_DAYS}日間の無料お試しで何ができますか？`, a: `選んだプランのすべての機能を使えます。翻訳モードは${TRIAL_DAYS}日間で${TRIAL_TRANSLATION_MINUTES}分まで（30分の授業なら6回分）。${TRIAL_DAYS + 1}日目に最初の課金が始まります。${TRIAL_DAYS}日以内に解約すれば料金はかかりません。` },
    { q: 'プランの変更・解約はどこでできますか？', a: '設定の「プラン」から、いつでもできます。上のプランに変えると、その日から使えて差額は日割りです。解約は、その課金期間の末日までは使えます。' },
    { q: 'Zoom のアプリを使っていますが、翻訳モードは使えますか？', a: '翻訳モードは Chrome のタブの音声を聞く仕組みです。Zoom や Google Meet を Chrome のブラウザで開いてください。Zoom のパソコン用アプリでは生徒の声を拾えません。Preply はブラウザなのでそのまま使えます。' },
    { q: '生徒が40人より多い、または教室で複数の先生が使いたい', a: `プロより大きい使い方は個別にご案内します。生徒の人数・週の授業数・翻訳モードを使うかの3点を添えて、${BUSINESS_CONTACT_EMAIL} へお問い合わせください。` },
    { q: '領収書・インボイスは出ますか？', a: 'お支払いごとに Stripe の領収書（メール）が届きます。適格請求書（インボイス）は発行できません。' },
];

function PricingContent() {
    const searchParams = useSearchParams();
    const canceled = searchParams.get('canceled') === '1';
    const [loading, setLoading] = useState<PlanTier | null>(null);
    const [error, setError] = useState('');
    const groups = buildGroups();

    const handleCheckout = async (tier: PlanTier) => {
        setLoading(tier);
        setError('');
        try {
            const res = await fetch('/api/stripe/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tier }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'エラーが発生しました');
            if (data.url) window.location.href = data.url;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
            setLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#f5f2fa] text-[#3a3350] px-4 pb-16">
            <div className="max-w-[1100px] mx-auto">
                {/* 見出し */}
                <header className="text-center pt-14 pb-7">
                    <p className="text-xs font-black tracking-[0.2em] text-[#6b5ca5] mb-2">日本語教師のためのASTA</p>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">料金プラン</h1>
                    <p className="text-[#6f6884] max-w-[36em] mx-auto">
                        機能は3つとも同じです。違いは、生徒の声をその場で日本語にする「翻訳モード」を月に使える時間だけ。生徒の数に上限はありません。
                    </p>
                    <div className="flex justify-center gap-2.5 flex-wrap mt-5">
                        <span className="inline-flex items-center gap-2 bg-[#dff1ea] text-[#2a6f5a] font-bold text-[13px] px-3.5 py-1.5 rounded-full">✓ どのプランも最初の{TRIAL_DAYS}日間は無料（翻訳モードは{TRIAL_TRANSLATION_MINUTES}分まで）</span>
                        <span className="inline-flex items-center gap-2 bg-[#dff1ea] text-[#2a6f5a] font-bold text-[13px] px-3.5 py-1.5 rounded-full">✓ いつでも解約できます</span>
                    </div>
                </header>

                {canceled && (
                    <div className="mb-6 px-5 py-3 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-700 text-center">
                        決済がキャンセルされました。いつでも再開できます。
                    </div>
                )}
                {error && (
                    <p className="text-xs text-red-600 mb-4 px-3 py-2 bg-red-50 rounded-xl text-center">{error}</p>
                )}

                {/* プランのカード3枚 */}
                <section className="grid gap-[18px] md:grid-cols-3" aria-label="プラン">
                    {PLAN_TIER_KEYS.map((tier) => {
                        const t = PLAN_TIERS[tier];
                        const perLesson = tierPerLessonLabel(tier);
                        const pop = tier === 'regular';
                        return (
                            <article
                                key={tier}
                                className={`relative bg-white rounded-[22px] p-6 flex flex-col border ${pop ? 'border-[#6b5ca5] shadow-[0_10px_40px_rgba(107,92,165,0.12)]' : 'border-[#e4ddf0]'}`}
                            >
                                {pop && <span className="absolute -top-3 left-6 bg-[#6b5ca5] text-white text-xs font-bold px-3 py-1 rounded-full">いちばん選ばれています</span>}
                                <h2 className="text-[22px] font-black mb-1">{t.label}</h2>
                                <p className="text-[#6f6884] text-[13px] mb-3.5 min-h-[2.6em]">{CARD_WHO[tier]}</p>
                                <div className="flex items-baseline gap-1.5 tabular-nums">
                                    <b className="text-[38px] font-black tracking-tight">{tierPriceLabel(tier)}</b>
                                    <span className="text-[#6f6884] text-[13px]">/ 月（税込）</span>
                                </div>
                                {/* 授業1回あたりの金額を全プランに併記（かずき指示 2026-09-23） */}
                                <p className="text-[13px] text-[#6f6884] mt-0.5 mb-4">
                                    {perLesson ? <>授業1回あたり <b className="text-[#3a3350]">約{perLesson}</b>（生徒{t.students}人・週1回の場合）</> : '料金は準備中です'}
                                </p>
                                <div className="bg-[#f0ebf8] rounded-[14px] px-3.5 py-3 mb-4">
                                    <b className="block text-[15px]">翻訳モード 月{t.translationMinutes.toLocaleString('ja-JP')}分まで</b>
                                    <small className="block text-[#6f6884] text-[12px] leading-snug mt-0.5">生徒{t.students}人・毎回60分つけっぱなしでも足りる量</small>
                                </div>
                                <button
                                    onClick={() => handleCheckout(tier)}
                                    disabled={loading !== null || !ALL_TIER_PRICES_SET}
                                    className={`w-full py-3 font-bold rounded-[14px] transition-transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 ${pop ? 'bg-[#6b5ca5] text-white shadow-[0_4px_24px_rgba(107,92,165,0.30)]' : 'bg-[#efe9ff] text-[#3a3350]'}`}
                                >
                                    {loading === tier ? <><Loader2 size={18} className="animate-spin" />決済ページへ移動中…</> : `${t.label}で始める`}
                                </button>
                                <p className="text-center text-[12px] text-[#6f6884] mt-2 mb-4">
                                    {ALL_TIER_PRICES_SET ? `${TRIAL_DAYS}日間無料 → ${TRIAL_DAYS + 1}日目から ${tierPriceLabel(tier)}/月` : '料金が確定しだいお申込みいただけます'}
                                </p>
                                <ul className="grid gap-2 text-[14px]">
                                    {CARD_FEATURES[tier].map((f) => (
                                        <li key={f} className="flex items-start gap-2">
                                            <Check size={14} className="text-[#6b5ca5] mt-1 flex-shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            </article>
                        );
                    })}
                </section>

                {/* 40人超・複数の先生 */}
                <section className="mt-[18px] bg-white border border-[#e4ddf0] rounded-[22px] px-6 py-4 flex flex-wrap gap-3 items-center justify-between">
                    <div>
                        <b>生徒が40人より多い・教室で複数の先生が使う</b>
                        <span className="text-[#6f6884] text-[13px] ml-2.5">使い方に合わせて個別にご案内します</span>
                    </div>
                    <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[14px] bg-[#efe9ff] font-bold text-[14px] select-all">
                        <Mail size={15} className="text-[#6b5ca5]" />{BUSINESS_CONTACT_EMAIL}
                    </span>
                </section>

                {/* 比べる表 */}
                <section className="mt-16">
                    <h2 className="text-[26px] font-black text-center mb-1.5">プランを比べる</h2>
                    <p className="text-center text-[#6f6884] mb-6">上限に達しても、止まるのは翻訳モードだけ。ほかの機能はそのまま使えます。</p>
                    <div className="overflow-x-auto border border-[#e4ddf0] rounded-[18px] bg-white">
                        <table className="w-full min-w-[720px] text-[14px] border-collapse">
                            <thead>
                                <tr>
                                    <th className="text-left px-4 py-3 border-b border-[#e4ddf0] text-[15px]">機能</th>
                                    <th className="px-4 py-3 border-b border-[#e4ddf0] text-[15px] w-[19%]">無料お試し<span className="block text-[12px] text-[#6f6884] font-medium">{TRIAL_DAYS}日間</span></th>
                                    {PLAN_TIER_KEYS.map(t => (
                                        <th key={t} className="px-4 py-3 border-b border-[#e4ddf0] text-[15px] w-[19%]">{PLAN_TIERS[t].label}<span className="block text-[12px] text-[#6f6884] font-medium">{tierPriceLabel(t)}/月</span></th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {groups.map((g) => (
                                    <GroupRows key={g.title} group={g} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* よくある質問 */}
                <section className="mt-16">
                    <h2 className="text-[26px] font-black text-center mb-6">よくある質問</h2>
                    <div className="max-w-[760px] mx-auto grid gap-2.5">
                        {FAQ.map(({ q, a }) => (
                            <details key={q} className="bg-white border border-[#e4ddf0] rounded-[14px] px-[18px] group">
                                <summary className="cursor-pointer font-bold py-3.5 list-none flex justify-between gap-3 items-center [&::-webkit-details-marker]:hidden">
                                    {q}<span className="text-[#6b5ca5] font-black group-open:hidden">＋</span><span className="text-[#6b5ca5] font-black hidden group-open:inline">−</span>
                                </summary>
                                <p className="text-[#6f6884] pb-3.5 leading-relaxed">{a}</p>
                            </details>
                        ))}
                    </div>
                    <div className="max-w-[760px] mx-auto mt-10 text-[12px] text-[#6f6884] leading-relaxed">
                        <p>※ 金額はすべて消費税込みです。※ 「授業1回あたり」は、月額 ÷（生徒の目安の人数 × 月4.3回）で計算した参考値です。</p>
                        <p>※ 翻訳モードの分数は、生徒が話している時間を1秒単位で数えます。{PACK_PRICE_JPY !== null && `※ ${PACK_SENTENCE}。`}</p>
                        <p>※ <a href="/legal/terms" className="text-[#6b5ca5] underline">利用規約・特定商取引法に基づく表記</a>もご覧ください。</p>
                    </div>
                </section>

                <p className="mt-8 text-center text-xs text-[#484550]/50">
                    すでにアカウントをお持ちの方は
                    <a href="/login" className="text-[#6b5ca5] underline ml-1">ログイン</a>
                </p>
            </div>
        </div>
    );
}

function GroupRows({ group }: { group: Group }) {
    return (
        <>
            <tr><td colSpan={5} className="bg-[#f0ebf8] text-[#6b5ca5] font-bold text-[13px] tracking-wider px-4 py-2">{group.title}</td></tr>
            {group.rows.map((r) => (
                <tr key={r.name}>
                    <td className="px-4 py-3 border-b border-[#e4ddf0] align-top">
                        {r.name}
                        {r.sub && <span className="block text-[#6f6884] text-[12px] leading-snug">{r.sub}</span>}
                    </td>
                    {Array.isArray(r.cells)
                        ? r.cells.map((c, i) => <td key={i} className="px-4 py-3 border-b border-[#e4ddf0] text-center align-top tabular-nums">{c}</td>)
                        : <td colSpan={4} className="px-4 py-3 border-b border-[#e4ddf0] text-center align-top">{r.cells.span}</td>}
                </tr>
            ))}
        </>
    );
}

export default function PricingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#f5f2fa] flex items-center justify-center"><Loader2 className="animate-spin text-[#6b5ca5]" size={28} /></div>}>
            <PricingContent />
        </Suspense>
    );
}
