// app/api/upload/[bucket]/route.ts

import { NextResponse } from "next/server";
// サーバー用に service_role キーで初期化したクライアント
import { supabaseAdmin } from "@/lib/supabaseAdmin";
// NextAuth のサーバーセッション取得ユーティリティ
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import type { Session } from "next-auth";

type Params = {
  params: Promise<{ bucket: string }>;
};

export async function POST(
  request: Request,
  { params }: Params
) {
  // 1) params を await して bucket 名を取得
  const { bucket } = await params;

  // 2) 許可するバケット名のみ受け付ける
  if (!["id-photos", "face-captures"].includes(bucket)) {
    return NextResponse.json(
      { error: "無効なバケット名です" },
      { status: 400 }
    );
  }

  // 3) 認証チェック
  const session = (await getServerSession(authOptions as any)) as Session | null;
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "認証が必要です" },
      { status: 401 }
    );
  }
  const userId = session.user.id;

  // 4) フォームデータからファイルを取得
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "ファイルが送信されていません" },
      { status: 400 }
    );
  }

  // 5) ストレージへアップロード
  const ext = file.name.split(".").pop() ?? "";
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const filePath = `${bucket}/${fileName}`;
  const { error: uploadError } = await supabaseAdmin
    .storage
    .from(bucket)
    .upload(filePath, file, { cacheControl: "3600", upsert: false });

  if (uploadError) {
    console.error(`[Supabase Storage Error][${bucket}]`, uploadError);
    return NextResponse.json(
      { error: uploadError.message },
      { status: 500 }
    );
  }

  // 6) verifications テーブルの既存レコードを取得
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("verifications")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError) {
    console.error("[Supabase DB Error][verifications select]", selectError);
    return NextResponse.json(
      { error: selectError.message },
      { status: 500 }
    );
  }

  if (existing) {
    // 7a) 既存レコードがあれば該当パスのみ UPDATE
    const updateData =
      bucket === "id-photos"
        ? { id_photo_path: filePath }
        : { face_path: filePath };

    const { error: updateError } = await supabaseAdmin
      .from("verifications")
      .update(updateData)
      .eq("user_id", userId);

    if (updateError) {
      console.error("[Supabase DB Error][verifications update]", updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }
  } else {
    // 7b) レコードがなければ INSERT（NOT NULL 制約を満たすため status を初期値でセット）
    const insertData = {
      user_id: userId,
      id_photo_path: bucket === "id-photos" ? filePath : "",
      face_path: bucket === "face-captures" ? filePath : "",
      status: "pending",
    };

    const { error: insertError } = await supabaseAdmin
      .from("verifications")
      .insert(insertData);

    if (insertError) {
      console.error("[Supabase DB Error][verifications insert]", insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }
  }

  // 8) 公開 URL を取得して返却
  const { data: urlData } = supabaseAdmin
    .storage
    .from(bucket)
    .getPublicUrl(filePath);

  return NextResponse.json({ url: urlData.publicUrl });
}
