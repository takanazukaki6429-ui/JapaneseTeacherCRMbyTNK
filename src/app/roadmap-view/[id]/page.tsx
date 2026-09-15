/**
 * 先生が生徒に渡すロードマップ（ログイン不要）
 *
 * 住所の番号 = shared_links の id（推測できない長い番号）。期限切れ・見つからない場合は案内だけ出す。
 * 生徒側はログインしないので、読み取りは管理者権限で行い、出す項目をここで絞る：
 *   生徒の名前・先生の表示名・ロードマップの材料（今のレベル・目標・期間・目的）のみ。
 * 開くたびに生徒の最新の記録から作り直す（授業でレベルを更新すれば中身も変わる）。
 */
import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { roadmapInputFromStudent } from '@/lib/roadmap/from-student';
import { locales, type Locale } from '@/app/(main)/roadmap/i18n';
import { RoadmapView } from './RoadmapView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Japanese Learning Roadmap',
    robots: { index: false, follow: false },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 開けないときの案内。reason は止まった理由（先生・運営が原因を切り分けるため。本番では中身の文は出さない） */
function NotAvailable({ reason }: { reason?: string }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f6f3fb] p-6">
            <div className="bg-white rounded-2xl p-8 text-center max-w-sm shadow-[0_0_40px_rgba(107,92,165,0.06)] space-y-2">
                <p className="font-bold text-[#3a3350]">このリンクは期限切れか、見つかりません。</p>
                <p className="text-sm text-[#484550]">This link has expired or cannot be found. Please ask your teacher for a new link.</p>
                {reason && <p className="text-xs text-[#797581] pt-2">{reason}</p>}
            </div>
        </div>
    );
}

export default async function RoadmapViewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!UUID_RE.test(id)) return <NotAvailable />;

    // 読み込みの途中で止まったら、真っ白なエラー画面ではなく理由を1行出す（2026-09-15：ブランチ環境で原因を切り分けるため）
    try {
        return await loadRoadmap(id);
    } catch (e) {
        console.error('[roadmap-view] 読み込みに失敗', e);
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('SUPABASE_SERVICE_ROLE_KEY')) {
            return <NotAvailable reason="理由：サーバーの設定（管理用の鍵）が、この環境に入っていません" />;
        }
        const showDetail = process.env.VERCEL_ENV !== 'production';   // ブランチ環境だけ、止まった理由の文を短く出す
        return <NotAvailable reason={`理由：読み込みに失敗しました${showDetail ? `（${msg.slice(0, 120)}）` : ''}`} />;
    }
}

async function loadRoadmap(id: string) {
    const admin = createAdminClient();
    const { data: link, error: linkError } = await admin
        .from('shared_links')
        .select('teacher_id, student_id, roadmap_data')
        .eq('id', id)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
    if (linkError) throw linkError;
    if (!link?.student_id || !link.teacher_id) return <NotAvailable />;

    // 先生本人の生徒であることも確かめる（リンクを作った先生と生徒の持ち主が一致しなければ出さない）
    const { data: student } = await admin
        .from('students')
        .select('name, jlpt_level, current_phase, purposes')
        .eq('id', link.student_id)
        .eq('user_id', link.teacher_id)
        .maybeSingle();
    const input = roadmapInputFromStudent(student);
    if (!student || !input) return <NotAvailable />;

    const { data: settings } = await admin
        .from('user_settings')
        .select('display_name')
        .eq('user_id', link.teacher_id)
        .maybeSingle();

    const saved = (link.roadmap_data as { locale?: string } | null)?.locale;
    const initialLocale: Locale = saved && saved in locales ? (saved as Locale) : 'en';

    return (
        <RoadmapView
            studentName={student.name as string}
            teacherName={(settings?.display_name as string | undefined) ?? null}
            input={input}
            initialLocale={initialLocale}
        />
    );
}
