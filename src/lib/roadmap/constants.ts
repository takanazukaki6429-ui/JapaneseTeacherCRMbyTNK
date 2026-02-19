
import {
    BookText, PenLine, MessageCircle, BookOpen, Headphones,
    Gamepad2, Heart, Plane, Landmark, Home, Briefcase, Sparkles, Brain, MoreHorizontal
} from 'lucide-react';
import { PurposeId, JlptLevelData } from './types';

export const JLPT_LEVELS: JlptLevelData[] = [
    { name: 'N5', minLevel: 0, maxLevel: 20, hours: 150, color: '#22c55e' },
    { name: 'N4', minLevel: 20, maxLevel: 40, hours: 300, color: '#84cc16' },
    { name: 'N3', minLevel: 40, maxLevel: 60, hours: 450, color: '#eab308' },
    { name: 'N2', minLevel: 60, maxLevel: 80, hours: 600, color: '#f97316' },
    { name: 'N1', minLevel: 80, maxLevel: 100, hours: 900, color: '#ef4444' },
];

export const LESSON_TYPE_ICONS = [
    { id: 'grammar', icon: BookText, color: '#3b82f6' },
    { id: 'vocabulary', icon: PenLine, color: '#8b5cf6' },
    { id: 'conversation', icon: MessageCircle, color: '#10b981' },
    { id: 'reading', icon: BookOpen, color: '#f59e0b' },
    { id: 'listening', icon: Headphones, color: '#ec4899' },
] as const;

export const PURPOSE_ICONS = {
    anime: { icon: Gamepad2, color: '#e11d48' },
    friends: { icon: Heart, color: '#ec4899' },
    travel: { icon: Plane, color: '#0ea5e9' },
    culture: { icon: Landmark, color: '#f59e0b' },
    live: { icon: Home, color: '#22c55e' },
    work: { icon: Briefcase, color: '#6366f1' },
    beauty: { icon: Sparkles, color: '#a855f7' },
    challenge: { icon: Brain, color: '#f97316' },
    other: { icon: MoreHorizontal, color: '#64748b' },
} as const;

export const PURPOSE_LESSON_MULTIPLIER: Record<string, number> = {
    anime: 1.0,
    friends: 1.1,
    travel: 0.9,
    culture: 0.9,
    live: 1.1,
    work: 1.2,
    beauty: 0.8,
    challenge: 1.0,
    other: 1.0,
};
