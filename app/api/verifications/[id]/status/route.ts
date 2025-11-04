// app/api/verifications/[id]/status/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("[/api/verifications/[id]/status] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function isAdminEmail(email?: string | null) {
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return !!(email && list.includes(email.toLowerCase()));
}

type RouteParams = { id: string };

// PATCH /api/verifications/:id/status
// body: { status: "pending" | "approved" | "rejected" }
export async function PATCH(req: NextRequest, { params }: { params: RouteParams }) {
  try {
    // 認証 & 管理者チェック
    const session = await getServerSession(authOptions);
    const email = session?.user?.email ?? null;
    if (!isAdminEmail(email)) {
      return NextResponse.json({ error: "管理者のみ実行可能です" }, { status: 403 });
    }

    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "id が不正です" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const nextStatus = body?.status as string | undefined;

    const ALLOWED = ["pending", "approved", "rejected"];
    if (!nextStatus || !ALLOWED.includes(nextStatus)) {
      return NextResponse.json(
        { error: `status は ${ALLOWED.join(" / ")} のいずれかが必須です` },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("verifications")
      .update({ status: nextStatus })
      .eq("id", id)
      .single();

    if (error) {
      console.error("[verifications][update] error:", error);
      return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ message: "更新完了", status: nextStatus, id: data?.id }, { status: 200 });
  } catch (e: any) {
    console.error("[verifications][PATCH] fatal:", e?.message ?? e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
