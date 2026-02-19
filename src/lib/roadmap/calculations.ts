
import { PurposeId, Distribution } from './types';
import { PURPOSE_LESSON_MULTIPLIER, JLPT_LEVELS } from './constants';

export function getLessonDistribution(currentLevel: number, purposeIds: PurposeId[]): Distribution {
    const purposeDistributions: Record<string, Distribution[]> = {
        anime: [
            { grammar: 25, vocabulary: 25, conversation: 10, reading: 15, listening: 25 },
            { grammar: 20, vocabulary: 20, conversation: 15, reading: 15, listening: 30 },
            { grammar: 15, vocabulary: 20, conversation: 15, reading: 20, listening: 30 },
            { grammar: 10, vocabulary: 15, conversation: 20, reading: 25, listening: 30 },
        ],
        friends: [
            { grammar: 25, vocabulary: 20, conversation: 30, reading: 10, listening: 15 },
            { grammar: 20, vocabulary: 15, conversation: 35, reading: 10, listening: 20 },
            { grammar: 15, vocabulary: 15, conversation: 40, reading: 10, listening: 20 },
            { grammar: 10, vocabulary: 10, conversation: 45, reading: 10, listening: 25 },
        ],
        travel: [
            { grammar: 20, vocabulary: 30, conversation: 30, reading: 10, listening: 10 },
            { grammar: 15, vocabulary: 25, conversation: 35, reading: 10, listening: 15 },
            { grammar: 15, vocabulary: 20, conversation: 35, reading: 15, listening: 15 },
            { grammar: 10, vocabulary: 20, conversation: 35, reading: 15, listening: 20 },
        ],
        culture: [
            { grammar: 25, vocabulary: 25, conversation: 15, reading: 25, listening: 10 },
            { grammar: 20, vocabulary: 20, conversation: 15, reading: 30, listening: 15 },
            { grammar: 20, vocabulary: 20, conversation: 15, reading: 30, listening: 15 },
            { grammar: 15, vocabulary: 15, conversation: 20, reading: 30, listening: 20 },
        ],
        live: [
            { grammar: 25, vocabulary: 25, conversation: 25, reading: 15, listening: 10 },
            { grammar: 20, vocabulary: 25, conversation: 25, reading: 15, listening: 15 },
            { grammar: 20, vocabulary: 20, conversation: 25, reading: 20, listening: 15 },
            { grammar: 15, vocabulary: 20, conversation: 25, reading: 20, listening: 20 },
        ],
        work: [
            { grammar: 30, vocabulary: 25, conversation: 20, reading: 15, listening: 10 },
            { grammar: 25, vocabulary: 20, conversation: 25, reading: 15, listening: 15 },
            { grammar: 20, vocabulary: 20, conversation: 25, reading: 20, listening: 15 },
            { grammar: 20, vocabulary: 15, conversation: 25, reading: 20, listening: 20 },
        ],
        beauty: [
            { grammar: 25, vocabulary: 30, conversation: 10, reading: 25, listening: 10 },
            { grammar: 20, vocabulary: 30, conversation: 10, reading: 25, listening: 15 },
            { grammar: 20, vocabulary: 25, conversation: 15, reading: 25, listening: 15 },
            { grammar: 15, vocabulary: 25, conversation: 15, reading: 25, listening: 20 },
        ],
        challenge: [
            { grammar: 25, vocabulary: 25, conversation: 20, reading: 15, listening: 15 },
            { grammar: 25, vocabulary: 25, conversation: 20, reading: 15, listening: 15 },
            { grammar: 20, vocabulary: 20, conversation: 20, reading: 20, listening: 20 },
            { grammar: 20, vocabulary: 20, conversation: 20, reading: 20, listening: 20 },
        ],
        other: [
            { grammar: 25, vocabulary: 25, conversation: 20, reading: 15, listening: 15 },
            { grammar: 20, vocabulary: 20, conversation: 25, reading: 17, listening: 18 },
            { grammar: 20, vocabulary: 20, conversation: 25, reading: 17, listening: 18 },
            { grammar: 15, vocabulary: 15, conversation: 30, reading: 20, listening: 20 },
        ],
    };

    // If no purpose selected, fallback to 'other'
    const selectedIds = purposeIds.length > 0 ? purposeIds : (['other'] as PurposeId[]);

    // Initialize sums
    const sums: Distribution = { grammar: 0, vocabulary: 0, conversation: 0, reading: 0, listening: 0 };

    selectedIds.forEach(id => {
        const dists = purposeDistributions[id as string] || purposeDistributions.other;
        let d: Distribution;
        if (currentLevel < 20) d = dists[0];
        else if (currentLevel < 40) d = dists[1];
        else if (currentLevel < 60) d = dists[2];
        else d = dists[3];

        sums.grammar += d.grammar;
        sums.vocabulary += d.vocabulary;
        sums.conversation += d.conversation;
        sums.reading += d.reading;
        sums.listening += d.listening;
    });

    // Calculate averages
    const count = selectedIds.length;
    return {
        grammar: Math.round(sums.grammar / count),
        vocabulary: Math.round(sums.vocabulary / count),
        conversation: Math.round(sums.conversation / count),
        reading: Math.round(sums.reading / count),
        listening: Math.round(sums.listening / count)
    };
}

export function calculateTotalHours(currentLevel: number, targetLevel: number, purposeIds: PurposeId[] = []) {
    let baseHours = 0;
    for (const level of JLPT_LEVELS) {
        const overlapStart = Math.max(currentLevel, level.minLevel);
        const overlapEnd = Math.min(targetLevel, level.maxLevel);
        if (overlapStart < overlapEnd) {
            const portion = (overlapEnd - overlapStart) / (level.maxLevel - level.minLevel);
            baseHours += level.hours * portion;
        }
    }

    // Apply strict multiplier based on the most demanding purpose
    let maxMultiplier = 1.0;
    if (purposeIds.length > 0) {
        purposeIds.forEach(pid => {
            const m = PURPOSE_LESSON_MULTIPLIER[pid] || 1.0;
            if (m > maxMultiplier) maxMultiplier = m;
        });
    }

    return Math.round(baseHours * maxMultiplier);
}
