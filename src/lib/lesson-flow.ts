/**
 * 授業の流れを保存して、あとから見返せるようにする（案3フル版・かずき決定 2026-09-20）
 *
 * ライブ授業の中央に並ぶ「授業の流れ」（発話・ASTAの提案・絵・例文・練習問題・言い換え・
 * 質問と答え・教科書）を、授業を終えたときにまるごと残す。
 *
 * 直す前の状態：絵も例文も練習問題も言い換えも、どこにも保存されず画面を閉じると消えていた
 * （絵はデータの塊のままブラウザに返していて、置き場を一切通っていなかった）。
 *
 * 作り：
 *   - 文字は表 lesson_flows の items に、そのまま入れる
 *   - 絵は置き場（Storage の lesson-images）へ上げ、items には住所だけを持つ
 *     → 表が重くならず、見るときだけ期限つきの住所を作って表示する
 *   - 置き場の中は先生ごとのフォルダに分ける（権限がフォルダ名で効く）
 *
 * 表と置き場を作るSQL：strategy/sql_2026-09-20_授業の流れを保存する.sql
 */
import { createClient } from '@/lib/supabase/client';

const BUCKET = 'lesson-images';

/** 見返すときに作る住所の有効時間（秒）。1時間 */
const SIGNED_URL_TTL = 60 * 60;

/**
 * 保存した授業の流れを何日で消すか（かずき決定 2026-09-20：90日）
 * 無制限に貯めると置き場の容量と原価が読めなくなるため。
 * 消す仕事は「授業を終えて保存した直後」に、その先生の分だけ静かに走らせる
 * （別の仕組みを増やさずに済み、データが増える場面でだけ動く）
 */
const KEEP_DAYS = 90;

/** 保存する1項目。ライブ授業の FlowItem から、残す価値のある物だけを写す */
export type SavedFlowItem = {
    kind: string;
    title?: string;
    text?: string;
    translation?: string;
    /** 絵の置き場の住所（データの塊ではない） */
    imgPath?: string;
    /** 教科書のページの画像（もともと住所なのでそのまま持つ） */
    imgs?: string[];
    /** いつ流れに出たか */
    ts: string;
};

/** ライブ授業から受け取る形（page.tsx の FlowItem のうち、保存に要る分だけ） */
export type SourceFlowItem = {
    kind: string;
    title?: string;
    text?: string;
    translation?: string;
    img?: string;
    imgs?: string[];
    ts: Date | string;
};

/** 見返すときに使う形 */
export type LessonFlowRow = {
    id: string;
    student_id: string;
    lesson_id: string | null;
    items: SavedFlowItem[];
    image_count: number;
    created_at: string;
};

/** 残さない種類。運用のお知らせは後から見ても意味がない */
const SKIP_KINDS = new Set(['notice']);

/** data:image/png;base64,xxxx を、置き場へ上げられる形に変える */
function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } | null {
    const m = /^data:(image\/(png|jpeg|webp));base64,(.+)$/.exec(dataUrl);
    if (!m) return null;
    const mime = m[1];
    const ext = m[2] === 'jpeg' ? 'jpg' : m[2];
    try {
        const bin = atob(m[3]);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return { blob: new Blob([bytes], { type: mime }), ext };
    } catch {
        return null;
    }
}

/**
 * 授業の流れを保存する。
 * 絵は1枚ずつ置き場へ上げる。1枚失敗してもその絵をあきらめるだけで、全体は保存する。
 * 返り値：保存できたら行の番号、できなかったら null（呼ぶ側は授業を止めない）
 */
export async function saveLessonFlow(params: {
    studentId: string;
    lessonId: string | null;
    items: SourceFlowItem[];
}): Promise<{ id: string; imageCount: number } | null> {
    const supabase = createClient();

    const { data: auth } = await supabase.auth.getUser();
    const teacherId = auth.user?.id;
    if (!teacherId) return null;

    const stamp = Date.now();
    const saved: SavedFlowItem[] = [];
    let imageCount = 0;

    for (let i = 0; i < params.items.length; i++) {
        const it = params.items[i];
        if (SKIP_KINDS.has(it.kind)) continue;

        const row: SavedFlowItem = {
            kind: it.kind,
            title: it.title,
            text: it.text,
            translation: it.translation,
            imgs: it.imgs,
            ts: it.ts instanceof Date ? it.ts.toISOString() : String(it.ts),
        };

        // 絵（データの塊）だけ置き場へ上げて、住所に置き換える
        if (it.img?.startsWith('data:image/')) {
            const converted = dataUrlToBlob(it.img);
            if (converted) {
                const path = `${teacherId}/${params.studentId}/${stamp}-${i}.${converted.ext}`;
                const { error } = await supabase.storage
                    .from(BUCKET)
                    .upload(path, converted.blob, { contentType: converted.blob.type, upsert: false });
                if (!error) {
                    row.imgPath = path;
                    imageCount++;
                } else {
                    // 上げられなかった絵は、文字だけ残して先へ進む（授業を止めない）
                    console.error('授業の流れ：絵の保存に失敗', error.message);
                    row.text = row.text ?? '（この絵は保存できませんでした）';
                }
            }
        }

        saved.push(row);
    }

    if (saved.length === 0) return null;

    const { data, error } = await supabase
        .from('lesson_flows')
        .insert({
            teacher_id: teacherId,
            student_id: params.studentId,
            lesson_id: params.lessonId,
            items: saved,
            image_count: imageCount,
        })
        .select('id')
        .single();

    if (error) {
        console.error('授業の流れの保存に失敗', error.message);
        return null;
    }

    // 90日より古い分を片付ける。待たない（失敗しても授業の終わりに影響させない）
    void purgeOldFlows(teacherId);

    return { id: data.id as string, imageCount };
}

