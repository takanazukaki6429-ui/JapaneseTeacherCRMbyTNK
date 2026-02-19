import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test('should redirect to /login if not authenticated', async ({ page }) => {
        // Navigate to dashboard
        await page.goto('/');

        // Expect to be redirected to login
        await expect(page).toHaveURL(/\/login/);
        await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
    });

    test('should render login form correctly', async ({ page }) => {
        await page.goto('/login');

        await expect(page.getByLabel('メールアドレス')).toBeVisible();
        await expect(page.getByLabel('パスワード')).toBeVisible();
        await expect(page.locator('form').getByRole('button', { name: 'ログイン' })).toBeVisible();
    });
});
