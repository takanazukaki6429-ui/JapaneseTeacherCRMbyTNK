import { describe, it, expect } from 'vitest';
import {
    buildConsultantReport,
    buildCourseInvoice,
    formatConsultantReportText,
    isMissingConsultantColumn,
    jstMonthOf,
    jstPeriod,
    normalizeConsultant,
    previousJstPeriod,
    NO_CONSULTANT_LABEL,
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
        const report = buildConsultantReport([], [], PRICES, new Date('2026-11-01T00:00:00Z'));
        const text = formatConsultantReportText(report, 'x');
        expect(text).toContain('まだいません');
        expect(text).toContain('受講生の ASTA 代（2026年10月に');
        expect(text).toContain('該当なし');
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
const courseCode = (consultant: string | null, used_by: string, used_at: string, months: number, end: string): UsedCodeRow =>
    ({ consultant, used_by, used_at, course_months: months, course_end_date: end });
const student = (user_id: string, course_end_date: string | null, subscription_status = 'inactive'): TeacherSettingsRow =>
    ({ user_id, display_name: `受講生${user_id}`, subscription_status, plan_tier: 'light', is_free: false, course_end_date });

describe('受講中の数え方', () => {
    it('コースが終わる日まで（当日を含む）は「受講中」。紹介の有料・お試し中には入れない', () => {
        const report = buildConsultantReport(
            [code('あいちゃん', 'a'), code('あいちゃん', 'b'), code('あいちゃん', 'c'), code('あいちゃん', 'd')],
            [
                student('a', '2026-11-01'),               // 当日（日本時間 11/1）→ 受講中
                student('b', '2026-12-31', 'trialing'),   // 先回りして申し込んだ（Stripe ではお試し中）→ 受講中
                student('c', '2026-10-31'),               // 前日に終わった → 未契約
                student('d', '2026-12-31', 'active'),     // 契約中（有料）が先
            ],
            PRICES,
            NOW,
        );
        const s = report.summaries[0];
        expect(s.course).toBe(2);
        expect(s.trialing).toBe(0);
        expect(s.none).toBe(1);
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

describe('受講生の ASTA 代（請求の目安）', () => {
    const codes = [
        courseCode('あいちゃん', 's1', '2026-10-05T03:00:00Z', 3, '2026-12-31'),
        courseCode('あいちゃん', 's2', '2026-10-31T16:00:00Z', 6, '2027-04-30'), // 日本時間 11/1 1:00 → 11月の分
        courseCode(' あいちゃん ', 's3', '2026-09-30T15:30:00Z', 6, '2027-03-31'), // 日本時間 10/1 0:30 → 10月の分
        courseCode(null, 's4', '2026-10-20T00:00:00Z', 3, '2027-01-20'),        // 渡した相手なし
        code('あいちゃん', 'x', '2026-10-10T00:00:00Z'),                            // コースなし → 入れない
    ];
    const settings = [student('s1', '2026-12-31'), student('s3', '2027-03-31')];

    it('登録した月（日本時間）で分けて、コースの代金を足す', () => {
        const inv = buildCourseInvoice(codes, settings, '2026-10');
        // 相手ごと・登録した順（日本時間 10/1 0:30 の s3 が先）
        expect(inv.lines.map(l => l.registeredAt)).toEqual(['2026-09-30T15:30:00Z', '2026-10-05T03:00:00Z', '2026-10-20T00:00:00Z']);
        expect(inv.totalYen).toBe(10000 + 25000 + 10000);
        expect(inv.byConsultant).toEqual([
            { consultant: 'あいちゃん', count: 2, totalYen: 35000 },
            { consultant: NO_CONSULTANT_LABEL, count: 1, totalYen: 10000 },
        ]);
        expect(inv.lines[1].name).toBe('受講生s1');
        expect(inv.lines[2].name).toBeNull();
    });

    it('知らせ（毎月1日）は先月の分、管理画面には今月の分も出す', () => {
        const report = buildConsultantReport(codes, settings, PRICES, NOW);
        expect(report.courseInvoices.previous.period).toBe('2026-10');
        expect(report.courseInvoices.previous.totalYen).toBe(45000);
        expect(report.courseInvoices.current.period).toBe('2026-11');
        expect(report.courseInvoices.current.lines).toHaveLength(1);
        expect(report.courseInvoices.current.totalYen).toBe(25000);
        const text = formatConsultantReportText(report, 'x');
        expect(text).toContain('受講生の ASTA 代（2026年10月に');
        expect(text).toContain('あいちゃん：2人 ¥35,000');
        expect(text).toContain('受講生s1：3か月コース（2026年12月31日まで）・2026年10月5日登録・¥10,000');
        expect(text).toContain('合計 ¥45,000');
    });

    it('コースの月数がおかしいコードは入れない', () => {
        const inv = buildCourseInvoice([courseCode('A', 'z', '2026-10-05T00:00:00Z', 4, '2026-12-31')], [], '2026-10');
        expect(inv.lines).toHaveLength(0);
        expect(inv.totalYen).toBe(0);
    });
});

describe('日本時間の月', () => {
    it('jstMonthOf：UTCの月末夜は日本時間では翌月・読めなければ null', () => {
        expect(jstMonthOf('2026-10-31T15:00:00Z')).toBe('2026-11');
        expect(jstMonthOf('2026-10-31T14:59:00Z')).toBe('2026-10');
        expect(jstMonthOf('x')).toBeNull();
        expect(jstMonthOf(null)).toBeNull();
    });
    it('previousJstPeriod：1月の前は前の年の12月', () => {
        expect(previousJstPeriod(new Date('2026-11-01T00:00:00Z'))).toBe('2026-10');
        expect(previousJstPeriod(new Date('2027-01-01T00:00:00Z'))).toBe('2026-12');
        expect(previousJstPeriod(new Date('2026-12-31T15:30:00Z'))).toBe('2026-12'); // 日本時間 2027/1/1 0:30
    });
});
