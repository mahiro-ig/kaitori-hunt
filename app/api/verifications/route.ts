// app/api/verifications/route.ts
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
    throw new Error("[/api/verifications] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// POST /api/verifications
// body: { id_photo_path?: string, face_path?: string }
export async function POST(req: NextRequest) {
  try {
    // 1) 認証
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // 2) 入力
    const body = await req.json().catch(() => ({}));
    const id_photo_path = typeof body?.id_photo_path === "string" ? body.id_photo_path : "";
    const face_path     = typeof body?.face_path === "string" ? body.face_path : "";

    // 3) 作成 or 既存なら更新に切り替え（重複作成を避ける）
    const supabase = getSupabaseAdmin();

    const { data: existing, error: selErr } = await supabase
      .from("verifications")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (selErr) {
      console.error("[verifications][select] error:", selErr);
      return NextResponse.json({ error: "状態確認に失敗しました" }, { status: 500 });
    }

    if (existing) {
      const { data, error } = await supabase
        .from("verifications")
        .update({
          ...(id_photo_path ? { id_photo_path } : {}),
          ...(face_path ? { face_path } : {}),
          // ユーザー発で status をいじらない方針なら何も設定しない
        })
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        console.error("[verifications][update] error:", error);
        return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
      }

      return NextResponse.json(data, { status: 200 });
    } else {
      const { data, error } = await supabase
        .from("verifications")
        .insert({
          user_id: userId,
          id_photo_path,
          face_path,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("[verifications][insert] error:", error);
        return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
      }

      return NextResponse.json(data, { status: 201 });
    }
  } catch (e: any) {
    console.error("[/api/verifications][POST] fatal:", e?.message ?? e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
