// app/api/admin/news/[id]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
// 可能なら API からではなく /lib/auth から import する（循環 & edge 巻き込み回避）
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
// import type { Database } from "@/lib/database.types"; // 型付けしたい場合は有効化

type RouteCtx = { params: { id: string } };

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // role が付いているなら最短で許可
  if ((session as any).user?.role === "admin") return null;

  // admin_users に存在すれば OK
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", session.user.id)
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return null; // OK
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

// PUT /api/admin/news/:id  更新
export async function PUT(req: Request, { params }: RouteCtx) {
  const guard = await assertAdmin();
  if (guard) return guard;

  const id = params?.id;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // no-op（空でも続行）
  }

  const title = (body.title ?? "").toString().trim();
  const content = (body.body ?? body.content ?? "").toString();
  const is_active = Boolean(body.is_active ?? body.is_published ?? false);
  const published_at: string | null = body.published_at
    ? String(body.published_at)
    : null;

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
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
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/news/:id  削除
export async function DELETE(_req: Request, { params }: RouteCtx) {
  const guard = await assertAdmin();
  if (guard) return guard;

  const id = params?.id;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("news").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
