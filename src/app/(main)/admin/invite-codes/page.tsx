'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, KeyRound, Copy, Check, Plus, Users, AlertTriangle, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { showAppError } from '@/lib/error-handler';
import { isAdminEmail } from '@/lib/admin';
import { PLAN_TIERS, PLAN_TIER_KEYS } from '@/lib/pricing';
import { CONSULTANT_MAX_LENGTH, type ConsultantReport } from '@/lib/consultant-report';
import { COURSE_FREE_MONTHS, formatJpDate, isInCourse, type CourseMonths } from '@/lib/course';
import { AUDIENCE_LABEL, MEMBER_PRICE_GRACE_DAYS, normalizeAudience } from '@/lib/audience';
import {
    INVITE_BATCH_MAX,
    INVITE_STATUS_LABEL,
    INVITE_VALID_DAYS_DEFAULT,
    INVITE_VALID_DAYS_MAX,
    courseEndDateMax,
    inviteCodeStatus,
    parseEmailList,
} from '@/lib/invite-code';

type InviteCode = {
    id: string;
    code: string;
    used_at: string | null;
    used_by?: string | null;
    created_at: string;
    /** 渡した相手（コンサルタントの呼び名）。紹介の取り分を数えるため（2026-09-29） */
    consultant?: string | null;
    /** 種類（一般・受講生・卒業生。2026-10-07・lib/audience.ts） */
    audience?: string | null;
    /** 受講生のコース（3か月・6か月）とコースが終わる日（2026-10-06・lib/course.ts） */
    course_months?: number | null;
    course_end_date?: string | null;
    /** 守り（2026-10-07・lib/invite-code.ts） */
    expires_at?: string | null;
    revoked_at?: string | null;
    email?: string | null;
};

/** 発行の画面の「種類」 */
type IssueKind = 'general' | 'course3' | 'course6' | 'alumni';
const ISSUE_KIND_LABEL: Record<IssueKind, string> = {
    general: '一般の先生',
    course3: '受講生・3か月コース（無料2か月）',
    course6: '受講生・6か月コース（無料5か月）',
    alumni: '卒業生（受講生価格・お試しなし）',
};
const kindMonths = (kind: IssueKind): CourseMonths | null => (kind === 'course3' ? 3 : kind === 'course6' ? 6 : null);

type CourseDraft = { months: string; end: string; extension: boolean };

const yenOrDash = (n: number | null) => (n === null ? '金額未設定' : `¥${n.toLocaleString('ja-JP')}`);

const STATUS_STYLE: Record<ReturnType<typeof inviteCodeStatus>, string> = {
    used: 'bg-slate-100 text-slate-600',
    revoked: 'bg-red-50 text-red-700',
    expired: 'bg-amber-50 text-amber-700',
    unused: 'bg-emerald-100 text-emerald-700',
};

