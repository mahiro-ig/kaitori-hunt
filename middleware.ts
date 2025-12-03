// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Middleware（開発DX強化版）
 * - 開発時のみ: :3004 へ強制（ポート付け忘れ対策）
 * - /admin 配下ガード、/api/admin/** ガード
 * - 一般ユーザー /dashboard ガード（Cookie遅延 & 古いJWT対策付き）
 * - セキュリティヘッダ + CSP
 * ※ 重要: middleware は Edge 実行。NextAuth JWT は Edge 対応OK。NEXTAUTH_SECRET 必須。
 */

// ========= 設定 =========
const ADMIN_PATH = "/admin";
const ADMIN_LOGIN = "/admin/login";
const ADMIN_API_PREFIX = "/api/admin";

// dev で使っているポート
const DEV_PORT = process.env.PORT?.toString() || "3004";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// middleware にもマッチさせる（/api/admin/** も対象にする）
export const config = {
  matcher: [
    "/((?!_next|.*\\..*).*)", // 既存（api を除外）
    "/api/admin/:path*",      // 追加：管理APIだけ個別に対象化
  ],
};

// ===== Supabase ホスト抽出 =====
function getSupabaseHosts() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  try {
    if (url) {
      const u = new URL(url);
      return [u.host]; // 例: xxxxx.supabase.co
    }
  } catch {}
  return ["*.supabase.co", "*.supabase.in"];
}

// ===== セキュリティヘッダ（CSP含む） =====
function withSecurityHeaders(_req: NextRequest, res: NextResponse) {
  const isProd = process.env.NODE_ENV === "production";
  const supaHosts = getSupabaseHosts();

  const imgSrc = [
    "'self'",
    "data:",
    "blob:",
    ...supaHosts.map((h) => `https://${h}`),
  ].join(" ");

  const connectSrc = [
    "'self'",
    ...supaHosts.map((h) => `https://${h}`),
    "https://api.resend.com",
    // ★ GA 関連の送信先も許可
    "https://www.google-analytics.com",
    "https://www.googletagmanager.com",
    ...(isProd ? [] : ["ws:", "wss:"]),
  ].join(" ");

  // ★ script-src に GA / GTM を追加
  const scriptSrc = isProd
    ? "'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com"
    : "'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com";

  const cspDirectives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `img-src ${imgSrc}`,
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSrc}`,
    `connect-src ${connectSrc}`,
    "font-src 'self' data:",
    "media-src 'self' https:",
    "frame-src 'self'",
    "object-src 'none'",
  ];

  if (isProd) cspDirectives.push("upgrade-insecure-requests");

  res.headers.set("Content-Security-Policy", cspDirectives.join("; "));
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "accelerometer=(), camera=(), geolocation=(), microphone=(), payment=(), usb=()"
  );

  return res;
}

// ===== Auth 読み取り（有効期限チェック付き） =====
async function readAuth(req: NextRequest) {
  const isHttps =
    req.nextUrl.protocol === "https:" ||
    (process.env.NEXTAUTH_URL ?? "").startsWith("https");

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: !!isHttps, // httpローカル対応
  });

  const exp = (token as any)?.exp;
  const isExpired = typeof exp === "number" && Date.now() / 1000 > exp;

  if (!token || isExpired) {
    return { token: null, role: undefined, email: "" };
  }

  const role = (token as any)?.role as "admin" | "user" | undefined;
  const email = ((token as any)?.email || "").toLowerCase();

  return { token, role, email };
}

// ===== メイン処理 =====
export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const { pathname, search } = url;
  const isProd = process.env.NODE_ENV === "production";

  // ---- A) 開発時: ポート強制（:3004 付け忘れ対策） ----
  if (!isProd) {
    const isIpOrLocal =
      /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname) || url.hostname === "localhost";
    const needsRedirect = isIpOrLocal && url.port !== DEV_PORT;

    if (needsRedirect) {
      const to = url.clone();
      to.port = DEV_PORT;
      return NextResponse.redirect(to, 307);
    }
  }

  // ---- B) 管理ログインは素通し ----
  if (pathname === ADMIN_LOGIN || pathname.startsWith(`${ADMIN_LOGIN}/`)) {
    return withSecurityHeaders(req, NextResponse.next());
  }

  // ---- C) /api/admin/** 認可 ----
  if (pathname.startsWith(ADMIN_API_PREFIX)) {
    // CORS プリフライトは素通し
    if (req.method === "OPTIONS") {
      return withSecurityHeaders(req, NextResponse.json({}, { status: 204 }));
    }

    // API キー優先
    const authHeader = req.headers.get("authorization") || "";
    const headerKey = req.headers.get("x-admin-key") || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const incomingKey = bearer || headerKey;

    if (incomingKey && incomingKey === process.env.INTERNAL_ADMIN_API_KEY) {
      return withSecurityHeaders(req, NextResponse.next());
    }

    const { role, email } = await readAuth(req);
    const allowByEmail = email && ADMIN_EMAILS.includes(email);

    if (role !== "admin" && !allowByEmail) {
      return withSecurityHeaders(
        req,
        new NextResponse(
          JSON.stringify({ error: role ? "Forbidden" : "Unauthorized" }),
          {
            status: role ? 403 : 401,
            headers: { "content-type": "application/json" },
          }
        )
      );
    }
    return withSecurityHeaders(req, NextResponse.next());
  }

  // ---- D) /admin/** 認可 ----
  if (pathname.startsWith(ADMIN_PATH)) {
    const { role, email } = await readAuth(req);
    const allowByEmail = email && ADMIN_EMAILS.includes(email);

    if (!role && !allowByEmail) {
      const to = url.clone();
      to.pathname = ADMIN_LOGIN;
      to.search = `?next=${encodeURIComponent(pathname + (search || ""))}`;
      return withSecurityHeaders(req, NextResponse.redirect(to));
    }

    if (role !== "admin" && !allowByEmail) {
      const to = url.clone();
      to.pathname = ADMIN_LOGIN;
      to.search = `?error=not_admin&next=${encodeURIComponent(pathname + (search || ""))}`;
      return withSecurityHeaders(req, NextResponse.redirect(to));
    }
    return withSecurityHeaders(req, NextResponse.next());
  }

  // ---- F) 一般ユーザー用ガード ----
  if (pathname.startsWith("/dashboard")) {
    const { token } = await readAuth(req);

    // Cookie 未反映なら1回だけ素通し
    if (!token) {
      return withSecurityHeaders(req, NextResponse.next());
    }

    // 未ログインならログインへ
    if (!token?.email) {
      const to = url.clone();
      to.pathname = "/auth/login";
      to.search = `?redirect=${encodeURIComponent(pathname + (search || ""))}`;
      return withSecurityHeaders(req, NextResponse.redirect(to));
    }

    return withSecurityHeaders(req, NextResponse.next());
  }

  // ---- E) その他は素通し ----
  return withSecurityHeaders(req, NextResponse.next());
}
