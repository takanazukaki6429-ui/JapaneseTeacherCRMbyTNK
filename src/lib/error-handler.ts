/**
 * error-handler.ts
 * 
 * Centralized utility for mapping various system errors (specifically Supabase Auth and API errors)
 * into user-friendly Japanese messages combined with specific actionable troubleshooting steps.
 */

export interface AppError {
    title: string;
    message: string;
    action: string;
    isRateLimit?: boolean;
}

/**
 * Parses any error object into a structured Japanese AppError.
 */
export function parseAppError(error: unknown): AppError {
    const defaultError: AppError = {
        title: 'エラーが発生しました',
        message: '予期せぬエラーが発生しました。',
        action: '画面を更新（リロード）して、もう一度お試しください。それでも直らない場合は管理者にお問い合わせください。'
    };

    if (!error) return defaultError;

    const errMsg = typeof error === 'string' ? error : (error as Error).message || '';

    // -- Supabase Auth Specific Errors --

    if (errMsg.toLowerCase().includes('email rate limit exceeded')) {
        return {
            title: 'システム保護（上限超過）',
            message: '短時間に多数の登録・メール送信リクエストが行われたため、スパム防止機能が作動しました。',
            action: 'システム保護のため、約1時間ほど時間をおいてから再度お試しください。テスト環境の場合は、別のメールアドレスをお試しいただくか、一時的にメール認証をOFFにする運用をご検討ください。',
            isRateLimit: true
        };
    }

    if (errMsg.toLowerCase().includes('invalid login credentials')) {
        return {
            title: 'ログイン失敗',
            message: 'メールアドレスまたはパスワードが間違っています。',
            action: '入力内容に間違いがないか、また不要な半角スペースが入っていないかをご確認の上、もう一度お試しください。'
        };
    }

    if (errMsg.toLowerCase().includes('user already registered')) {
        return {
            title: '登録済みのアカウント',
            message: '入力されたメールアドレスは既に登録されています。',
            action: 'ログイン画面に戻り、ご登録済みのパスワードでログインしてください。'
        };
    }

    if (errMsg.toLowerCase().includes('email address') && errMsg.toLowerCase().includes('invalid')) {
        return {
            title: '無効なメールアドレス形式',
            message: '入力されたメールアドレスのドメインが形式を満たしていないか、実在しない形式です。',
            action: '正しい形式のメールアドレス（例: gmail.com など）を入力しているかご確認ください。ダミーアドレスでテストする場合は「test12345@gmail.com」等の実際に使われているドメインにしてください。'
        };
    }

    if (errMsg.toLowerCase().includes('password should be at least')) {
        return {
            title: 'パスワードが短すぎます',
            message: '設定されたパスワードの文字数が不足しています。',
            action: 'セキュリティのため、パスワードは6文字以上で設定してください。'
        };
    }

    // -- App Specific API Errors --

    if (errMsg.includes('無効な招待コード')) {
        return {
            title: '招待コードが無効です',
            message: '入力された招待コードが存在しないか、間違っています。',
            action: 'コードの入力を間違えていないか（大文字・小文字、ハイフンの有無等）をご確認ください。'
        };
    }

    if (errMsg.includes('既に使用されています')) {
        return {
            title: '使用済みの招待コード',
            message: 'この招待コードは既に別のアカウント作成で使用されているため、無効です。',
            action: 'コンサルタント（管理者）に連絡し、新しい「1回使いきり」の招待コードを再発行してもらってください。'
        };
    }

    // If it's just a generic Network Error
    if (errMsg.toLowerCase().includes('fetch') || errMsg.toLowerCase().includes('network')) {
        return {
            title: '通信エラー',
            message: 'サーバーとの通信に失敗しました。',
            action: 'インターネット接続状況をご確認の上、しばらく経ってから再度操作してください。'
        };
    }

    // Fallback: Just return the raw message translated loosely or wrapped nicely
    return {
        title: 'エラー',
        message: errMsg || '何らかのエラーが発生しました。',
        action: 'システムが一時的に不安定な可能性があります。画面を更新して再度お試しください。'
    };
}

import { toast } from 'sonner';

/**
 * Parses an error and displays a standardized, user-friendly Japanese toast notification.
 */
export function showAppError(error: unknown, customTitle?: string) {
    const parsed = parseAppError(error);
    if (customTitle) parsed.title = customTitle;

    toast.error(parsed.title, {
        description: `${parsed.message}\n💡 対処: ${parsed.action}`,
        duration: 8000,
    });
}
