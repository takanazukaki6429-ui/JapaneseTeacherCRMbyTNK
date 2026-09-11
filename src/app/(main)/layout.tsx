import { Sidebar } from "@/components/layout/sidebar";
import { SupportWidget } from "@/components/support/support-widget";

// 画面案（2026-09-11 かずき決定：色＝D・書体＝E）に合わせ、上の帯は置かない。
// 先生の名前とログアウトは左のナビの下にある。
export default function MainLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col md:ml-64 transition-all duration-300">
                <main className="flex-1 px-5 pt-16 pb-8 md:p-8 lg:p-10 overflow-auto">
                    {children}
                </main>
            </div>
            <SupportWidget />
        </div>
    );
}
