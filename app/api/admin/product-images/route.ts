// /app/api/admin/product-images/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
// 推奨：lib 側の authOptions を参照
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const BUCKET = "product-images";

/** シンプルな管理者判定（role=admin または ADMIN_EMAILS） */
function isAdmin(session: any) {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return (
    (session as any)?.user?.role === "admin" ||
    (session?.user?.email &&
      adminEmails.includes(String(session.user.email).toLowerCase()))
  );
}

/** 許可オリジン判定を甘めに（同一オリジン無条件許可＋よく使うドメイン） */
function isAllowedOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin の fetch などは Origin ヘッダ無しの場合もある

  const self = req.nextUrl.origin; // 今動いているホスト（https://xxx.vercel.app 等）
  if (origin === self) return true;

  const list = [
    process.env.NEXT_PUBLIC_APP_URL, 
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://localhost:3000",
  ]
    .filter(Boolean)
    .map((s) => String(s).trim().toLowerCase());

  // Vercel プレビューを全部許可（必要に応じて外してください）
  const isVercelPreview = origin.toLowerCase().endsWith(".vercel.app");

  return isVercelPreview || list.includes(origin.toLowerCase());
}

/** CORS ヘッダ（必要最低限・同一オリジン運用なら無くてもOK） */
function corsHeaders(origin: string | null) {
  if (!origin) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
  };
}

export async function OPTIONS(req: NextRequest) {
  // プリフライト対応
  const origin = req.headers.get("origin");
  if (!isAllowedOrigin(req)) {
    return new NextResponse(null, {
      status: 403,
      headers: {
        ...corsHeaders(origin),
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...corsHeaders(origin),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");

  // 1) Origin チェック
  if (!isAllowedOrigin(req)) {
    console.warn("[product-images] 403 Bad origin:", { origin, self: req.nextUrl.origin });
    return NextResponse.json(
      { error: "Bad origin", detail: { origin, expected: req.nextUrl.origin } },
      { status: 403, headers: corsHeaders(origin) }
    );
  }

  // 2) 認証
  const session = await getServerSession(authOptions as any);
  if (!session) {
    console.warn("[product-images] 401 Unauthorized (no session)");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(origin) });
  }
  if (!isAdmin(session)) {
    console.warn("[product-images] 403 Forbidden (not admin)", { email: session.user?.email, role: (session as any)?.user?.role });
    return NextResponse.json(
      { error: "Forbidden", detail: { email: session.user?.email, role: (session as any)?.user?.role } },
      { status: 403, headers: corsHeaders(origin) }
    );
  }

  // 3) Supabase 管理クライアント存在チェック
  if (!supabaseAdmin) {
    console.error("[product-images] 500 Server misconfigured (supabaseAdmin missing)");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500, headers: corsHeaders(origin) });
  }

  // 4) フォーム受け取り
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400, headers: corsHeaders(origin) });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (<=10MB)" }, { status: 413, headers: corsHeaders(origin) });
  }
  if (!ALLOWED_MIMES.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415, headers: corsHeaders(origin) });
  }

  // Node ランタイム：Uint8Array に変換してアップロード
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // 保存名
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const safeExt = ext ? `.${ext}` : "";
  const name = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${safeExt}`;

  // 5) アップロード
  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(name, bytes, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (upErr) {
    console.error("[product-images upload error]", upErr);
    return NextResponse.json({ error: upErr.message }, { status: 400, headers: corsHeaders(origin) });
  }

  // 6) 公開URL（Public バケット前提）
  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(name);
  return NextResponse.json({ publicUrl: pub.publicUrl, path: name }, { status: 200, headers: corsHeaders(origin) });
}
