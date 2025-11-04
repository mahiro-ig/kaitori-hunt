// app/api/admin/news/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function assertAdmin(): Promise<{ ok: true } | { ok: false; res: NextResponse }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
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

// PUT /api/admin/news/:id  更新
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const adm = await assertAdmin();
  if (!("ok" in adm && adm.ok)) return adm.res;

  const { id } = await ctx.params; // ← ★ params を await
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Server not ready" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const title = (body.title ?? "").toString().trim();
  const content = (body.body ?? body.content ?? "").toString();
  const is_active = Boolean(body.is_active ?? body.is_published ?? false);
  const published_at: string | null = body.published_at ? String(body.published_at) : null;

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("news")
    .update({
      title,
      body: content || null,
      is_active,
      ...(published_at ? { published_at } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}

// DELETE /api/admin/news/:id  削除
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const adm = await assertAdmin();
  if (!("ok" in adm && adm.ok)) return adm.res;

  const { id } = await ctx.params; // ← ★ params を await
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Server not ready" }, { status: 500 });
  }

  const { error } = await supabaseAdmin.from("news").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
