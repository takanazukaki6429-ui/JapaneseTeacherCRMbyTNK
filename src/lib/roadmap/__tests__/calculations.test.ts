import { describe, it, expect } from 'vitest';
import { getLessonDistribution, calculateTotalHours } from '../calculations';

describe('Roadmap Calculations', () => {
    describe('getLessonDistribution', () => {
        it('should return correct distribution for "business" (work) purpose', () => {
            const dist = getLessonDistribution(30, ['work']);
            // Business: High conversation/honorifics
            // Based on constants: grammar: 10, vocabulary: 20, conversation: 50, reading: 10, listening: 10
            expect(dist.conversation).toBeGreaterThan(20);
        });

        it('should return correct distribution for "anime" purpose', () => {
            const dist = getLessonDistribution(30, ['anime']);
            // Anime: High listening/vocab
            expect(dist.listening).toBeGreaterThan(20);
        });

        it('should average distributions for multiple purposes', () => {
            const dist = getLessonDistribution(30, ['work', 'anime']);
            // Should be somewhere in between
            expect(dist.conversation).toBeGreaterThan(0);
            expect(dist.listening).toBeGreaterThan(0);
        });
    });

    describe('calculateTotalHours', () => {
        it('should calculate hours correctly between levels', () => {
            // N5 is roughly 0-20, 150 hours
            // So level 0 to 20 should be ~150 hours
            const hours = calculateTotalHours(0, 20);
            expect(hours).toBeCloseTo(150, -1); // Approx check
        });

        it('should return 0 if current level >= target level', () => {
            expect(calculateTotalHours(50, 40)).toBe(0);
        });
    });
});
