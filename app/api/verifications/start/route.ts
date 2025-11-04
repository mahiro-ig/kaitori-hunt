// app/api/verifications/start/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1) ユーザーIDを NextAuth から取得（callbacks.session で session.user.id を必ず付与してください）
    let userId = (session.user as any)?.id as string | undefined;

    // フォールバック：email→users.id（不要なら削除可）
    if (!userId && session.user?.email) {
      const { data: urow, error: uerr } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", session.user.email)
        .maybeSingle();
      if (uerr) return NextResponse.json({ error: uerr.message }, { status: 500 });
      userId = urow?.id;
    }
    if (!userId) {
      return NextResponse.json(
        { error: "session.user.id がありません。NextAuth の session コールバックで付与してください。" },
        { status: 400 }
      );
    }

    // 2) 未完了の申請があればそれを返す（重複作成を防止）
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("verifications")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["pending", "resubmitted"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (exErr) {
      console.error("[verifications/start] select existing error:", exErr);
      return NextResponse.json({ error: exErr.message }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ data: existing }, { status: 200 });
    }

    // 3) 新規作成（画像パスは送らない＝DB側で NULL）
    const { data, error } = await supabaseAdmin
      .from("verifications")
      .insert({
        user_id: userId,
        status: "pending",
        // id_photo_path/face_path は送らない（NULL）
      })
      .select()
      .single();

    if (error) {
      console.error("[verifications/start] insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    console.error("[verifications/start] fatal:", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
