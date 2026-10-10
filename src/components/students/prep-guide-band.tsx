'use client';

/**
 * 生徒情報の「本日の授業指針」の帯（2026-09-17 かずき決定：授業前の1枚の自動作成）
 *
 * ASTAが作った授業前の1枚があれば、その指針の一文を出す。無ければその場で作る。
 * 作っている間と、作れなかったときは、前回のつまずきから作る決まった形の文を出す（今までと同じ）。
 * フリートークのネタ（2026-10-09・9-3）を使える先生は、作るときに材料（直近5回の記録・生徒のメモ・授業中の会話）を読み直して一緒に作る。
 * 保存済みの1枚にフリートークが無い（この機能より前に作った）ときは、1回だけ作り直す。
 */
import { useEffect, useRef, useState } from 'react';
import { Lightbulb, Loader2 } from 'lucide-react';
import { generatePrepSheet, loadPrepSheet, loadPrepSource, missingFreeTalk, prepStamp, type PrepSource } from '@/lib/prep-sheet';
import { useFeatureAccess } from '@/lib/plan-access';
import { createClient } from '@/lib/supabase/client';

type Props = {
    studentId: string;
    source: PrepSource;
    /** 前回のつまずき（決まった形の文を作るのに使う） */
    fallbackMistakes: string | null;
};

const shorten = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}…` : text);

export function PrepGuideBand({ studentId, source, fallbackMistakes }: Props) {
    const [guide, setGuide] = useState<string | null>(null);
    const [working, setWorking] = useState(false);

    // ASTAが1枚を作るのは有料の機能（2026-09-24 案A）。無料の先生は、今までどおり前回のつまずきからの決まった文
    // ライトでも作らない（2026-10-04 かずき決定・lib/plan-features.ts）。決まった文はそのまま出す
    const prepAuto = useFeatureAccess('prep_sheet');
    const freeTalk = useFeatureAccess('free_talk');   // フリートークのネタ（レギュラー以上・2026-10-05）
    const access = {
        loading: prepAuto.loading || freeTalk.loading,
        paid: prepAuto.decision.allowed,
        freeTalk: freeTalk.decision.allowed,
    };
    const srcRef = useRef(source);
    srcRef.current = source;
    const stamp = prepStamp(source.lastDate);

    useEffect(() => {
        if (access.loading) return;
        let alive = true;
        const run = async () => {
            await Promise.resolve();
            const cached = loadPrepSheet(studentId, stamp);
            if (cached?.guide && alive) setGuide(cached.guide);
            if (cached?.guide && !missingFreeTalk(cached, access.freeTalk)) return;
            if (!srcRef.current.lastDate) return;   // 授業記録がまだ無いときは作らない
            if (!access.paid) return;
            if (alive) setWorking(true);
            try {
                // 材料を読み直せなかったときは、今までの材料（前回の記録だけ）で作る
                const full = await loadPrepSource(createClient(), studentId, { withTalks: access.freeTalk }).catch(() => null);
                const sheet = await generatePrepSheet(studentId, stamp, full ?? srcRef.current, 'prep_sheet', { freeTalk: access.freeTalk });
                if (alive && sheet.guide) setGuide(sheet.guide);
            } catch (err) {
                console.error('[prep-guide] 作れませんでした', err);
            } finally {
                if (alive) setWorking(false);
            }
        };
        run();
        return () => { alive = false; };
    }, [studentId, stamp, access.loading, access.paid, access.freeTalk]);

    const fallback = fallbackMistakes
        ? `前回のつまずき「${shorten(fallbackMistakes, 40)}」を5分ほど復習してから、今日の課に入ると理解が深まります。`
        : null;
    const text = guide ?? fallback;
    if (!text) return null;

    return (
        <section className="mb-8 w-full bg-[#dff1ea] border border-[#bfe3d4] rounded-xl px-5 py-3.5 flex items-start gap-3 text-[15px] leading-[26px] text-[#3a3350]">
            <Lightbulb size={18} className="text-[#2a6f5a] mt-1 flex-shrink-0" />
            <p>
                <strong className="text-[#2a6f5a]">本日の授業指針：</strong>{text}
                {working && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-[#2a6f5a]">
                        <Loader2 size={12} className="animate-spin" /> ASTAが今日の1枚を用意しています
                    </span>
                )}
            </p>
        </section>
    );
}
