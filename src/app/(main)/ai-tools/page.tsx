import { redirect } from 'next/navigation';

/**
 * AIツールの画面は消した（2026-10-09 かずき決定）。画面からの入口が無く、ホームの「ASTAに聞く」と同じ働きだったため。
 * 前の住所を開いた時は、ホームへ移す
 */
export default function AiToolsPage() {
    redirect('/');
}
