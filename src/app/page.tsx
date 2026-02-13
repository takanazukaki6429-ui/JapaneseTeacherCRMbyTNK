
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Users, Calendar, BookOpen, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';

export const revalidate = 0;

async function getDashboardData() {
  const supabase = await createClient();
  const now = new Date().toISOString();

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

  // 3. Upcoming Lessons (Future)
  const { data: upcomingLessons } = await supabase
    .from('lessons')
    // @ts-ignore - Supabase join query types are tricky without generated types
    .select('*, students(name)')
    .gte('date', now)
    .order('date', { ascending: true })
    .limit(3);

  // 4. Recent History (Past) mainly for Homework check
  const { data: recentHistory } = await supabase
    .from('lessons')
    // @ts-ignore
    .select('*, students(name)')
    .lt('date', now)
    .order('date', { ascending: false })
    .limit(3);

  return {
    studentCount: studentCount || 0,
    monthlyLessonCount: monthlyLessonCount || 0,
    upcomingLessons: upcomingLessons || [],
    recentHistory: recentHistory || [],
  };
}

export default async function Home() {
  const { studentCount, monthlyLessonCount, upcomingLessons, recentHistory } = await getDashboardData();

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
          <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center text-teal-600">
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
            <p className="text-3xl font-bold text-slate-900">¥{(monthlyLessonCount * 3000).toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center text-yellow-600">
            <span className="font-bold text-lg">¥</span>
          </div>
          {/* Mock calculation: 3000 yen per lesson */}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Upcoming Lessons */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Clock size={20} className="text-teal-600" />
              これからの予定
            </h3>
            <Link href="/students" className="text-sm text-teal-600 hover:underline">カレンダー (未)</Link>
          </div>

          {upcomingLessons.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <p className="text-sm text-slate-500">予定されているレッスンはありません。</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingLessons.map((lesson: any) => (
                <div key={lesson.id} className="flex items-start gap-4 p-4 rounded-lg border border-slate-100 bg-slate-50/50">
                  <div className="w-14 flex-shrink-0 text-center bg-white rounded-lg border border-slate-200 p-2">
                    <span className="block text-xs text-slate-500 font-bold uppercase">{new Date(lesson.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                    <span className="block text-xl font-bold text-slate-800">{new Date(lesson.date).getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-slate-900 truncate">{lesson.students?.name}</h4>
                      <span className="text-xs font-medium bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
                        {new Date(lesson.date).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-1">{lesson.next_goal || '目標未設定'}</p>
                  </div>
                </div>
              ))}
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
