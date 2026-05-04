/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Plus, Sparkles, BookOpen } from 'lucide-react';

export const revalidate = 0;

async function getDashboardData() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { studentCount: 0, monthlyLessonCount: 0, upcomingLessons: [], recentHistory: [], lessonPrice: 3000 };
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const now = new Date().toISOString();

  const [studentCountResult, monthlyResult, upcomingResult, historyResult, avgUnderstandingResult, homeworkResult] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('lessons').select('*, students!inner(user_id)', { count: 'exact', head: true })
      .eq('students.user_id', user.id).gte('date', startOfMonth.toISOString()),
    supabase.from('lessons').select('*, students!inner(name, user_id)')
      .eq('students.user_id', user.id).eq('status', 'scheduled')
      .order('date', { ascending: true }).limit(3),
    supabase.from('lessons').select('*, students!inner(name, user_id)')
      .eq('students.user_id', user.id).lt('date', now)
      .or('status.eq.completed,status.is.null')
      .order('date', { ascending: false }).limit(3),
    supabase.from('lessons').select('understanding_level, students!inner(user_id)')
      .eq('students.user_id', user.id).gte('date', startOfMonth.toISOString())
      .not('understanding_level', 'is', null),
    supabase.from('lessons').select('homework, students!inner(user_id)', { count: 'exact', head: true })
      .eq('students.user_id', user.id).gte('date', startOfMonth.toISOString())
      .not('homework', 'is', null).neq('homework', ''),
  ]);

  const understandingData = avgUnderstandingResult.data || [];
  const avgUnderstanding = understandingData.length > 0
    ? Math.round((understandingData.reduce((sum: number, l: any) => sum + (l.understanding_level || 0), 0) / understandingData.length) * 10) / 10
    : null;

  return {
    studentCount: studentCountResult.count || 0,
    monthlyLessonCount: monthlyResult.count || 0,
    upcomingLessons: upcomingResult.data || [],
    recentHistory: historyResult.data || [],
    avgUnderstanding,
    homeworkCount: homeworkResult.count || 0,
  };
}

