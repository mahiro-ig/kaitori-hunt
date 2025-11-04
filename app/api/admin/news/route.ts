// app/api/admin/news/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// --- 管理者判定（必要に応じて調整） ---
async function assertAdmin(): Promise<{ ok: true } | { ok: false; res: NextResponse }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  // 1) トークンに role=admin が入っている場合を許可
  // 2) または admin_users テーブルに存在するかチェック
  if ((session as any).user?.role === "admin") return { ok: true };

  if (!supabaseAdmin) {
    return { ok: false, res: NextResponse.json({ error: "Server not ready" }, { status: 500 }) };
  }

  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", session.user.id)
    .limit(1);

  if (error) {
    return { ok: false, res: NextResponse.json({ error: error.message }, { status: 500 }) };
  }
  if (!data || data.length === 0) {
    return { ok: false, res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true };
}

// GET /api/admin/news  一覧
export async function GET() {
  const adm = await assertAdmin();
  if (!("ok" in adm && adm.ok)) return adm.res;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Server not ready" }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from("news")
    .select("*")
    .order("published_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

// POST /api/admin/news  新規作成
export async function POST(req: Request) {
  const adm = await assertAdmin();
  if (!("ok" in adm && adm.ok)) return adm.res;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Server not ready" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const title = (body.title ?? "").toString().trim();
  const content = (body.body ?? body.content ?? "").toString();
  const is_active = Boolean(body.is_active ?? body.is_published ?? false);
  const published_at: string | null =
    body.published_at ? String(body.published_at) : null;

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
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
