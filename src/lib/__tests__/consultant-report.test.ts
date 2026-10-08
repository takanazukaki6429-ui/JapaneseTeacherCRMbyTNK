import { describe, it, expect } from 'vitest';
import {
    buildConsultantReport,
    formatConsultantReportText,
    isMissingConsultantColumn,
    jstPeriod,
    normalizeConsultant,
    type TeacherSettingsRow,
    type UsedCodeRow,
} from '../consultant-report';

const PRICES = { light: 2980, regular: 4980, pro: 7980 };

const code = (consultant: string | null, used_by: string | null, used_at = '2026-10-02T01:00:00Z'): UsedCodeRow =>
    ({ consultant, used_by, used_at });
const teacher = (user_id: string, subscription_status: string, plan_tier = 'light', is_free = false): TeacherSettingsRow =>
    ({ user_id, display_name: `先生${user_id}`, subscription_status, plan_tier, is_free });

describe('normalizeConsultant', () => {
    it('前後の空白を落とし、空なら null', () => {
        expect(normalizeConsultant('  あいちゃん ')).toBe('あいちゃん');
        expect(normalizeConsultant('   ')).toBeNull();
        expect(normalizeConsultant(undefined)).toBeNull();
        expect(normalizeConsultant(3)).toBeNull();
    });
    it('長すぎる呼び名は40文字で切る', () => {
        expect(normalizeConsultant('あ'.repeat(50))?.length).toBe(40);
    });
});

describe('buildConsultantReport', () => {
    it('契約の状態ごとに分けて数える（有料は active だけ・お試し中は別）', () => {
        const report = buildConsultantReport(
            [code('あいちゃん', 'a'), code('あいちゃん', 'b'), code('あいちゃん', 'c'), code('あいちゃん', 'd'), code('あいちゃん', 'e'), code('あいちゃん', 'f')],
            [
                teacher('a', 'active', 'regular'),
                teacher('b', 'trialing', 'pro'),
                teacher('c', 'past_due'),
                teacher('d', 'canceled'),
                teacher('e', 'inactive', 'light', true),
                teacher('f', 'inactive'),
            ],
            PRICES,
        );
        const s = report.summaries[0];
        expect(s.consultant).toBe('あいちゃん');
        expect(s.registered).toBe(6);
        expect(s.paid).toEqual({ light: 0, regular: 1, pro: 0 });
        expect(s.paidTotal).toBe(1);
        expect(s.trialing).toBe(1);
        expect(s.pastDue).toBe(1);
        expect(s.canceled).toBe(1);
        expect(s.free).toBe(1);
        expect(s.none).toBe(1);
        expect(s.monthlyYen).toBe(4980);
    });

    it('無料の印があっても、契約していれば有料として数える', () => {
        const report = buildConsultantReport([code('A', 'x')], [teacher('x', 'active', 'pro', true)], PRICES);
        expect(report.summaries[0].paid.pro).toBe(1);
        expect(report.summaries[0].free).toBe(0);
        expect(report.summaries[0].monthlyYen).toBe(7980);
    });

    it('有料の先生がいる段の金額が未設定なら、合計は null（0と区別する）', () => {
        const report = buildConsultantReport([code('A', 'x')], [teacher('x', 'active', 'regular')], { light: 2980, regular: null, pro: 7980 });
        expect(report.summaries[0].monthlyYen).toBeNull();
    });

    it('設定の行が無い先生は未契約・ライトとして数える', () => {
        const report = buildConsultantReport([code('A', 'ghost')], [], PRICES);
        expect(report.summaries[0].none).toBe(1);
        expect(report.summaries[0].teachers[0].tier).toBe('light');
    });

    it('呼び名の前後の空白の違いは同じ相手として数える', () => {
        const report = buildConsultantReport([code('あいちゃん', 'a'), code(' あいちゃん  ', 'b')], [teacher('a', 'active'), teacher('b', 'active')], PRICES);
        expect(report.summaries).toHaveLength(1);
        expect(report.summaries[0].paidTotal).toBe(2);
        expect(report.summaries[0].monthlyYen).toBe(5960);
    });

    it('有料の人数が多い順に並べる', () => {
        const report = buildConsultantReport(
            [code('B', 'b1'), code('A', 'a1'), code('A', 'a2')],
            [teacher('b1', 'inactive'), teacher('a1', 'active'), teacher('a2', 'active')],
            PRICES,
        );
        expect(report.summaries.map(s => s.consultant)).toEqual(['A', 'B']);
    });

    it('10/1以降に相手が空のコードで登録した先生だけを「入れ忘れの可能性」として数える', () => {
        const report = buildConsultantReport(
            [
                code(null, 'old', '2026-09-20T01:00:00Z'),   // 記録を始める前 → 数えない
                code(null, 'new', '2026-10-01T00:30:00+09:00'), // 10/1 0:30（日本時間） → 数える
                code(null, null, '2026-10-03T00:00:00Z'),      // 未使用 → 数えない
            ],
            [],
            PRICES,
        );
        expect(report.unattributedSinceStart).toBe(1);
        expect(report.summaries).toHaveLength(0);
    });
});

