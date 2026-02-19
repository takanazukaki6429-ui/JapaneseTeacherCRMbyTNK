import { Database } from './supabase';

export type Lesson = {
    id: string;
    created_at: string;
    student_id: string;
    date: string;
    topics: string | null;      // 文法・トピック
    vocabulary: string | null;  // 語彙
    mistakes: string | null;    // つまずき・弱点
    content: string | null;     // 自由記述・メモ (Legacy content)
    understanding_level: number | null; // 1-5
    homework: string | null;
    next_goal: string | null;
    materials: string | null;   // 使用教材
    ai_log: Database['public']['Tables']['lessons']['Row']['ai_log'];         // JSONB type for AI logs
    // Status for scheduling
    status?: 'scheduled' | 'completed' | 'cancelled';
};
