import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./tests/setup.ts'],
        // e2e/ は画面の自動テスト（Playwright）用。単体テストの道具が拾うと
        // 読み込みに失敗して常に赤になるため、ここでは見ない。
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/.next/**',
            '**/e2e/**',
            '**/.{idea,git,cache,output,temp}/**',
        ],
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
