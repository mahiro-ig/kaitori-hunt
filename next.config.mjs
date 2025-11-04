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

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            // ① 最小許可：対象ドメインだけ
            // value:
            //   "default-src 'self'; " +
            //   "img-src 'self' https://lcpnydywtjnnarfkkkat.supabase.co data: blob:; " +
            //   "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
            //   "style-src 'self' 'unsafe-inline'; " +
            //   "connect-src 'self' https://lcpnydywtjnnarfkkkat.supabase.co https://*.supabase.co ws:; " +
            //   "font-src 'self' data:; " +
            //   "media-src 'self' https://lcpnydywtjnnarfkkkat.supabase.co; " +
            //   "frame-src 'self'; " +
            //   "object-src 'none'; " +
            //   "base-uri 'self'; " +
            //   "frame-ancestors 'self';",

            // ② 広めに許可：全HTTPS画像をOK（運用が楽）
            value:
              "default-src 'self'; " +
              "img-src 'self' https: data: blob:; " +
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
              "style-src 'self' 'unsafe-inline'; " +
              "connect-src 'self' https://*.supabase.co wss:; " +
              "font-src 'self' data:; " +
              "media-src 'self' https:; " +
              "frame-src 'self'; " +
              "object-src 'none'; " +
              "base-uri 'self'; " +
              "frame-ancestors 'self';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
