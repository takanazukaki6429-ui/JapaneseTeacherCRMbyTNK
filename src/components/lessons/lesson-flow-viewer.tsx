'use client';

/**
 * 授業の流れを見返す（案3フル版・かずき決定 2026-09-20）
 *
 * ライブ授業で作った物（絵・例文・練習問題・やさしく言い換え・質問と答え・
 * 先生と生徒の発話・ASTAの提案・教科書）を、授業のあとから並べて見られるようにする。
 * 絵は置き場から期限つきの住所を作って表示する。
 *
 * 置き場所は2つ：
 *   - LessonFlowViewer      … 授業の記録の画面（その授業の1回ぶん）
 *   - StudentLessonFlows    … 生徒の1枚（過去の授業の一覧・2026-09-20 かずき指示で追加）
 */
import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, History } from 'lucide-react';
import { loadLessonFlow, listLessonFlows, signImagePaths, type LessonFlowRow } from '@/lib/lesson-flow';
import { LessonFlowItems, dateOf } from './lesson-flow-items';

/** 行に含まれる絵の住所を全部集める */
function pathsOf(rows: LessonFlowRow[]): string[] {
    return rows
        .flatMap(r => (r.items ?? []).flatMap(i => [i.imgPath, i.imgAltPath]))
        .filter((p): p is string => !!p);
}

/** 何が入っているかの一言（「絵2枚・作った教材3件」など） */
function summaryOf(row: LessonFlowRow): string {
    const parts: string[] = [`${row.items.length}件`];
    if (row.image_count > 0) parts.push(`絵${row.image_count}枚`);
    const materials = row.items.filter(i => i.kind === 'material').length;
    if (materials > 0) parts.push(`作った教材${materials}件`);
    return parts.join('・');
}

// ────────────────────────────────────────────
// ① 授業の記録の画面：その授業の1回ぶん
// ────────────────────────────────────────────
export function LessonFlowViewer({ studentId, lessonId }: { studentId: string; lessonId: string | null }) {
    const [row, setRow] = useState<LessonFlowRow | null>(null);
    const [signed, setSigned] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        let alive = true;

        (async () => {
            setLoading(true);
            const found = await loadLessonFlow({ studentId, lessonId });
            if (!alive) return;
            setRow(found);

            if (found) {
                const paths = pathsOf([found]);
                if (paths.length > 0) {
                    const map = await signImagePaths(paths);
                    if (alive) setSigned(map);
                }
            }
            if (alive) setLoading(false);
        })();

        return () => { alive = false; };
    }, [studentId, lessonId]);

    if (loading) {
        return (
            <div className="mt-6 flex items-center gap-2 text-sm text-[#484550]">
                <Loader2 size={14} className="animate-spin" /> 授業の流れを読み込んでいます…
            </div>
        );
    }

    if (!row || row.items.length === 0) return null;

    return (
        <div className="mt-6 border border-[#e3ddf2] rounded-xl overflow-hidden bg-white">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-[#f9f7fe] transition-colors"
            >
                <span className="text-[15px] font-bold text-[#3a3350]">
                    この授業でASTAが作った物（{summaryOf(row)}）
                </span>
                {open ? <ChevronDown size={18} className="text-[#6b5ca5]" /> : <ChevronRight size={18} className="text-[#6b5ca5]" />}
            </button>

            {open && (
                <div className="px-4 pb-4 border-t border-[#efeaf8] pt-3">
                    <LessonFlowItems items={row.items} signed={signed} />
                </div>
            )}
        </div>
    );
}

// ────────────────────────────────────────────
// ② 生徒の1枚：過去の授業の中身を見る（一覧）
// ────────────────────────────────────────────
export function StudentLessonFlows({ studentId }: { studentId: string }) {
    const [rows, setRows] = useState<LessonFlowRow[]>([]);
    const [signed, setSigned] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [openId, setOpenId] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;

        (async () => {
            setLoading(true);
            const found = await listLessonFlows(studentId, 20);
            if (!alive) return;
            setRows(found);
            setLoading(false);
        })();

        return () => { alive = false; };
    }, [studentId]);

    // 開いた授業の絵だけ、そのとき住所を作る（一覧を開いた時点では作らない）
    useEffect(() => {
        if (!openId) return;
        const row = rows.find(r => r.id === openId);
        if (!row) return;

        const paths = pathsOf([row]).filter(p => !signed[p]);
        if (paths.length === 0) return;

        let alive = true;
        (async () => {
            const map = await signImagePaths(paths);
            if (alive) setSigned(prev => ({ ...prev, ...map }));
        })();
        return () => { alive = false; };
    }, [openId, rows, signed]);

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-[#484550]">
                <Loader2 size={14} className="animate-spin" /> 読み込んでいます…
            </div>
        );
    }

    // 保存された授業がまだ無い生徒では、枠ごと出さない
    if (rows.length === 0) return null;

    return (
        <div className="bg-white rounded-xl border border-[#e3ddf2] p-4">
            <h3 className="flex items-center gap-2 text-[15px] font-bold text-[#3a3350] mb-3">
                <History size={16} className="text-[#6b5ca5]" />
                過去の授業の中身
            </h3>

            <div className="space-y-2">
                {rows.map(row => {
                    const open = openId === row.id;
                    return (
                        <div key={row.id} className="border border-[#efeaf8] rounded-lg overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setOpenId(open ? null : row.id)}
                                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-[#f9f7fe] transition-colors"
                            >
                                <span className="text-[14px] text-[#3a3350]">
                                    <b>{dateOf(row.created_at)}</b>
                                    <span className="ml-2 text-[13px] text-[#484550]">{summaryOf(row)}</span>
                                </span>
                                {open ? <ChevronDown size={16} className="text-[#6b5ca5] shrink-0" /> : <ChevronRight size={16} className="text-[#6b5ca5] shrink-0" />}
                            </button>

                            {open && (
                                <div className="px-3 pb-3 border-t border-[#efeaf8] pt-3">
                                    <LessonFlowItems items={row.items} signed={signed} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <p className="mt-3 text-[12px] text-[#807a8d]">
                授業中にASTAが作った物は90日間残ります。
            </p>
        </div>
    );
}
