'use client';

/**
 * 生徒の1枚の「本日の授業指針」の帯（2026-09-17 かずき決定：授業前の1枚の自動作成）
 *
 * ASTAが作った授業前の1枚があれば、その指針の一文を出す。無ければその場で作る。
 * 作っている間と、作れなかったときは、前回のつまずきから作る決まった形の文を出す（今までと同じ）。
 */
import { useEffect, useRef, useState } from 'react';
import { Lightbulb, Loader2 } from 'lucide-react';
import { generatePrepSheet, loadPrepSheet, prepStamp, type PrepSource } from '@/lib/prep-sheet';
import { usePlanAccess } from '@/lib/plan-access';

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
    const access = usePlanAccess();
    const srcRef = useRef(source);
    srcRef.current = source;
    const stamp = prepStamp(source.lastDate);

    useEffect(() => {
        if (access.loading) return;
        let alive = true;
        const run = async () => {
            await Promise.resolve();
            const cached = loadPrepSheet(studentId, stamp);
            if (cached?.guide) {
                if (alive) setGuide(cached.guide);
                return;
            }
            if (!srcRef.current.lastDate) return;   // 授業記録がまだ無いときは作らない
            if (!access.paid) return;
            if (alive) setWorking(true);
            try {
                const sheet = await generatePrepSheet(studentId, stamp, srcRef.current, 'prep_sheet');
                if (alive && sheet.guide) setGuide(sheet.guide);
            } catch (err) {
                console.error('[prep-guide] 作れませんでした', err);
            } finally {
                if (alive) setWorking(false);
            }
        };
        run();
        return () => { alive = false; };
    }, [studentId, stamp, access.loading, access.paid]);

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
