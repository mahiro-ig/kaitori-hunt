// app/layout.tsx  ← サーバーコンポーネント（"use client" なし）
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import Script from "next/script";
import "./globals.css";

import ClientRoot from "./_components/client-root";

// ========== Fonts ==========
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// CJK: preload off / subsets 指定しない
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

// ========== GA4 ID ==========
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-VGEMWXWGVV";

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
      {
        url: "/images/ogp.png",
        width: 1200,
        height: 630,
        alt: "買取ハント｜新品・未使用ランク特化の高価買取サービス",
      },
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
    ? {
        alternates: { canonical: "https://kaitori-hunt.com" },
        robots: { index: true, follow: true },
      }
    : { robots: { index: false, follow: false } }),

  // ★ ここをしっかり指定
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" }, // あれば
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" }, // あれば
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }], // 180x180
  },
  manifest: "/manifest.json", // PWAしない場合でも入れてOK（存在しないなら外す）
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

        {/* ========== Google Analytics 4（GA4） ========== */}
        {GA_ID && (
          <>
            {/* gtag.js 本体 */}
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            {/* 初期化スクリプト */}
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
