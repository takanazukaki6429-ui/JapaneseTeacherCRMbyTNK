import { describe, it, expect } from 'vitest';
import { generateMilestones, getPurposeMilestone } from '../generators';
import { getTranslations } from '@/app/(main)/roadmap/i18n';

// Mock translation object for testing
const mockT = getTranslations('ja');

describe('Roadmap Generators', () => {
    describe('getPurposeMilestone', () => {
        it('should return a string', () => {
            const result = getPurposeMilestone(['travel'], 10, mockT);
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('generateMilestones', () => {
        it('should generate correct number of milestones', () => {
            const months = 6;
            const milestones = generateMilestones(0, 20, months, ['travel'], mockT);
            expect(milestones).toHaveLength(months);
        });

        it('should increase level monthly', () => {
            const milestones = generateMilestones(0, 60, 6, ['work'], mockT);
            // levels should go up
            expect(milestones[5].level).toBeGreaterThan(milestones[0].level);
        });

        it('should include correct properties in milestone', () => {
            const milestones = generateMilestones(0, 20, 3, ['culture'], mockT);
            const m = milestones[0];
            expect(m).toHaveProperty('month');
            expect(m).toHaveProperty('level');
            expect(m).toHaveProperty('jlpt');
            expect(m).toHaveProperty('focus');
        });
    });
});