describe('formatConsultantReportText', () => {
    it('相手ごとの人数・金額・先生の一覧と、合計を書く', () => {
        const report = buildConsultantReport([code('あいちゃん', 'a'), code('あいちゃん', 'b')], [teacher('a', 'active', 'regular'), teacher('b', 'trialing')], PRICES);
        const text = formatConsultantReportText(report, '2026年10月1日 09:00（日本時間）');
        expect(text).toContain('■ あいちゃん');
        expect(text).toContain('有料 1人（レギュラー1）');
        expect(text).toContain('¥4,980');
        expect(text).toContain('先生a：有料・レギュラー');
        expect(text).toContain('先生b：お試し中');
        expect(text).toContain('合計：有料 1人');
    });
    it('まだ誰もいなければ、その旨を書く', () => {
        const text = formatConsultantReportText({ summaries: [], unattributedSinceStart: 0 }, 'x');
        expect(text).toContain('まだいません');
    });
});

describe('isMissingConsultantColumn', () => {
    it('列が無いときのエラー文を見分ける', () => {
        expect(isMissingConsultantColumn({ message: 'column invite_codes.consultant does not exist' })).toBe(true);
        expect(isMissingConsultantColumn({ message: "Could not find the 'consultant' column of 'invite_codes' in the schema cache" })).toBe(true);
        expect(isMissingConsultantColumn({ message: 'permission denied' })).toBe(false);
        expect(isMissingConsultantColumn(null)).toBe(false);
    });
});

describe('jstPeriod', () => {
    it('日本時間の年月を返す（UTCの月末夜は日本時間では翌月）', () => {
        expect(jstPeriod(new Date('2026-09-30T15:30:00Z')).period).toBe('2026-10');
        expect(jstPeriod(new Date('2026-09-30T14:59:00Z')).period).toBe('2026-09');
        expect(jstPeriod(new Date('2026-10-01T00:00:00Z')).label).toBe('2026年10月1日 09:00（日本時間）');
    });
});

// ---- コンサルの受講生（2026-10-06） ----
const NOW = new Date('2026-11-01T00:00:00Z'); // 日本時間 11/1 9:00（毎月の知らせを送る時刻）
const student = (user_id: string, course_end_date: string | null, subscription_status = 'inactive'): TeacherSettingsRow =>
    ({ user_id, display_name: `受講生${user_id}`, subscription_status, plan_tier: 'light', is_free: false, course_end_date });

describe('受講中の数え方', () => {
    it('コースが終わる日まで（当日を含む）は「受講中」。紹介の有料・お試し中には入れない', () => {
        const report = buildConsultantReport(
            [code('あいちゃん', 'a'), code('あいちゃん', 'b'), code('あいちゃん', 'c'), code('あいちゃん', 'd')],
            [
                student('a', '2026-11-01'),               // 当日（日本時間 11/1）→ 受講中
                student('b', '2026-12-31', 'trialing'),   // 先回りして申し込んだ（Stripe ではお試し中）→ 受講中
                student('c', '2026-10-31'),               // 前日に終わった → 受講後・未申込み
                student('d', '2026-12-31', 'active'),     // 契約中（有料）が先
            ],
            PRICES,
            NOW,
        );
        const s = report.summaries[0];
        expect(s.course).toBe(2);
        expect(s.trialing).toBe(0);
        expect(s.courseFinished).toBe(1);
        expect(s.none).toBe(0);
        expect(s.paidTotal).toBe(1);
        expect(s.teachers.find(t => t.userId === 'b')?.bucket).toBe('course');
    });

    it('知らせの本文に「受講中 n人」と、受講中の先生の行を書く', () => {
        const report = buildConsultantReport([code('あいちゃん', 'a')], [student('a', '2026-12-31')], PRICES, NOW);
        const text = formatConsultantReportText(report, 'x');
        expect(text).toContain('受講中 1人');
        expect(text).toContain('受講生a：受講中');
    });
});

describe('出したコードの数（2026-10-07）', () => {
    it('使われていないコードは、期限切れと取り消しを除いて「使われていない有効なコード」に数える', () => {
        const report = buildConsultantReport(
            [
                code('あいちゃん', 'a'),
                { consultant: 'あいちゃん', used_by: null, used_at: null },                                        // 未使用・期限なし
                { consultant: 'あいちゃん', used_by: null, used_at: null, expires_at: '2026-11-10T00:00:00Z' },    // 未使用・期限内
                { consultant: 'あいちゃん', used_by: null, used_at: null, expires_at: '2026-10-20T00:00:00Z' },    // 期限切れ
                { consultant: 'あいちゃん', used_by: null, used_at: null, revoked_at: '2026-10-25T00:00:00Z' },    // 取り消し済み
                { consultant: null, used_by: null, used_at: null },                                               // 相手なし → 数えない
            ],
            [teacher('a', 'active', 'regular')],
            PRICES,
            NOW,
        );
        const s = report.summaries[0];
        expect(s.issued).toBe(5);
        expect(s.unusedValid).toBe(2);
        expect(s.registered).toBe(1);
        expect(report.summaries).toHaveLength(1);
    });

    it('知らせの本文に、出したコードと使われていない有効なコードの数を書く', () => {
        const report = buildConsultantReport(
            [code('あいちゃん', 'a'), { consultant: 'あいちゃん', used_by: null, used_at: null }],
            [student('a', '2026-10-31')],
            PRICES,
            NOW,
        );
        const text = formatConsultantReportText(report, 'x');
        expect(text).toContain('出したコード 2件（使われていない有効なコード 1件）');
        expect(text).toContain('受講後・未申込み 1人');
        expect(text).toContain('受講生a：受講後・未申込み');
    });
});
