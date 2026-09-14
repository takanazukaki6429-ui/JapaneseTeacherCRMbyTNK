import type { Metadata } from "next";
import { Zen_Maru_Gothic, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

// 書体＝E：丸ゴシック（2026-09-11 かずき決定）。
// 2026-09-14 かずき決定（遅さの直し・案C）：Mac・iPhoneでは初めから入っているヒラギノ丸ゴを先に使い（globals.css）、
// 入っていない端末（Windowsなど）だけこの書体のファイルを読む。太さは2種類に減らし、先読みはしない
const zenMaru = Zen_Maru_Gothic({
  variable: "--font-zen-maru",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ASTA - Your Bright Future",
  description: "Japanese Teacher CRM Application - 明日の星になる",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  appleWebApp: {
    capable: true,
    title: "ASTA",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${zenMaru.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
