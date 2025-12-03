// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 既存設定はそのまま
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    unoptimized: true,
    domains: ["lcpnydywtjnnarfkkkat.supabase.co"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lcpnydywtjnnarfkkkat.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },

//  async headers() {
//    return [
//      {
//        source: "/:path*",
//        headers: [
//          {
//            key: "Content-Security-Policy",
//            // ★ GA4 / gtag を許可した版
//            value:
//              "default-src 'self'; " +
//              // 画像は全HTTPS + data/blob
//              "img-src 'self' https: data: blob:; " +
//              // 👉 GA用ドメインを script-src に追加
//              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com; " +
//              "style-src 'self' 'unsafe-inline'; " +
//              // 👉 GA用ドメインを connect-src にも追加
//              "connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com wss:; " +
//              "font-src 'self' data:; " +
//              "media-src 'self' https:; " +
//              "frame-src 'self'; " +
//              "object-src 'none'; " +
//              "base-uri 'self'; " +
//              "frame-ancestors 'self';",
//          },
//        ],
//      },
//    ];
//  },
};

export default nextConfig;
