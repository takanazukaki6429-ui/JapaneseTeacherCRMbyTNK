
export type PurposeId = 'anime' | 'friends' | 'travel' | 'culture' | 'live' | 'work' | 'beauty' | 'challenge' | 'other';

export type Distribution = {
    grammar: number;
    vocabulary: number;
    conversation: number;
    reading: number;
    listening: number;
};

export type JlptLevelData = {
    name: string;
    minLevel: number;
    maxLevel: number;
    hours: number;
    color: string;
};

export type Milestone = {
    month: number;
    level: number;
    jlpt: string;
    jlptColor: string;
    focus: string[];
    skills: string[];
    reason: string;
    textbooks: string[];
    aiPrompt: string;
    purposeMilestone: string;
    lessonsNeeded: number;
};
