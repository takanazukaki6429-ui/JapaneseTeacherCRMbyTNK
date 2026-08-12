import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { LessonContent } from '../lesson-content';
import { SectionNav } from './section-nav';
import {
    SECTION_LABELS,
    MASTER_MATERIAL_BUCKET,
    type MasterMaterialRow,
    type MasterMaterialSectionRow,
} from '@/types/master-material';

export const revalidate = 0;

type Props = { params: Promise<{ id: string }> };

export default async function TextbookLessonPage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: lesson } = await supabase
        .from('master_materials')
        .select('id, jlpt_level, lesson_number, lesson_sub, lesson_label, title, image_count')
        .eq('id', id)
        .single();

    if (!lesson) notFound();
    const material = lesson as MasterMaterialRow;

    const { data: sectionData } = await supabase
        .from('master_material_sections')
        .select('section_type, section_order, content_md, images')
        .eq('master_material_id', id)
        .order('section_order', { ascending: true });

    const sections = (sectionData ?? []) as MasterMaterialSectionRow[];

    // 画像はStorageの公開URLで配信する。本文中の /images/<level>/<lesson>/x.webp を
    // <公開URL>/<level>/<lesson>/x.webp に読み替える
    const imageBaseUrl =
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${MASTER_MATERIAL_BUCKET}`;

    return (
        <div className="space-y-5">
            <Link
                href={`/materials/textbook?level=${material.jlpt_level}`}
                className="inline-flex items-center gap-1.5 text-sm text-[#6f5385] hover:underline"
            >
                <ArrowLeft size={15} />
                教科書一覧に戻る
            </Link>

            <div className="bg-white px-5 py-4 rounded-2xl shadow-[0_0_40px_rgba(111,83,133,0.06)]">
                <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 text-[11px] font-bold bg-[#f2daff] text-[#6f5385] rounded-full">
                        {material.jlpt_level}
                    </span>
                    <span className="px-2.5 py-0.5 text-[11px] font-bold bg-[#f4f3f7] text-[#4b454e] rounded-full">
                        {material.lesson_label ?? `第${material.lesson_number}課`}
                    </span>
                </div>
                <h1 className="text-lg font-bold text-[#1a1c1e] leading-snug">{material.title}</h1>
            </div>

            {sections.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border-2 border-dashed border-[#cdc3ce]/40 text-center">
                    <BookOpen size={32} className="text-[#cdc3ce] mb-3" />
                    <p className="text-sm text-[#4b454e]">この課の中身がまだ登録されていません。</p>
                </div>
            ) : (
                <>
                    <SectionNav
                        sections={sections.map(s => ({
                            id: `sec-${s.section_order}`,
                            label: SECTION_LABELS[s.section_type] ?? s.section_type,
                        }))}
                    />

                    <div className="space-y-4">
                        {sections.map(section => (
                            <section
                                key={section.section_order}
                                id={`sec-${section.section_order}`}
                                className="bg-white px-5 py-4 rounded-2xl shadow-[0_0_40px_rgba(111,83,133,0.06)] scroll-mt-4"
                            >
                                <h2 className="text-sm font-bold text-[#6f5385] mb-3 pb-2 border-b border-[#f4f3f7]">
                                    {SECTION_LABELS[section.section_type] ?? section.section_type}
                                </h2>
                                <LessonContent contentMd={section.content_md} imageBaseUrl={imageBaseUrl} />
                            </section>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
