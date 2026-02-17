export type Student = {
    id: string;
    user_id: string;
    created_at: string;
    name: string;
    nationality: string | null;
    jlpt_level: string | null;
    goal_text: string | null;
    purposes: string | null; // Comma separated IDs
    textbook: string | null;
    current_phase: string | null;
    memo: string | null;
};
