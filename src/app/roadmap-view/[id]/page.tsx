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

function NotAvailable() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#faf9fd] p-6">
            <div className="bg-white rounded-2xl p-8 text-center max-w-sm shadow-[0_0_40px_rgba(111,83,133,0.06)] space-y-2">
                <p className="font-bold text-[#1a1c1e]">このリンクは期限切れか、見つかりません。</p>
                <p className="text-sm text-[#4b454e]">This link has expired or cannot be found. Please ask your teacher for a new link.</p>
            </div>
        </div>
    );
}

export default async function RoadmapViewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!UUID_RE.test(id)) return <NotAvailable />;

    const admin = createAdminClient();
    const { data: link } = await admin
        .from('shared_links')
        .select('teacher_id, student_id, roadmap_data')
        .eq('id', id)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
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
