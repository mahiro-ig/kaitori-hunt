// app/api/admin/verifications/[id]/route.ts
export const runtime = 'nodejs'

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminAPI } from "@/lib/auth";

/** -------------------------------------------
 * Helpers
 * ------------------------------------------*/

// 空/未定義/空白判定
function isBlank(v: unknown): boolean {
  return (
    v == null ||
    (typeof v === "string" && v.trim().length === 0)
  );
}

// "bucket/bucket/uuid" → "bucket/uuid" の既存正規化 + 先頭スラ除去
function dedupeBucket(path: string) {
  const parts = path.split("/");
  if (parts.length >= 2 && parts[0] === parts[1]) {
    parts.shift();
  }
  return parts.join("/").replace(/^\/+/, "");
}

// フルURLや /storage/v1/object/... を考慮して Storage キーへ正規化。無効なら null を返す。
// フルURLは "URL:<http...>" を返して後段でパススルー扱いにする。
function normalizeStorageKey(
  input: unknown,
  bucket: string
): string | null {
  if (isBlank(input)) return null;
  if (typeof input !== "string") return null;

  const raw = input.trim();
  if (!raw) return null;

  // 既に http(s) URL の場合はサイン不要でそのまま返す
  if (/^https?:\/\//i.test(raw)) return `URL:${raw}`;

  // /storage/v1/object/sign/<bucket>/path?token=...
  const signPrefix = `/storage/v1/object/sign/${bucket}/`;
  const publicPrefix = `/storage/v1/object/public/${bucket}/`;

  if (raw.includes(signPrefix)) {
    const after = raw.split(signPrefix)[1] ?? "";
    const path = after.split("?")[0] ?? "";
    const key = path.replace(/^\/+/, "");
    return key || null;
  }
  if (raw.includes(publicPrefix)) {
    const after = raw.split(publicPrefix)[1] ?? "";
    const key = after.replace(/^\/+/, "");
    return key || null;
  }

  // "bucket/..." が含まれてしまっている場合を剥がす
  let key = raw.replace(/^\/+/, "");
  const bucketPrefix1 = `${bucket}/`;
  const bucketPrefix2 = `/${bucket}/`;
  if (key.startsWith(bucketPrefix1)) key = key.slice(bucketPrefix1.length);
  if (key.startsWith(bucketPrefix2)) key = key.slice(bucketPrefix2.length);

  // 既存の重複バケット対策
  key = dedupeBucket(key);

  key = key.replace(/^\/+/, "").trim();
  return key || null;
}

// サインURL生成（"URL:<...>" はパススルー・null は null のまま）
// エラー時は 500 にせず null を返して UI 側で「画像なし」表示にする。
async function toSignedUrlOrPassThrough(
  maybeKey: string | null,
  bucket: string,
  expiresInSec = 60
): Promise<string | null> {
  if (!maybeKey) return null;
  if (maybeKey.startsWith("URL:")) return maybeKey.slice(4);

  const { data, error } = await supabaseAdmin!
    .storage
    .from(bucket)
    .createSignedUrl(maybeKey, expiresInSec);

  if (error) {
    console.error("signedUrl error:", error, { bucket, key: maybeKey });
    return null;
  }
  return data?.signedUrl ?? null;
}

/** -------------------------------------------
 * GET
 * ------------------------------------------*/
export async function GET(
  request: Request,
  { params }: { params: { id: string } } // ← Promise をやめて正しい型に
) {
  try {
    // 認可（APIキー or セッション+admin_users）
    await requireAdminAPI(request);

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 1) ルートパラメータを取得
    const { id } = params;

    // 2) verification レコード取得
    const { data: verif, error: verifErr } = await supabaseAdmin
      .from("verifications")
      .select(`
        id,
        user_id,
        id_photo_path,
        face_path,
        created_at,
        status
      `)
      .eq("id", id)
      .single();

    if (verifErr || !verif) {
      console.error("verification fetch error:", verifErr);
      return NextResponse.json(
        { error: "レコードが見つかりません" },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 3) 画像パスを正規化 → サイン生成（空やフルURLは適切に処理）
    const idBucket = "id-photos";
    const faceBucket = "face-captures";

    const idKey = normalizeStorageKey(verif.id_photo_path, idBucket);
    const faceKey = normalizeStorageKey(verif.face_path, faceBucket);

    const [idPhotoUrl, facePhotoUrl] = await Promise.all([
      toSignedUrlOrPassThrough(idKey, idBucket, 60),
      toSignedUrlOrPassThrough(faceKey, faceBucket, 60),
    ]);

    // 4) users テーブルからユーザー情報を取得
    const { data: user, error: userErr } = await supabaseAdmin
      .from("users")
      .select("id, name, email, phone")
      .eq("id", verif.user_id)
      .single();

    if (userErr || !user) {
      console.error("user fetch error:", userErr);
      return NextResponse.json(
        { error: "ユーザー情報が見つかりません" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 5) クライアント向けレスポンス
    return NextResponse.json(
      {
        id: verif.id,
        created_at: verif.created_at,
        status: verif.status,
        idPhotoUrl,   // null の可能性あり（未提出/URL化失敗時）
        facePhotoUrl, // 同上
        user,
        // デバッグ補助（必要なければ消してOK）
        _keys: {
          id_photo_key: idKey,
          face_key: faceKey,
        },
        _buckets: {
          idBucket,
          faceBucket,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    const status = e?.statusCode ?? 500;
    const msg = e?.message ?? "Unknown error";
    return NextResponse.json(
      { error: msg },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  }
}

/** -------------------------------------------
 * PATCH（status 更新）
 * ------------------------------------------*/
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 認可（APIキー or セッション+admin_users）
    await requireAdminAPI(request);

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { id } = params;

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { status, rejectReason } = body ?? {};
    if (!["approved", "rejected", "pending"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    // まずは正しいカラム(status)を更新
    const payload: Record<string, any> = { status };
    if (typeof rejectReason !== "undefined") {
      payload.reject_reason = rejectReason ?? null;
    }

    const { error: updateErr } = await supabaseAdmin
      .from("verifications")
      .update(payload)
      .eq("id", id)
      .select();

    if (!updateErr) {
      return NextResponse.json(
        { success: true },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // 「カラムが存在しない（42703）」かつ「status カラム関連」のときだけ stastus で再試行
    const isColumnMissing =
      (updateErr as any)?.code === "42703" ||
      /column .*status.* does not exist/i.test((updateErr as any)?.message || "");

    if (!isColumnMissing) {
      console.error("verification status update error:", updateErr);
      return NextResponse.json(
        { error: (updateErr as any)?.message || "更新に失敗しました" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    // フォールバック: 一部環境で "stastus" になっている場合のみ
    const fallbackPayload: Record<string, any> = { stastus: status };
    if (typeof rejectReason !== "undefined") {
      fallbackPayload.reject_reason = rejectReason ?? null;
    }

    const { error: fallbackErr } = await supabaseAdmin
      .from("verifications")
      .update(fallbackPayload)
      .eq("id", id)
      .select();

    if (fallbackErr) {
      console.error("verification status update fallback error:", fallbackErr);
      return NextResponse.json(
        { error: (fallbackErr as any)?.message || "更新に失敗しました" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    const status = e?.statusCode ?? 500;
    const msg = e?.message ?? "Unknown error";
    return NextResponse.json(
      { error: msg },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  }
}
