import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Student } from '@/types/student';
import { EditStudentForm } from './edit-form';

async function getStudent(id: string): Promise<Student | null> {
    const supabase = await createClient();
    const { data, error } = await supabase.from('students').select('*').eq('id', id).single();
    if (error || !data) return null;
    return data as Student;
}

type Props = { params: Promise<{ id: string }> };

export default async function EditStudentPage({ params }: Props) {
    const { id } = await params;
    const student = await getStudent(id);
    if (!student) notFound();

    return <EditStudentForm student={student} />;
}
