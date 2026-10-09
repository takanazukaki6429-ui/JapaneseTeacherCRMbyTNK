import { redirect } from 'next/navigation';

/**
 * 授業の一覧（全生徒の予定と記録）の画面は消した（2026-10-09 かずき決定）。画面からの入口が無かったため。
 * 予約した授業は、生徒の1枚の「授業の予約」の欄で見る・取り消す。前の住所を開いた時は、ホームへ移す
 */
export default function LessonsPage() {
    redirect('/');
}
