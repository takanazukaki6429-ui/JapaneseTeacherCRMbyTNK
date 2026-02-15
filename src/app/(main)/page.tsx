import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Users, Calendar, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';

export const revalidate = 0;

async function getDashboardData() {
  const supabase = await createClient();
  const now = new Date().toISOString();

  // 0. Fetch User Settings
  // Note: For now we just get the first record or default. 
  // In real multi-user auth, we should filter by authenticated user.
  // Since we are in server component, we can get user first.
  const { data: { user } } = await supabase.auth.getUser();
  let lessonPrice = 3000;

  if (user) {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('default_lesson_price')
      .eq('user_id', user.id)
      .single();

    if (settings?.default_lesson_price) {
      lessonPrice = settings.default_lesson_price;
    }
  }

  // 1. Total Students
  const { count: studentCount } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true });

  // 2. Month Lessons Count
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const { count: monthlyLessonCount } = await supabase
    .from('lessons')
    .select('*', { count: 'exact', head: true })
    .gte('date', startOfMonth.toISOString());

  // 3. Upcoming Lessons (Scheduled)
  const { data: upcomingLessons } = await supabase
    .from('lessons')
    // @ts-ignore
    .select('*, students(name)')
    // Filter by scheduled status. 
    // Note: If you want to see all future lessons regardless of status, use .gte('date', now) only.
    // But for "Scheduled" specifically:
    .eq('status', 'scheduled')
    .order('date', { ascending: true })
    .limit(5);

  // 4. Recent History (Past) mainly for Homework check
  // We want lessons that are EITHER completed OR (scheduled but in the past/completed)
  // For simplicity, let's just show all past lessons, or specifically completed ones if we trust status.
  // Let's stick to time-based for history to be safe for now, or use 'completed' status if consistent.
  // Given migration just ran, 'completed' is safe for old data.
  const { data: recentHistory } = await supabase
    .from('lessons')
    // @ts-ignore
    .select('*, students(name)')
    .lt('date', now)
    .or('status.eq.completed,status.is.null') // Only show completed or legacy records
    .order('date', { ascending: false })
    .limit(3);

  return {
    studentCount: studentCount || 0,
    monthlyLessonCount: monthlyLessonCount || 0,
    upcomingLessons: upcomingLessons || [], // Handle null
    recentHistory: recentHistory || [], // Handle null
    lessonPrice: lessonPrice,
  };
}

export default async function Home() {
  const { studentCount, monthlyLessonCount, upcomingLessons, recentHistory, lessonPrice } = await getDashboardData();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">ダッシュボード</h1>
          <p className="text-slate-500 text-sm mt-1">今日のレッスンの準備はできていますか？</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-500 mb-1 text-sm">今月のレッスン数</h3>
            <p className="text-3xl font-bold text-slate-900">{monthlyLessonCount}</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
            <Calendar size={24} />
          </div>
        </div>
        <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-500 mb-1 text-sm">総生徒数</h3>
            <p className="text-3xl font-bold text-slate-900">{studentCount}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
            <Users size={24} />
          </div>
        </div>
        <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-500 mb-1 text-sm">今月の売上 (概算)</h3>
            <p className="text-3xl font-bold text-slate-900">¥{(monthlyLessonCount * lessonPrice).toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center text-yellow-600">
            <span className="font-bold text-lg">¥</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Upcoming Lessons */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Clock size={20} className="text-amber-600" />
              これからの予定 (次のレッスン)
            </h3>
            <Link href="/students" className="text-sm text-amber-600 hover:underline">生徒一覧へ</Link>
          </div>

          {upcomingLessons.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <p className="text-sm text-slate-500">予定されているレッスンはありません。</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingLessons.map((lesson: any) => {
                const lessonDate = new Date(lesson.date);
                const isOverdue = lessonDate < new Date();

                return (
                  <div key={lesson.id} className={`flex items-start gap-4 p-4 rounded-lg border ${isOverdue ? 'border-red-100 bg-red-50/30' : 'border-slate-100 bg-slate-50/50'}`}>
                    <div className={`w-14 flex-shrink-0 text-center bg-white rounded-lg border ${isOverdue ? 'border-red-200 text-red-600' : 'border-slate-200'} p-2`}>
                      <span className="block text-xs text-slate-500 font-bold uppercase">{lessonDate.toLocaleDateString('en-US', { month: 'short' })}</span>
                      <span className="block text-xl font-bold text-slate-800">{lessonDate.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-slate-900 truncate">{lesson.students?.name}</h4>
                        <Link
                          href={`/students/${lesson.student_id}/lessons/prepare?scheduledLessonId=${lesson.id}`}
                          className="text-xs font-bold bg-amber-500 text-white px-3 py-1.5 rounded-full hover:bg-amber-600 transition-colors shadow-sm"
                        >
                          準備 / 開始
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`px-2 py-0.5 rounded-full font-medium ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
                          {lessonDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isOverdue && <span className="text-red-500 font-bold">過ぎています</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Homework Check */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-blue-600" />
              前回の宿題確認
            </h3>
            <Link href="/students" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              すべて見る <ArrowRight size={14} />
            </Link>
          </div>

          {recentHistory.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <p className="text-sm text-slate-500">完了したレッスンはありません。</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentHistory.map((lesson: any) => (
                <div key={lesson.id} className="p-4 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-slate-900 text-sm">{lesson.students?.name}</h4>
                    <span className="text-xs text-slate-400">{formatDate(lesson.date)}</span>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs font-bold text-blue-700 mb-1">宿題</p>
                    <p className="text-sm text-slate-700 font-medium line-clamp-2">
                      {lesson.homework || '宿題なし'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