export default async function Home() {
  const { studentCount, monthlyLessonCount, upcomingLessons, recentHistory, avgUnderstanding, homeworkCount } = await getDashboardData();
  const nextLesson = upcomingLessons[0] as any;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <p className="text-xs font-medium text-[#4b454e] mb-0.5">おかえりなさい</p>
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1c1e]">今日のレッスン</h1>
      </div>

      {/* Next lesson banner */}
      {nextLesson ? (
        <div className="bg-gradient-to-br from-[#6f5385] to-[#c9a8e0] rounded-2xl p-6 flex items-center justify-between gap-4 shadow-[0_8px_48px_rgba(111,83,133,0.25)]">
          <div>
            <p className="text-[13px] text-white/80 mb-0.5">
              {new Date(nextLesson.date).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 〜
            </p>
            <h2 className="text-xl font-bold text-white tracking-tight">{nextLesson.students?.name}</h2>
            <p className="text-sm text-white/80 mt-0.5">次回予定レッスン</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link
              href={`/students/${nextLesson.student_id}/lessons/prepare?scheduledLessonId=${nextLesson.id}`}
              className="px-4 py-2.5 bg-white/20 text-white border border-white/30 rounded-xl text-sm font-semibold hover:bg-white/30 transition-colors"
            >
              準備する
            </Link>
            <Link
              href={`/students/${nextLesson.student_id}/lessons/live`}
              className="px-4 py-2.5 bg-white text-[#6f5385] rounded-xl text-sm font-bold hover:scale-[1.02] transition-transform"
            >
              ▶ 今すぐ開始
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-[#6f5385] to-[#c9a8e0] rounded-2xl p-6 shadow-[0_8px_48px_rgba(111,83,133,0.25)]">
          <p className="text-white/80 text-sm mb-3">予定されているレッスンはありません</p>
          <Link
            href="/students"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#6f5385] rounded-xl text-sm font-bold hover:scale-[1.02] transition-transform"
          >
            生徒一覧へ
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* 直近の動き (3/5) */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-[0_0_50px_rgba(111,83,133,0.06)]">
          <p className="text-[10px] font-bold tracking-[0.06em] uppercase text-[#6f5385] bg-[#f2daff] px-2 py-0.5 rounded-full inline-block mb-3">直近の動き</p>
          <h3 className="font-bold text-[#1a1c1e] mb-4">アクティビティ</h3>

          {recentHistory.length === 0 ? (
            <div className="text-center py-8 text-sm text-[#4b454e]">
              完了したレッスンはありません
            </div>
          ) : (
            <div className="space-y-0">
              {recentHistory.map((lesson: any, i: number) => (
                <div key={lesson.id}>
                  <div className="flex items-start gap-3 py-3">
                    <div className="w-9 h-9 rounded-full bg-[#f2daff] flex items-center justify-center text-base flex-shrink-0 mt-0.5">
                      📖
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1a1c1e]">
                        レッスン記録 — {lesson.students?.name}
                      </p>
                      <p className="text-xs text-[#4b454e] mt-0.5">
                        {lesson.topics || 'トピック未記録'} · {formatDate(lesson.date)}
                      </p>
                    </div>
                    {lesson.homework && (
                      <div className="text-xs bg-[#eddcf4] text-[#655a6f] px-2 py-1 rounded-lg font-medium flex-shrink-0">
                        宿題あり
                      </div>
                    )}
                  </div>
                  {i < recentHistory.length - 1 && (
                    <div className="h-px bg-[#f4f3f7]" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats + Quick Actions (2/5) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Stats */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_0_50px_rgba(111,83,133,0.06)]">
            <p className="text-[10px] font-bold tracking-[0.06em] uppercase text-[#6f5385] bg-[#f2daff] px-2 py-0.5 rounded-full inline-block mb-3">今月の実績</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: monthlyLessonCount, label: 'レッスン数' },
                { value: studentCount, label: '生徒数' },
                { value: avgUnderstanding != null ? `${avgUnderstanding}/5` : '—', label: '平均理解度' },
                { value: homeworkCount, label: '宿題設定回数' },
              ].map((s) => (
                <div key={s.label} className="bg-[#f4f3f7] rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-[#6f5385] leading-tight">{s.value}</p>
                  <p className="text-[10px] text-[#4b454e] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_0_50px_rgba(111,83,133,0.06)]">
            <h3 className="font-bold text-[#1a1c1e] mb-3 text-sm">クイックアクション</h3>
            <div className="grid grid-cols-3 gap-2">
              <Link
                href="/students/new"
                className="flex flex-col items-center gap-1.5 p-3 bg-[#f4f3f7] rounded-xl text-center hover:bg-[#f2daff] hover:-translate-y-0.5 transition-all"
              >
                <Plus size={20} className="text-[#6f5385]" />
                <span className="text-[11px] font-semibold text-[#1a1c1e]">生徒追加</span>
              </Link>
              <Link
                href="/ai-tools"
                className="flex flex-col items-center gap-1.5 p-3 bg-[#f4f3f7] rounded-xl text-center hover:bg-[#f2daff] hover:-translate-y-0.5 transition-all"
              >
                <Sparkles size={20} className="text-[#6f5385]" />
                <span className="text-[11px] font-semibold text-[#1a1c1e]">AI提案</span>
              </Link>
              <Link
                href="/lessons"
                className="flex flex-col items-center gap-1.5 p-3 bg-[#f4f3f7] rounded-xl text-center hover:bg-[#f2daff] hover:-translate-y-0.5 transition-all"
              >
                <BookOpen size={20} className="text-[#6f5385]" />
                <span className="text-[11px] font-semibold text-[#1a1c1e]">記録する</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
