// app/api/upload/[bucket]/route.ts
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
    throw new Error("[/api/upload/[bucket]] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

type RouteParams = { bucket: string };

// POST /api/upload/:bucket
export async function POST(req: NextRequest, { params }: { params: RouteParams }) {
  try {
    // 1) 認証
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // 2) バケット名の検証（必要に応じて調整）
    const bucket = params?.bucket;
    if (!bucket || !["id-photos", "face-captures"].includes(bucket)) {
      return NextResponse.json({ error: "無効なバケット名です" }, { status: 400 });
    }

    // 3) フォームデータ取得
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file が必須です" }, { status: 400 });
    }

    // 4) 保存パスを決定（※Storageのpathは「バケット配下の相対パス」）
    //    バケット名を重ねないよう注意：from(bucket).upload(<ここ>) なので <ここ> に bucket は入れない。
    const ext = (file.name?.split(".").pop() || "").toLowerCase();
    const basename = `${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
    const filePath = `${userId}/${basename}`; // 例: usersごとにフォルダ分け

    const supabase = getSupabaseAdmin();

    // 5) アップロード（NodeではArrayBuffer→Uint8Arrayで渡す）
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, new Uint8Array(arrayBuffer), {
        upsert: false, // 上書きしたいなら true
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("[upload] storage.upload error:", uploadError);
      return NextResponse.json({ error: "アップロードに失敗しました" }, { status: 500 });
    }

    // 6) verifications を upsert
    const patch =
      bucket === "id-photos"
        ? { id_photo_path: filePath }
        : { face_path: filePath };

    // 既存判定
    const { data: existing, error: selErr } = await supabase
      .from("verifications")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (selErr) {
      console.error("[verifications select] error:", selErr);
      return NextResponse.json({ error: "状態確認に失敗しました" }, { status: 500 });
    }

    if (existing) {
      const { error: updErr } = await supabase
        .from("verifications")
        .update(patch)
        .eq("user_id", userId);

      if (updErr) {
        console.error("[verifications update] error:", updErr);
        return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
      }
    } else {
      const insertData = {
        user_id: userId,
        id_photo_path: bucket === "id-photos" ? filePath : "",
        face_path: bucket === "face-captures" ? filePath : "",
        status: "pending",
      };
      const { error: insErr } = await supabase.from("verifications").insert(insertData);
      if (insErr) {
        console.error("[verifications insert] error:", insErr);
        return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
      }
    }

    // 7) URL 返却（public bucketならpublicUrl、privateなら署名URL）
    let url: string | null = null;
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(filePath);
    if (pub?.publicUrl) {
      url = pub.publicUrl;
    } else {
      const { data: signed, error: signErr } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 60 * 60);
      if (signErr) {
        console.warn("[upload] createSignedUrl failed:", signErr?.message);
      }
      url = signed?.signedUrl ?? null;
    }

    return NextResponse.json({ url, path: filePath, bucket }, { status: 200 });
  } catch (e: any) {
    console.error("[/api/upload/[bucket]][POST] fatal:", e?.message ?? e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
