import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function MainLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col md:ml-64 transition-all duration-300">
                <Header />
                <main className="flex-1 p-6 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
