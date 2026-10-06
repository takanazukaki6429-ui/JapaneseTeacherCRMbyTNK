'use client';

/**
 * 有料の機能を使えるか（2026-09-24 かずき決定・案A）
 *
 * 「今の本番にある機能は無料、10月から増えた機能は有料」。有料の機能は次の5つ：
 *   ① 記録の自動下書き（宿題・次回の目標まで作る新しい版。トピック・語彙・つまずきの3欄は今までどおり無料）
 *   ② 授業前の1枚の自動作成（生徒の1枚の「本日の授業指針」・準備の画面を開いた時点で作る）
 *   ③ 授業中に作った物の保存と見返し
 *   ④ 生徒に渡すリンク（学習計画）
 *   ⑤ 追加パック
 * 使えるのは、契約中（有料・無料お試し）の先生と、コンサルの受講中の先生（コースが終わる日まで・2026-10-06）。
 * 既存の無料の先生（is_free）は、申し込めば使える。
 * サーバー側の判定は lib/plan-access-server.ts（同じ決め方）
 */
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { decideFeature, type FeatureDecision, type GatedFeature } from '@/lib/plan-features';
import { loadAccessSettings, type AccessSettings } from '@/lib/access-settings';
import { courseDaysLeft, isInCourse, normalizeCourseEndDate } from '@/lib/course';

/** 先生の設定を1回だけ読む（画面を開き直すまで覚える） */
let cachedSettings: Promise<AccessSettings | null> | null = null;

function fetchSettings(): Promise<AccessSettings | null> {
    if (!cachedSettings) {
        cachedSettings = (async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            return loadAccessSettings(supabase, user.id);
        })().catch(() => null);
    }
    return cachedSettings;
}

function useSettings<T>(pick: (row: AccessSettings | null) => T, initial: T, deps: unknown[] = []): { loading: boolean; value: T } {
    const [state, setState] = useState<{ loading: boolean; value: T }>({ loading: true, value: initial });
    useEffect(() => {
        let alive = true;
        fetchSettings().then(row => { if (alive) setState({ loading: false, value: pick(row) }); });
        return () => { alive = false; };
        // pick は呼び出し側で毎回作られるので、deps で読み直しを決める
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
    return state;
}

export type PlanAccess = { loading: boolean; paid: boolean };

/** 有料の機能を使えるか。読み込み中は loading=true（その間は鍵も中身も出さない） */
export function usePlanAccess(): PlanAccess {
    const { loading, value } = useSettings(row => {
        const status = row?.subscription_status;
        return status === 'active' || status === 'trialing' || isInCourse(row?.course_end_date);
    }, false);
    return { loading, paid: value };
}

export type FeatureAccess = { loading: boolean; decision: FeatureDecision };

/**
 * プランごとの機能を使えるか（2026-10-04 かずき決定・ライトでは一部の機能を使えない）。決め方は lib/plan-features.ts。
 * 読み込み中は loading=true（その間は鍵も中身も出さない）
 */
export function useFeatureAccess(feature: GatedFeature): FeatureAccess {
    const { loading, value } = useSettings<FeatureDecision>(
        row => decideFeature(feature, { isFree: row?.is_free, status: row?.subscription_status, tier: row?.plan_tier, courseEndDate: row?.course_end_date }),
        { allowed: false, reason: 'needs_plan' },
        [feature],
    );
    return { loading, decision: value };
}

/**
 * 「見るだけ」か（2026-09-25 かずき決定・案B）。解約・支払いが止まった先生（無料の印なし）が true。
 * その間は、書き換える操作（削除・直す・予定・ASTAに聞く・生徒の追加など）を隠す。受講中の先生は見るだけにしない
 */
const LAPSED = ['canceled', 'past_due', 'unpaid', 'incomplete_expired'];

export function useReadOnly(): { loading: boolean; readOnly: boolean } {
    const { loading, value } = useSettings(row =>
        !!row && !row.is_free && LAPSED.includes(row.subscription_status ?? '') && !isInCourse(row.course_end_date),
    false);
    return { loading, readOnly: value };
}

export type CourseStatus = {
    loading: boolean;
    /** 受講中か（コースが終わる日まで） */
    inCourse: boolean;
    /** コースが終わる日（受講したことが無ければ null） */
    endDate: string | null;
    /** 終わる日までの残りの日数（受講中でなければ null） */
    daysLeft: number | null;
    /** 契約中か（受講中でも、自分で申し込んだ場合） */
    subscribed: boolean;
};

/** コンサルの受講の状態（2026-10-06）。料金の設定画面とホームの案内で使う */
export function useCourseStatus(): CourseStatus {
    const { loading, value } = useSettings(row => {
        const endDate = normalizeCourseEndDate(row?.course_end_date ?? null);
        const status = row?.subscription_status;
        return {
            inCourse: isInCourse(endDate),
            endDate,
            daysLeft: courseDaysLeft(endDate),
            subscribed: status === 'active' || status === 'trialing',
        };
    }, { inCourse: false, endDate: null as string | null, daysLeft: null as number | null, subscribed: false });
    return { loading, ...value };
}
