export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            students: {
                Row: {
                    id: string
                    user_id: string // Added to match actual DB usage
                    created_at: string
                    updated_at: string
                    name: string
                    nationality: string | null
                    jlpt_level: string | null
                    goal_text: string | null
                    textbook: string | null
                    current_phase: string | null
                    memo: string | null
                    initial_hearing_done: boolean
                    // teacher_id: string | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    created_at?: string
                    updated_at?: string
                    name: string
                    nationality?: string | null
                    jlpt_level?: string | null
                    goal_text?: string | null
                    textbook?: string | null
                    current_phase?: string | null
                    memo?: string | null
                    email?: string | null
                    initial_hearing_done?: boolean
                }
                Update: {
                    id?: string
                    user_id?: string
                    created_at?: string
                    updated_at?: string
                    name?: string
                    nationality?: string | null
                    jlpt_level?: string | null
                    goal_text?: string | null
                    textbook?: string | null
                    current_phase?: string | null
                    memo?: string | null
                    email?: string | null
                    initial_hearing_done?: boolean
                }
            }
            lessons: {
                Row: {
                    id: string
                    created_at: string
                    user_id: string | null
                    student_id: string
                    date: string
                    content: string | null          // メモ欄（旧フィールド）
                    topics: string | null            // 授業トピック
                    vocabulary: string | null        // 語彙
                    mistakes: string | null          // 間違い・課題
                    materials: string | null         // 使用教材
                    status: string | null            // ステータス
                    understanding_level: number | null
                    homework: string | null
                    next_goal: string | null
                    ai_log: Json | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    user_id?: string | null
                    student_id: string
                    date: string
                    content?: string | null
                    topics?: string | null
                    vocabulary?: string | null
                    mistakes?: string | null
                    materials?: string | null
                    status?: string | null
                    understanding_level?: number | null
                    homework?: string | null
                    next_goal?: string | null
                    ai_log?: Json | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    user_id?: string | null
                    student_id?: string
                    date?: string
                    content?: string | null
                    topics?: string | null
                    vocabulary?: string | null
                    mistakes?: string | null
                    materials?: string | null
                    status?: string | null
                    understanding_level?: number | null
                    homework?: string | null
                    next_goal?: string | null
                    ai_log?: Json | null
                }
            }
            ai_usage_log: {
                Row: {
                    id: string
                    created_at: string
                    user_id: string
                    model: string | null
                    prompt_type: string | null
                    token_usage: number | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    user_id: string
                    model?: string | null
                    prompt_type?: string | null
                    token_usage?: number | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    user_id?: string
                    model?: string | null
                    prompt_type?: string | null
                    token_usage?: number | null
                }
            }
        }
    }
}