export default function InviteCodesAdminPage() {
    const [codes, setCodes] = useState<InviteCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    // 渡した相手（2026-09-29）
    const [consultantInput, setConsultantInput] = useState('');
    const [consultantColumn, setConsultantColumn] = useState<boolean | null>(null);
    const [edits, setEdits] = useState<Record<string, string>>({});
    const [savingId, setSavingId] = useState<string | null>(null);
    const [report, setReport] = useState<ConsultantReport | null>(null);
    const [reportLoading, setReportLoading] = useState(true);
    // 種類・コース・守り（2026-10-06・10-07）
    const [guardColumns, setGuardColumns] = useState<boolean | null>(null);
    const [kind, setKind] = useState<IssueKind>('general');
    const [validDays, setValidDays] = useState(String(INVITE_VALID_DAYS_DEFAULT));
    const [countInput, setCountInput] = useState('1');
    const [emailsInput, setEmailsInput] = useState('');
    const [issued, setIssued] = useState<InviteCode[]>([]);
    const [courseEdits, setCourseEdits] = useState<Record<string, CourseDraft>>({});
    const [savingCourseId, setSavingCourseId] = useState<string | null>(null);
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const fetchCodes = useCallback(async () => {
        try {
            setLoading(true);
            // データ口への直接アクセスは廃止（管理者権限接続のAPI経由に一本化）
            const res = await fetch('/api/admin/invite-codes');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '取得に失敗しました');
            setCodes(data.codes || []);
            setConsultantColumn(data.consultantColumn !== false);
            setGuardColumns(data.guardColumns === true);
        } catch (error) {
            console.error('Error fetching invite codes:', error);
            showAppError(error, '招待コードの取得に失敗しました');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchReport = useCallback(async () => {
        try {
            setReportLoading(true);
            const res = await fetch('/api/admin/consultant-report');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '取得に失敗しました');
            setReport(data);
        } catch (error) {
            console.error('Error fetching consultant report:', error);
            showAppError(error, 'コンサルタント別の数を取得できませんでした');
        } finally {
            setReportLoading(false);
        }
    }, []);

    useEffect(() => {
        const checkAccess = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user || !isAdminEmail(user.email)) {
                router.replace('/');
                return;
            }

            setIsAdmin(true);
            fetchCodes();
            fetchReport();
        };

        checkAccess();
    }, [fetchCodes, fetchReport, router, supabase.auth]);

    // 入力の候補（これまでに使った呼び名）。同じ人を別の書き方で記録しないように
    const consultantNames = useMemo(
        () => [...new Set(codes.map(c => c.consultant?.trim()).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b, 'ja')),
        [codes],
    );

    if (isAdmin === null) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    const months = kindMonths(kind);
    const parsedEmails = parseEmailList(emailsInput);
    const issueCount = parsedEmails.emails.length > 0 ? parsedEmails.emails.length : Number(countInput);
    const issueInvalid =
        parsedEmails.invalid.length > 0 ||
        !Number.isInteger(issueCount) || issueCount < 1 || issueCount > INVITE_BATCH_MAX;

    const generateCode = async () => {
        try {
            setGenerating(true);
            // コード生成・登録はサーバ側（管理者権限接続）で行う
            const res = await fetch('/api/admin/invite-codes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    consultant: consultantInput,
                    audience: months ? 'course' : kind,
                    ...(months ? { course_months: months } : {}),
                    valid_days: Number(validDays),
                    ...(parsedEmails.emails.length > 0 ? { emails: emailsInput } : { count: issueCount }),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '発行に失敗しました');

            const created = (data.codes ?? []) as InviteCode[];
            setIssued(created);
            toast.success(`${ISSUE_KIND_LABEL[kind]}のコードを${created.length}件発行しました`);
            setEmailsInput('');
            setCountInput('1');
            fetchCodes();
            fetchReport();
        } catch (error) {
            console.error('Error generating code:', error);
            showAppError(error, 'コードの発行に失敗しました');
        } finally {
            setGenerating(false);
        }
    };

    const saveConsultant = async (c: InviteCode) => {
        try {
            setSavingId(c.id);
            const res = await fetch('/api/admin/invite-codes', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: c.id, consultant: edits[c.id] ?? '' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '記録に失敗しました');
            toast.success('渡した相手を記録しました');
            setEdits(prev => {
                const next = { ...prev };
                delete next[c.id];
                return next;
            });
            fetchCodes();
            fetchReport();
        } catch (error) {
            console.error('Error saving consultant:', error);
            showAppError(error, '渡した相手の記録に失敗しました');
        } finally {
            setSavingId(null);
        }
    };

    const saveCourse = async (c: InviteCode) => {
        const draft = courseEdits[c.id];
        if (!draft) return;
        try {
            setSavingCourseId(c.id);
            const res = await fetch('/api/admin/invite-codes', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: c.id,
                    course_months: draft.months ? Number(draft.months) : null,
                    // 登録済みの受講生だけ、無料の期間が終わる日も直す（使っていないコードは、登録した日から数える）
                    ...(c.used_by && draft.months ? { course_end_date: draft.end, allow_extension: draft.extension } : {}),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '記録に失敗しました');
            toast.success(data.teacherUpdated ? 'コースを直しました（登録済みの先生の設定も直しました）' : 'コースを直しました');
            setCourseEdits(prev => {
                const next = { ...prev };
                delete next[c.id];
                return next;
            });
            fetchCodes();
            fetchReport();
        } catch (error) {
            console.error('Error saving course:', error);
            showAppError(error, 'コースの記録に失敗しました');
        } finally {
            setSavingCourseId(null);
        }
    };

    const revoke = async (c: InviteCode) => {
        if (!window.confirm(`${c.code} を取り消します。取り消したコードは、二度と使えません。よろしいですか？`)) return;
        try {
            setRevokingId(c.id);
            const res = await fetch('/api/admin/invite-codes', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: c.id, action: 'revoke' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '取り消しに失敗しました');
            toast.success(`${c.code} を取り消しました`);
            fetchCodes();
            fetchReport();
        } catch (error) {
            console.error('Error revoking code:', error);
            showAppError(error, '取り消しに失敗しました');
        } finally {
            setRevokingId(null);
        }
    };

    const copyText = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            toast.success('クリップボードにコピーしました');
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    const issuedText = issued.map(c => (c.email ? `${c.code}\t${c.email}` : c.code)).join('\n');

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                    <KeyRound className="w-6 h-6 text-amber-500" />
                    招待コード管理
                </h1>
                <p className="text-slate-500 mt-2">
                    新規の契約教師にアプリを使わせるための「1回使いきり」の招待コードを発行・管理します。
                </p>
            </div>

            {consultantColumn === false && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>
                        保管庫に「渡した相手」の列がまだありません。Supabase Studio で
                        <span className="font-mono"> sql_2026-09-29_招待コードに渡した相手.sql </span>
                        を流すまで、渡した相手は記録できません（相手なしの発行はできます）。
                    </p>
                </div>
            )}

            {guardColumns === false && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>
                        保管庫に「種類・コース・期限・取り消し」の列がまだありません。Supabase Studio で
                        <span className="font-mono"> sql_2026-10-07_受講生と一般の区分と課金の列を守る.sql </span>
                        を流すまで、コードは発行できません。
                    </p>
                </div>
            )}

            <Card className="border-amber-100 shadow-sm">
                <CardHeader className="bg-amber-50/50 pb-4">
                    <CardTitle className="text-lg text-amber-900">新しい招待コードを発行</CardTitle>
                    <CardDescription>
                        1つのコードで作れるアカウントは1つです。コンサルタント経由の先生に渡すコードは、<strong>渡す相手の名前を入れてから</strong>発行してください（紹介の取り分を数えるため）。
                        受講生は、ASTA に登録した日から、3か月コースは{COURSE_FREE_MONTHS[3]}か月・6か月コースは{COURSE_FREE_MONTHS[6]}か月、無料でレギュラーと同じ機能を使えます（講座の最初の1か月は準備のため）。
                        無料の期間が終わってから{MEMBER_PRICE_GRACE_DAYS}日以内に申し込めば受講生価格、その後は一般価格です。
                        卒業生（講座をこれまでに修了し、まだ ASTA を使っていない人）は、受講生価格で申し込めます（お試しなし）。
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-sm text-slate-700">
                            <span className="block mb-1">種類</span>
                            <select
                                value={kind}
                                disabled={guardColumns === false}
                                onChange={e => setKind(e.target.value as IssueKind)}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:bg-slate-50"
                            >
                                {(Object.keys(ISSUE_KIND_LABEL) as IssueKind[]).map(k => (
                                    <option key={k} value={k}>{ISSUE_KIND_LABEL[k]}</option>
                                ))}
                            </select>
                        </label>
                        <div className="text-sm text-slate-700">
                            <span className="block mb-1">無料の期間（受講生だけ）</span>
                            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                                {months
                                    ? `受講生が ASTA に登録した日から${COURSE_FREE_MONTHS[months]}か月（日付を入れる必要はありません）`
                                    : '受講生のコードだけ'}
                            </p>
                        </div>
                        <label className="text-sm text-slate-700">
                            <span className="block mb-1">渡す相手（コンサルタントの呼び名・直接渡すときは空のまま）</span>
                            <input
                                type="text"
                                list="consultant-names"
                                value={consultantInput}
                                maxLength={CONSULTANT_MAX_LENGTH}
                                onChange={e => setConsultantInput(e.target.value)}
                                placeholder="例：あいちゃん"
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                            />
                            <datalist id="consultant-names">
                                {consultantNames.map(name => <option key={name} value={name} />)}
                            </datalist>
                        </label>
                        <label className="text-sm text-slate-700">
                            <span className="block mb-1">使える期限（発行から何日・最大{INVITE_VALID_DAYS_MAX}日）</span>
                            <input
                                type="number"
                                min={1}
                                max={INVITE_VALID_DAYS_MAX}
                                value={validDays}
                                onChange={e => setValidDays(e.target.value)}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                            />
                        </label>
                        <label className="text-sm text-slate-700 sm:col-span-2">
                            <span className="block mb-1">メールアドレス（任意・1行に1人）。入れると、その人数分を出し、それぞれのアドレスでしか登録できないコードにします</span>
                            <textarea
                                value={emailsInput}
                                rows={3}
                                onChange={e => setEmailsInput(e.target.value)}
                                placeholder={'taro@example.com\nhanako@example.com'}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-300"
                            />
                            {parsedEmails.invalid.length > 0 && (
                                <span className="mt-1 block text-xs text-red-600">形が正しくないメールアドレス：{parsedEmails.invalid.join('、')}</span>
                            )}
                        </label>
                        <label className="text-sm text-slate-700">
                            <span className="block mb-1">まとめて出す数（メールアドレスを入れない時・1〜{INVITE_BATCH_MAX}）</span>
                            <input
                                type="number"
                                min={1}
                                max={INVITE_BATCH_MAX}
                                value={parsedEmails.emails.length > 0 ? String(parsedEmails.emails.length) : countInput}
                                disabled={parsedEmails.emails.length > 0}
                                onChange={e => setCountInput(e.target.value)}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:bg-slate-50"
                            />
                        </label>
                        <div className="flex items-end">
                            <Button
                                onClick={generateCode}
                                disabled={generating || issueInvalid || guardColumns === false}
                                className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                            >
                                {generating ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 発行中...</>
                                ) : (
                                    <><Plus className="w-4 h-4 mr-2" /> {Number.isInteger(issueCount) && issueCount > 0 ? `${issueCount}件` : ''}発行する</>
                                )}
                            </Button>
                        </div>
                    </div>

                    {issued.length > 0 && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <p className="text-sm font-bold text-emerald-900">いま発行したコード（{issued.length}件）</p>
                                <Button size="sm" variant="outline" onClick={() => copyText(issuedText, 'issued-all')}>
                                    {copiedId === 'issued-all' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                    <span className="ml-2">まとめてコピー</span>
                                </Button>
                            </div>
                            <ul className="space-y-1 font-mono text-sm text-emerald-900">
                                {issued.map(c => (
                                    <li key={c.id}>{c.code}{c.email ? `　${c.email}` : ''}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="w-5 h-5 text-slate-500" />
                        コンサルタント別の契約（今の時点）
                    </CardTitle>
                    <CardDescription>
                        渡した相手が記録されたコードを、相手ごとに数えます。有料＝契約中（お試し中は含めない）。受講中＝コンサルの受講生（特別優待プランの無料の期間中＝登録した日から2か月・5か月・紹介の取り分なし）。
                        受講後・未申込み＝無料の期間が終わって、まだ申し込んでいない受講生（声をかける相手）。使われていないコードが多い時は、漏れや渡し忘れの目印です。
                        金額は段の月額の合計（税込・目安）で、実際の入金額とは違います。毎月1日 9:00（日本時間）に同じ内容を運営者のメールへ自動で送ります。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {reportLoading ? (
                        <div className="flex justify-center p-8 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                    ) : !report || report.summaries.length === 0 ? (
                        <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-lg">
                            渡した相手が記録されたコードは、まだありません
                        </div>
                    ) : (
                        <div className="relative overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-600">
                                <thead className="text-xs text-slate-700 bg-slate-50">
                                    <tr>
                                        <th className="px-3 py-3">渡した相手</th>
                                        <th className="px-3 py-3 text-right">出したコード</th>
                                        <th className="px-3 py-3 text-right">未使用（有効）</th>
                                        <th className="px-3 py-3 text-right">登録</th>
                                        {PLAN_TIER_KEYS.map(t => (
                                            <th key={t} className="px-3 py-3 text-right">有料・{PLAN_TIERS[t].label}</th>
                                        ))}
                                        <th className="px-3 py-3 text-right">受講中</th>
                                        <th className="px-3 py-3 text-right">受講後・未申込み</th>
                                        <th className="px-3 py-3 text-right">お試し中</th>
                                        <th className="px-3 py-3 text-right">支払い遅れ</th>
                                        <th className="px-3 py-3 text-right">解約</th>
                                        <th className="px-3 py-3 text-right">無料の先生</th>
                                        <th className="px-3 py-3 text-right">月額の合計</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.summaries.map(s => (
                                        <tr key={s.consultant} className="bg-white border-b">
                                            <td className="px-3 py-3 font-medium text-slate-900">{s.consultant}</td>
                                            <td className="px-3 py-3 text-right">{s.issued}</td>
                                            <td className="px-3 py-3 text-right">{s.unusedValid}</td>
                                            <td className="px-3 py-3 text-right">{s.registered}</td>
                                            {PLAN_TIER_KEYS.map(t => (
                                                <td key={t} className="px-3 py-3 text-right">{s.paid[t]}</td>
                                            ))}
                                            <td className="px-3 py-3 text-right">{s.course}</td>
                                            <td className="px-3 py-3 text-right">{s.courseFinished}</td>
                                            <td className="px-3 py-3 text-right">{s.trialing}</td>
                                            <td className="px-3 py-3 text-right">{s.pastDue}</td>
                                            <td className="px-3 py-3 text-right">{s.canceled}</td>
                                            <td className="px-3 py-3 text-right">{s.free}</td>
                                            <td className="px-3 py-3 text-right">{yenOrDash(s.monthlyYen)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {report && report.unattributedSinceStart > 0 && (
                        <p className="mt-4 flex items-start gap-2 text-sm text-amber-800">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                            10/1以降に、渡した相手が空のコードで登録した先生が {report.unattributedSinceStart}人 います。下の一覧で相手を入れ忘れていないか確かめてください。
                        </p>
                    )}
                </CardContent>
            </Card>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">発行済みコード一覧</CardTitle>
                    <CardDescription>
                        「受講（コース）」は、受講生のコースを直す所です。使っていないコードはコースだけ（無料の期間は登録した日から数えます）。
                        登録済みのコードは、無料の期間が終わる日も直せます（登録済みの先生の設定も一緒に直ります）。今の本番で先に登録した受講生にも、ここでコースと終わる日を入れられます。
                        無料の月数＋1か月より先の日付にする時は「延長」に印を付けて保存してください。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                    ) : codes.length === 0 ? (
                        <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-lg">
                            まだ招待コードは発行されていません
                        </div>
                    ) : (
                        <div className="relative overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-600">
                                <thead className="text-xs text-slate-700 bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3">招待コード</th>
                                        <th className="px-4 py-3">種類</th>
                                        <th className="px-4 py-3">渡した相手</th>
                                        <th className="px-4 py-3">状態</th>
                                        <th className="px-4 py-3">受講（コース）</th>
                                        <th className="px-4 py-3">発行日</th>
                                        <th className="px-4 py-3 text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {codes.map((c) => {
                                        const status = inviteCodeStatus(c);
                                        const audience = normalizeAudience(c.audience ?? null);
                                        const current = c.consultant ?? '';
                                        const draft = edits[c.id] ?? current;
                                        const changed = draft.trim() !== current.trim();
                                        const registered = !!c.used_by;
                                        const courseCurrent: CourseDraft = { months: c.course_months ? String(c.course_months) : '', end: c.course_end_date ?? '', extension: false };
                                        const courseDraft = courseEdits[c.id] ?? courseCurrent;
                                        const courseChanged = courseDraft.months !== courseCurrent.months || (registered && courseDraft.end !== courseCurrent.end);
                                        const courseInvalid = registered && !!courseDraft.months && !courseDraft.end;
                                        const draftMonths = courseDraft.months === '3' || courseDraft.months === '6' ? (Number(courseDraft.months) as CourseMonths) : null;
                                        return (
                                            <tr key={c.id} className="bg-white border-b hover:bg-slate-50 align-top">
                                                <td className="px-4 py-4">
                                                    <span className="font-mono font-medium text-slate-900">{c.code}</span>
                                                    {c.email && <span className="mt-1 block text-xs text-slate-500">{c.email} 専用</span>}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    {audience ? AUDIENCE_LABEL[audience] : '—'}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            list="consultant-names"
                                                            value={draft}
                                                            maxLength={CONSULTANT_MAX_LENGTH}
                                                            disabled={consultantColumn === false}
                                                            onChange={e => setEdits(prev => ({ ...prev, [c.id]: e.target.value }))}
                                                            placeholder="（なし）"
                                                            aria-label={`${c.code} の渡した相手`}
                                                            className="w-28 rounded-md border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:bg-slate-50"
                                                        />
                                                        {changed && (
                                                            <Button size="sm" variant="outline" disabled={savingId === c.id} onClick={() => saveConsultant(c)}>
                                                                {savingId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : '保存'}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${STATUS_STYLE[status]}`}>
                                                        {INVITE_STATUS_LABEL[status]}
                                                        {status === 'used' && c.used_at ? `（${new Date(c.used_at).toLocaleDateString()}）` : ''}
                                                    </span>
                                                    {status === 'unused' && c.expires_at && (
                                                        <span className="mt-1 block text-xs text-slate-500">{new Date(c.expires_at).toLocaleDateString()} まで</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <select
                                                            value={courseDraft.months}
                                                            disabled={guardColumns === false}
                                                            onChange={e => setCourseEdits(prev => ({ ...prev, [c.id]: { ...courseDraft, months: e.target.value } }))}
                                                            aria-label={`${c.code} のコース`}
                                                            className="rounded-md border border-slate-200 px-1.5 py-1 text-sm disabled:bg-slate-50"
                                                        >
                                                            <option value="">なし</option>
                                                            <option value="3">3か月</option>
                                                            <option value="6">6か月</option>
                                                        </select>
                                                        {registered && (
                                                            <input
                                                                type="date"
                                                                value={courseDraft.end}
                                                                max={!courseDraft.extension && draftMonths ? courseEndDateMax(draftMonths) : undefined}
                                                                disabled={guardColumns === false || !courseDraft.months}
                                                                onChange={e => setCourseEdits(prev => ({ ...prev, [c.id]: { ...courseDraft, end: e.target.value } }))}
                                                                aria-label={`${c.code} の無料の期間が終わる日`}
                                                                className="rounded-md border border-slate-200 px-1.5 py-1 text-sm disabled:bg-slate-50"
                                                            />
                                                        )}
                                                        {courseChanged && (
                                                            <>
                                                                {registered && (
                                                                    <label className="flex items-center gap-1 text-xs text-slate-600">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={courseDraft.extension}
                                                                            onChange={e => setCourseEdits(prev => ({ ...prev, [c.id]: { ...courseDraft, extension: e.target.checked } }))}
                                                                        />
                                                                        延長
                                                                    </label>
                                                                )}
                                                                <Button size="sm" variant="outline" disabled={savingCourseId === c.id || courseInvalid} onClick={() => saveCourse(c)}>
                                                                    {savingCourseId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : '保存'}
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                    {!courseChanged && registered && c.course_end_date && (
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {isInCourse(c.course_end_date) ? `受講中・${formatJpDate(c.course_end_date)}まで無料` : `${formatJpDate(c.course_end_date)}に無料の期間が終了`}
                                                        </p>
                                                    )}
                                                    {!registered && draftMonths && (
                                                        <p className="mt-1 text-xs text-slate-500">登録した日から{COURSE_FREE_MONTHS[draftMonths]}か月無料</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    {new Date(c.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-4 text-right whitespace-nowrap">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={status !== 'unused'}
                                                        onClick={() => copyText(c.code, c.id)}
                                                        className={status !== 'unused' ? 'opacity-50' : 'text-slate-600 hover:text-amber-600'}
                                                    >
                                                        {copiedId === c.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                                        <span className="ml-2 hidden sm:inline">{copiedId === c.id ? 'コピー済' : 'コピー'}</span>
                                                    </Button>
                                                    {status === 'unused' && guardColumns && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            disabled={revokingId === c.id}
                                                            onClick={() => revoke(c)}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            {revokingId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                                                            <span className="ml-2 hidden sm:inline">取り消す</span>
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