/**
 * 90日より古い授業の流れを消す（絵の実体 → 表の行 の順）。
 * 自分の分だけが対象（権限の仕組みで、他の先生の分は触れない）。
 */
export async function purgeOldFlows(teacherId: string): Promise<number> {
    const supabase = createClient();

    const cutoff = new Date(Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: old, error } = await supabase
        .from('lesson_flows')
        .select('id, items')
        .eq('teacher_id', teacherId)
        .lt('created_at', cutoff);

    if (error || !old || old.length === 0) return 0;

    // 先に絵の実体を消す（行だけ消すと、置き場に絵が残り続けてしまう）
    const paths = (old as { items: SavedFlowItem[] }[])
        .flatMap(r => (r.items ?? []).map(i => i.imgPath))
        .filter((p): p is string => !!p);

    if (paths.length > 0) {
        const { error: rmError } = await supabase.storage.from(BUCKET).remove(paths);
        // 絵を消せなかったときは行を残す（次回もう一度試せるようにする）
        if (rmError) {
            console.error('古い絵の削除に失敗', rmError.message);
            return 0;
        }
    }

    const ids = (old as { id: string }[]).map(r => r.id);
    const { error: delError } = await supabase.from('lesson_flows').delete().in('id', ids);
    if (delError) {
        console.error('古い授業の流れの削除に失敗', delError.message);
        return 0;
    }
    return ids.length;
}

/** 授業の番号が無いときに「直前の授業」とみなす時間（時間） */
const RECENT_FALLBACK_HOURS = 12;

/**
 * 保存した授業の流れを読み出す。
 *
 * - 授業の番号があれば、その授業の分だけを返す
 * - 番号が無いとき（授業を終えた直後に、予定と紐づかない記録を書いている場面）は、
 *   その生徒の一番新しい分を返す。ただし直近12時間以内に保存された物に限る。
 *   時間で区切らないと、後日まっさらな記録を開いたときに前の授業の流れが出てしまう
 */
export async function loadLessonFlow(params: {
    studentId: string;
    lessonId?: string | null;
}): Promise<LessonFlowRow | null> {
    const supabase = createClient();

    let query = supabase
        .from('lesson_flows')
        .select('id, student_id, lesson_id, items, image_count, created_at')
        .eq('student_id', params.studentId);

    if (params.lessonId) {
        query = query.eq('lesson_id', params.lessonId);
    } else {
        const since = new Date(Date.now() - RECENT_FALLBACK_HOURS * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', since);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (error || !data) return null;
    return data as LessonFlowRow;
}

/**
 * 授業の記録を保存したときに、その記録と「まだどの記録にも結びついていない授業の流れ」を繋ぐ。
 *
 * 予定から始めなかった授業は、流れを保存する時点では記録の番号がまだ存在しない
 * （記録は授業のあとで作られるため）。繋いでおかないと、あとで記録を開き直したときに
 * その授業の流れを引けなくなる。
 *
 * 対象は「直近12時間以内・記録の番号が空」の一番新しい1件だけ。
 */
export async function linkLessonFlow(studentId: string, lessonId: string): Promise<boolean> {
    const supabase = createClient();
    const since = new Date(Date.now() - RECENT_FALLBACK_HOURS * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('lesson_flows')
        .select('id')
        .eq('student_id', studentId)
        .is('lesson_id', null)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data) return false;

    const { error: upError } = await supabase
        .from('lesson_flows')
        .update({ lesson_id: lessonId })
        .eq('id', (data as { id: string }).id);

    return !upError;
}

/** その生徒の、保存済みの授業の流れを新しい順に並べる（見出しだけ） */
export async function listLessonFlows(studentId: string, limit = 20): Promise<LessonFlowRow[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('lesson_flows')
        .select('id, student_id, lesson_id, items, image_count, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error || !data) return [];
    return data as LessonFlowRow[];
}

/**
 * 置き場に入れた絵を見るための、期限つきの住所をまとめて作る。
 * 置き場は非公開なので、住所を知っていても本人以外は開けない。
 */
export async function signImagePaths(paths: string[]): Promise<Record<string, string>> {
    if (paths.length === 0) return {};
    const supabase = createClient();
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL);
    if (error || !data) return {};

    const map: Record<string, string> = {};
    data.forEach(d => {
        if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
    });
    return map;
}
