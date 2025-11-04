// /app/api/admin/product-images/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
// どちらか存在する方に合わせてください（lib 側を推奨）
import { authOptions } from "@/lib/auth"; 
// import { authOptions } from "@/app/api/auth/[...nextauth]/route";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const BUCKET = "product-images";

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

function isAllowedOrigin(origin: string | null) {
  const allowed = [
    process.env.NEXT_PUBLIC_APP_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]
    .filter(Boolean)
    .map((s) => String(s).trim());

  return !!origin && allowed.includes(origin);
}

export async function POST(req: NextRequest) {
  // Origin チェック（必要なければ外してOK）
  const origin = req.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  // 認証
  const session = await getServerSession(authOptions as any);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // フォーム受け取り
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (<=10MB)" }, { status: 413 });
  }
  if (!ALLOWED_MIMES.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }

  // Node ランタイムでは File をそのまま渡さず、Uint8Array に変換してから upload する
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // 拡張子・保存名
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const safeExt = ext ? `.${ext}` : "";
  const name = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${safeExt}`;

  // アップロード
  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(name, bytes, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (upErr) {
    console.error("[product-images upload error]", upErr);
    // 415/400/500 のどれにすべきかはエラー内容によるが、まずは 400
    return NextResponse.json({ error: upErr.message }, { status: 400 });
  }

  // 公開 URL 取得（Public バケット前提）
  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(name);
  return NextResponse.json({ publicUrl: pub.publicUrl, path: name }, { status: 200 });
}
