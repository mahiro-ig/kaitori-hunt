// app/api/verifications/upload/route.ts

import { NextResponse } from "next/server";
// サーバー専用の service_role キーで初期化したクライアントを使う
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  // 1) フォームデータから file と user_id を取得
  const form = await request.formData();
  const file = form.get("file");
  const userId = form.get("user_id") as string | null;

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "ファイルが送信されていません" },
      { status: 400 }
    );
  }
  if (!userId) {
    return NextResponse.json(
      { error: "認証が必要です" },
      { status: 401 }
    );
  }

  // 2) Storage へアップロード（プライベートバケット）
  const ext = file.name.split(".").pop();
  const fileName = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabaseAdmin
    .storage
    .from("face-captures")
    .upload(fileName, file, { upsert: true });

  if (uploadError) {
    console.error("[Supabase Upload Error]", uploadError);
    return NextResponse.json(
      { error: uploadError.message },
      { status: 500 }
    );
  }

  // 3) verifications テーブルにレコードを挿入（service_role なので RLS を回避）
  const { data, error: dbError } = await supabaseAdmin
    .from("verifications")
    .insert([{ user_id: userId, face_path: fileName }])
    .single();

  if (dbError) {
    console.error("[Supabase Insert Error]", dbError);
    return NextResponse.json(
      { error: dbError.message },
      { status: 500 }
    );
  }

  // 4) アップロードしたファイルの公開 URL も返しておく（任意）
  const { data: urlData } = supabaseAdmin
    .storage
    .from("face-captures")
    .getPublicUrl(fileName);

  return NextResponse.json({
    verification: data,
    url: urlData.publicUrl,
  });
}
