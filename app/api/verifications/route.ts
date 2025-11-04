// app/api/verifications/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  // 1) セッション取得
  const session = (await getServerSession(authOptions)) as Session | null;
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "認証が必要です" },
      { status: 401 }
    );
  }
  const userId = session.user.id;

  // 2) リクエストボディ読み込み
  const { id_photo_path, face_path } = await request.json();

  // 3) service_role キーを使って安全にレコード作成
  const { data, error } = await supabaseAdmin
    .from("verifications")
    .insert({
      user_id:       userId,
      id_photo_path: id_photo_path,
      face_path:     face_path,
      status:        "pending",
    })
    .single();

  if (error) {
    console.error("verifications insert error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  // 4) 成功時は作成したレコードを返す
  return NextResponse.json(data);
}
