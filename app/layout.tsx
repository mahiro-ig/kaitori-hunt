// app/layout.tsx  ← "use client" は付けない（サーバーコンポーネント）
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import "./globals.css";

import ClientRoot from "./_components/client-root";

// ========== Fonts ==========
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// ★ CJK: preload は off、subsets は指定しない（←これがポイント）
const notoSansJP = Noto_Sans_JP({
  preload: false,
  weight: ["400", "500", "700", "800", "900"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

// ========== Site URL ==========
const isProd = process.env.NODE_ENV === "production";
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (isProd ? "https://kaitori-hunt.com" : "http://192.168.10.107:3004");

// ---- Viewport ----
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// ========== Metadata ==========
const defaultTitle =
  "買取ハント｜新品・未使用ランク特化の高価買取サービス｜即日入金・全国対応";
const defaultDescription =
  "買取ハントは新品・未使用ランクに特化した高価買取サービスです。iPhone・カメラ・ゲーム機などを全国からご郵送いただき、査定成立後は最短即日入金。安心・透明な取引をお約束します。";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: defaultTitle, template: "%s | 買取ハント" },
  description: defaultDescription,
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "買取ハント",
    title: defaultTitle,
    description:
      "新品・未使用ランクのiPhone・カメラ・ゲーム機などを高価買取。全国対応でお申し込み後、査定成立時は最短即日入金。安心・透明な買取サービス『買取ハント』。",
    locale: "ja_JP",
    images: [
      { url: "/images/ogp.png", width: 1200, height: 630, alt: "買取ハント｜新品・未使用ランク特化の高価買取サービス" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description:
      "新品・未使用ランクの買取に特化。iPhone・カメラ・ゲーム機などを全国から受付し、査定成立後は最短即日入金。安心・透明な高価買取サービス。",
    images: ["/images/ogp.png"],
  },
  ...(isProd
    ? { alternates: { canonical: "https://kaitori-hunt.com" }, robots: { index: true, follow: true } }
    : { robots: { index: false, follow: false } }),
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
  generator: "nextjs",
};

// ========== Layout ==========
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ja"
      className={`h-full ${inter.variable} ${notoSansJP.variable}`}
      suppressHydrationWarning
    >
      <head />
      <body className="min-h-[100svh] overflow-x-hidden bg-background text-foreground antialiased font-sans">
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  );
}
