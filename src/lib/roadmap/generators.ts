
import { PurposeId } from './types';
import { JLPT_LEVELS, PURPOSE_LESSON_MULTIPLIER } from './constants';
import { type Translations } from '@/app/(main)/roadmap/i18n';

export function getDistributionReason(purposeIds: PurposeId[], currentLevel: number, t: Translations): string {
    if (purposeIds.length === 0) return t.distributionReasons.other[currentLevel < 40 ? 'beginner' : 'advanced'];

    const reasons = purposeIds.map(pid => {
        const r = t.distributionReasons[pid as keyof typeof t.distributionReasons] || t.distributionReasons.other;
        return r[currentLevel < 40 ? 'beginner' : 'advanced'];
    });

    if (purposeIds.length > 1) {
        const labels = purposeIds.map(pid => t.purposes[pid as keyof typeof t.purposes]?.label).join(' & ');
        return `${labels}の両方を叶えるために最適化されたプランです。\n` + reasons[0]; // Simplified for UI space
    }
    return reasons[0];
}

export function getPurposeMilestone(purposeIds: PurposeId[], monthLevel: number, t: Translations): string {
    const selectedIds = purposeIds.length > 0 ? purposeIds : ['other'];
    const milestones: string[] = [];

    // Combine distinct milestone phrases from all purposes
    const thresholds = [15, 25, 40, 55, 70, 85, 100];
    let thresholdIdx = thresholds.length - 1;
    for (let i = 0; i < thresholds.length; i++) {
        if (monthLevel <= thresholds[i]) {
            thresholdIdx = i;
            break;
        }
    }

    selectedIds.forEach((pid: string) => { // pid is string here because selectedIds is string[] effectively or closely mapped
        const texts = t.purposeMilestones[pid as keyof typeof t.purposeMilestones] || t.purposeMilestones.other;
        milestones.push(texts[thresholdIdx]);
    });

    // Deduplicate and join
    return Array.from(new Set(milestones)).join(' / ');
}

export function generateMilestones(currentLevel: number, targetLevel: number, months: number, purposeIds: PurposeId[], t: Translations) {
    const milestones = [];
    const levelPerMonth = (targetLevel - currentLevel) / months;

    const selectedIds = purposeIds.length > 0 ? purposeIds : (['other'] as PurposeId[]);

    // Calculate max multiplier for safety (taking the most demanding purpose)
    let maxMultiplier = 1.0;
    selectedIds.forEach(pid => {
        const m = PURPOSE_LESSON_MULTIPLIER[pid] || 1.0;
        if (m > maxMultiplier) maxMultiplier = m;
    });

    for (let i = 1; i <= months; i++) {
        const monthLevel = currentLevel + (levelPerMonth * i);
        const jlptLevel = JLPT_LEVELS.find(l => monthLevel >= l.minLevel && monthLevel < l.maxLevel) || JLPT_LEVELS[4];

        // Select content based on level range index (0-6)
        let contentIdx = 0;
        if (monthLevel < 15) contentIdx = 0;
        else if (monthLevel < 25) contentIdx = 1;
        else if (monthLevel < 40) contentIdx = 2;
        else if (monthLevel < 55) contentIdx = 3;
        else if (monthLevel < 70) contentIdx = 4;
        else if (monthLevel < 85) contentIdx = 5;
        else contentIdx = 6;

        // Collect and average/merge content from all purposes
        let combinedFocus: string[] = [];
        let combinedSkills: string[] = [];
        let combinedTextbooks: string[] = [];
        const combinedPrompts: string[] = [];
        const uniqueReasons: string[] = [];

        selectedIds.forEach(pid => {
            const pContent = t.purposeMonthlyContent[pid as keyof typeof t.purposeMonthlyContent] || t.purposeMonthlyContent.other;
            if (pContent.focus[contentIdx]) combinedFocus.push(...pContent.focus[contentIdx]);
            if (pContent.skills[contentIdx]) combinedSkills.push(...pContent.skills[contentIdx]);
            if (pContent.textbooks[contentIdx]) combinedTextbooks.push(...pContent.textbooks[contentIdx]);
            if (pContent.aiPrompt[contentIdx]) combinedPrompts.push(pContent.aiPrompt[contentIdx]);
            if (pContent.reasons[contentIdx]) uniqueReasons.push(pContent.reasons[contentIdx]);
        });

        // Deduplicate
        combinedFocus = Array.from(new Set(combinedFocus)).slice(0, 5); // Limit count
        combinedSkills = Array.from(new Set(combinedSkills)).slice(0, 5);
        combinedTextbooks = Array.from(new Set(combinedTextbooks));

        milestones.push({
            month: i,
            level: Math.round(monthLevel),
            jlpt: jlptLevel.name,
            jlptColor: jlptLevel.color,
            focus: combinedFocus,
            skills: combinedSkills,
            reason: uniqueReasons[0] || "", // Just take first reason to avoid clutter
            textbooks: combinedTextbooks,
            aiPrompt: combinedPrompts.join(" / "),

            purposeMilestone: getPurposeMilestone(selectedIds, monthLevel, t),
            lessonsNeeded: Math.ceil(levelPerMonth * 2 * maxMultiplier),
        });
    }
    return milestones;
}

export function getLevelDescription(level: number, t: Translations) {
    if (level < 20) return t.levelDescriptions.n5;
    if (level < 40) return t.levelDescriptions.n4;
    if (level < 60) return t.levelDescriptions.n3;
    if (level < 80) return t.levelDescriptions.n2;
    if (level < 95) return t.levelDescriptions.n1;
    return t.levelDescriptions.nativeLevel;
}
