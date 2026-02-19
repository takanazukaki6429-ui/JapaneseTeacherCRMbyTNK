import { test, expect } from '@playwright/test';

test.describe('Roadmap Generation Flow', () => {
    // Skipped: Requires authenticated session.
    // To enable: seed a test user or mock auth state.
    test.skip('should generate and save a roadmap', async ({ page }) => {
        // 1. Login (Skipped)
        // await page.goto('/login');
        // await page.getByLabel('メールアドレス').fill('test@example.com');
        // ...

        // 2. Navigate to Student Page
        await page.goto('/students/student-id/roadmap');

        // 3. Fill Form
        // Check if form is visible
        await expect(page.getByRole('heading', { name: '学習プランを作成・編集' })).toBeVisible();

        // Select Purpose
        await page.getByRole('button', { name: 'ビジネス' }).click();

        // Set Level
        const levelInput = page.locator('input[type="number"]').first();
        await levelInput.fill('30');

        // Click Generate
        await page.getByRole('button', { name: 'ロードマップを作成する' }).click();

        // 4. Verify Result
        await expect(page.getByText('Your Study Plan Overview')).toBeVisible();

        // 5. Save
        await page.getByRole('button', { name: 'プロフィールに保存' }).click();
    });
});
