import type { Metadata } from "next";
import { Zen_Maru_Gothic, Noto_Sans_JP, Geist_Mono } from "next/font/google";
import { FontCompareBar } from "@/components/font-compare-bar";
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

// 書体の見比べ用（置き場 try/font-compare だけ・2026-09-22）。案2・案3で、ヒラギノ角ゴが無い端末（Windowsなど）に使う
const notoJp = Noto_Sans_JP({
  variable: "--font-noto-jp",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});

// 画面が描かれる前に、選んである書体を当てる（切り替えのちらつきを防ぐ）。?font=0〜3 でも切り替えられる
const fontCompareScript = `try{var p=new URLSearchParams(location.search).get('font');if(p!==null){if(p==='0'){localStorage.removeItem('asta-font')}else{localStorage.setItem('asta-font',p)}}var f=localStorage.getItem('asta-font');if(f){document.documentElement.dataset.font=f}}catch(e){}`;

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
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: fontCompareScript }} />
      </head>
      <body
        className={`${zenMaru.variable} ${notoJp.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <FontCompareBar />
      </body>
    </html>
  );
}
