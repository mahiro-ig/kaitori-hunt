// app/api/admin/news/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/** 管理者判定: role=admin or ADMIN_EMAILS or admin_users テーブル */
async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false as const, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  // 1) JWT role=admin
  if ((session as any).user?.role === "admin") {
    return { ok: true as const };
  }

  // 2) ADMIN_EMAILS に含まれるか
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const email = (session.user.email ?? "").toLowerCase();
  if (email && adminEmails.includes(email)) {
    return { ok: true as const };
  }

  // 3) admin_users テーブル参照
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", session.user.id)
    .limit(1);

  if (error) {
    return { ok: false as const, res: NextResponse.json({ error: error.message }, { status: 500 }) };
  }
  if (!data || data.length === 0) {
    return { ok: false as const, res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true as const };
}

// GET /api/admin/news  一覧
export async function GET() {
  const adm = await assertAdmin();
  if (!("ok" in adm && adm.ok)) return adm.res;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .order("published_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

// POST /api/admin/news  新規作成
export async function POST(req: Request) {
  const adm = await assertAdmin();
  if (!("ok" in adm && adm.ok)) return adm.res;

  const body = await req.json().catch(() => ({} as any));
  const title = (body.title ?? "").toString().trim();
  const content = (body.body ?? body.content ?? "").toString();
  const is_active = Boolean(body.is_active ?? body.is_published ?? false);
  const published_at: string | null =
    body.published_at ? String(body.published_at) : null;

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("news")
    .insert({
      title,
      body: content || null,
      is_active,
      published_at: published_at ?? new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}
