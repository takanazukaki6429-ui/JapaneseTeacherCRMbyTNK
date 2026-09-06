/**
 * Google Cloud 認証クライアント初期化
 *
 * GOOGLE_APPLICATION_CREDENTIALS_JSON（環境変数に1行JSON）から
 * Speech-to-Text v2 / Translation v3 のクライアントを生成する。
 *
 * - サーバーサイド専用（認証鍵を含むため）
 * - クライアントはモジュールレベルでメモ化（コールドスタート以外は再利用）
 */

import { v2 as SpeechV2 } from '@google-cloud/speech';
import { v2 as TranslateV2 } from '@google-cloud/translate';

type Credentials = {
    client_email: string;
    private_key: string;
    project_id: string;
};

let cachedCreds: Credentials | null = null;
const speechClients: Record<string, SpeechV2.SpeechClient> = {};   // 接続先（global / us …）ごとに1つ
let translateClient: TranslateV2.Translate | null = null;

function getCredentials(): Credentials {
    if (cachedCreds) return cachedCreds;
    const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!raw) {
        throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON is not set');
    }
    const parsed = JSON.parse(raw);
    cachedCreds = {
        client_email: parsed.client_email,
        // 環境変数経由だと \n がエスケープされている場合があるため復元
        private_key: String(parsed.private_key).replace(/\\n/g, '\n'),
        project_id: parsed.project_id,
    };
    return cachedCreds;
}

export function getProjectId(): string {
    return process.env.GOOGLE_CLOUD_PROJECT_ID || getCredentials().project_id;
}

export function getSpeechClient(location = 'global'): SpeechV2.SpeechClient {
    if (speechClients[location]) return speechClients[location];
    const creds = getCredentials();
    speechClients[location] = new SpeechV2.SpeechClient({
        projectId: creds.project_id,
        credentials: {
            client_email: creds.client_email,
            private_key: creds.private_key,
        },
        // global 以外は地域ごとの接続先（例: us-speech.googleapis.com）。Chirp 3 は global では使えない
        ...(location !== 'global' ? { apiEndpoint: `${location}-speech.googleapis.com` } : {}),
    });
    return speechClients[location];
}

export function getTranslateClient(): TranslateV2.Translate {
    if (translateClient) return translateClient;
    const creds = getCredentials();
    translateClient = new TranslateV2.Translate({
        projectId: creds.project_id,
        credentials: {
            client_email: creds.client_email,
            private_key: creds.private_key,
        },
    });
    return translateClient;
}

export function isGoogleCloudConfigured(): boolean {
    return !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
}
