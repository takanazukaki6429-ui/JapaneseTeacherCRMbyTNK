/**
 * v1.0 工程表 3.3: マスター教材の投入
 *
 * StructuredMaterial（構造化JSON）を受け取り、
 *   master_materials → master_material_sections → master_material_vocabulary
 * の3テーブルに投入する。管理者専用。
 *
 * RLS: master_*_admin_write ポリシー（管理者JWT）で書き込み可能。
 * 同一 (jlpt_level, lesson_number) が既存なら上書き（UNIQUE制約）。
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import { logAudit } from '@/lib/audit';
import { SECTION_ORDER } from '@/types/master-material';
import type { StructuredMaterial } from '@/types/master-material';

export const dynamic = 'force-dynamic';

const VALID_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!isAdminEmail(user?.email)) {
        return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    let material: StructuredMaterial;
    try {
        const body = await req.json();
        material = body.material as StructuredMaterial;
    } catch {
        return NextResponse.json({ error: '入力が不正です' }, { status: 400 });
    }

    // バリデーション
    if (!material || !VALID_LEVELS.includes(material.jlpt_level)) {
        return NextResponse.json({ error: 'jlpt_level が不正です（N5〜N1）' }, { status: 400 });
    }
    if (!Number.isInteger(material.lesson_number) || material.lesson_number < 1) {
        return NextResponse.json({ error: 'lesson_number が不正です' }, { status: 400 });
    }
    if (!material.title?.trim()) {
        return NextResponse.json({ error: 'title が必要です' }, { status: 400 });
    }

    try {
        // 1. 既存の同一課を削除（CASCADE で sections/vocab も消える）→ クリーン投入
        await supabase
            .from('master_materials')
            .delete()
            .eq('jlpt_level', material.jlpt_level)
            .eq('lesson_number', material.lesson_number);

        // 2. master_materials 本体
        const { data: inserted, error: matError } = await supabase
            .from('master_materials')
            .insert({
                jlpt_level: material.jlpt_level,
                lesson_number: material.lesson_number,
                title: material.title,
                grammar_points: material.grammar_points || [],
                topic_tags: material.topic_tags || [],
                source: 'aichan_genspark',
            })
            .select('id')
            .single();

        if (matError || !inserted) {
            throw new Error(matError?.message || 'master_materials insert failed');
        }
        const materialId = inserted.id;

        // 3. sections
        const sections = (material.sections || [])
            .filter(s => s.content_md?.trim())
            .map(s => ({
                master_material_id: materialId,
                section_type: s.section_type,
                section_order: SECTION_ORDER[s.section_type] ?? 99,
                content_md: s.content_md,
                image_prompt: s.image_prompt || null,
                example_sentences: s.example_sentences || [],
            }));
        if (sections.length > 0) {
            const { error: secError } = await supabase.from('master_material_sections').insert(sections);
            if (secError) throw new Error(`sections: ${secError.message}`);
        }

        // 4. vocabulary
        const vocab = (material.vocabulary || [])
            .filter(v => v.word?.trim())
            .map((v, i) => ({
                master_material_id: materialId,
                word: v.word,
                reading: v.reading || null,
                meaning_en: v.meaning_en || null,
                meaning_es: v.meaning_es || null,
                meaning_pt: v.meaning_pt || null,
                meaning_ko: v.meaning_ko || null,
                meaning_zh: v.meaning_zh || null,
                meaning_fr: v.meaning_fr || null,
                example_sentence: v.example_sentence || null,
                word_order: i,
            }));
        if (vocab.length > 0) {
            const { error: vocabError } = await supabase.from('master_material_vocabulary').insert(vocab);
            if (vocabError) throw new Error(`vocabulary: ${vocabError.message}`);
        }

        await logAudit({
            action: 'invite_code.create', // 監査enumに教材投入がないため暫定。将来 material.import を追加
            actorUserId: user!.id,
            actorEmail: user!.email,
            resourceType: 'master_material',
            resourceId: materialId,
            metadata: { jlpt: material.jlpt_level, lesson: material.lesson_number, sections: sections.length, vocab: vocab.length },
            req,
        });

        return NextResponse.json({
            success: true,
            materialId,
            summary: {
                title: material.title,
                level: material.jlpt_level,
                lesson: material.lesson_number,
                sections: sections.length,
                vocabulary: vocab.length,
            },
        });
    } catch (e) {
        return NextResponse.json(
            { error: '投入に失敗しました', detail: e instanceof Error ? e.message : String(e) },
            { status: 500 }
        );
    }
}
