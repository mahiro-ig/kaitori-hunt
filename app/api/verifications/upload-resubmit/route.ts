// app/api/verifications/upload-resubmit/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);

// バケットを自動で用意（存在しなければ作成）
async function ensureBucket(name: string) {
  const { data: buckets, error: listErr } = await supabaseAdmin.storage.listBuckets();
  if (listErr) {
    console.error("[upload-resubmit] listBuckets error:", listErr.message);
    // list で失敗しても続行（後続の upload でまた分かる）
    return;
  }
  const exists = buckets?.some((b: any) => b.name === name);
  if (!exists) {
    const { error: createErr } = await supabaseAdmin.storage.createBucket(name, {
      public: false,
      fileSizeLimit: "25MB",
      allowedMimeTypes: ["image/jpeg", "image/png"],
    });
    if (createErr) {
      console.error(`[upload-resubmit] createBucket(${name}) error:`, createErr.message);
    } else {
      console.log(`[upload-resubmit] bucket '${name}' created`);
    }
  }
}

// 拡張子推定
function extOf(filename?: string, mime?: string) {
  if (filename && /\.\w+$/i.test(filename)) return filename.split(".").pop()!.toLowerCase();
  if (mime?.includes("jpeg")) return "jpg";
  if (mime?.includes("png")) return "png";
  return "jpg";
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await req.formData();
    const verifId = String(form.get("verifId") || "");
    if (!verifId) return NextResponse.json({ error: "verifId is required" }, { status: 400 });

    const front = form.get("front") as File | null;
    const selfie = form.get("selfie") as File | null;

    // 所有確認も兼ねて現状取得
    const { data: current, error: curErr } = await supabaseAdmin
      .from("verifications")
      .select("*")
      .eq("id", verifId)
      .single();

    if (curErr) {
      console.error("[upload-resubmit] select verifications error:", curErr.message);
      return NextResponse.json({ error: curErr.message }, { status: 400 });
    }

    // バケット存在確認（なければ作成）
    await ensureBucket("id-photos");
    await ensureBucket("face-captures");

    // アップロード（ArrayBuffer → Uint8Array を渡す）
    let id_photo_path: string | undefined;
    let face_path: string | undefined;

    if (front) {
      try {
        const ext = extOf(front.name, front.type);
        const key = `${verifId}/front.${ext}`;
        const bytes = await front.arrayBuffer();
        const fileBody = new Uint8Array(bytes);
        const { error: upErr } = await supabaseAdmin.storage
          .from("id-photos")
          .upload(key, fileBody, {
            upsert: true,
            contentType: front.type || "image/jpeg",
          });
        if (upErr) {
          console.error("[upload-resubmit] upload front error:", upErr.message);
          return NextResponse.json({ error: `front upload: ${upErr.message}` }, { status: 500 });
        }
        id_photo_path = key;
      } catch (e: any) {
        console.error("[upload-resubmit] front exception:", e?.message || e);
        return NextResponse.json({ error: `front exception: ${String(e?.message ?? e)}` }, { status: 500 });
      }
    }

    if (selfie) {
      try {
        const ext = extOf(selfie.name, selfie.type);
        const key = `${verifId}/selfie.${ext}`;
        const bytes = await selfie.arrayBuffer();
        const fileBody = new Uint8Array(bytes);
        const { error: upErr } = await supabaseAdmin.storage
          .from("face-captures")
          .upload(key, fileBody, {
            upsert: true,
            contentType: selfie.type || "image/jpeg",
          });
        if (upErr) {
          console.error("[upload-resubmit] upload selfie error:", upErr.message);
          return NextResponse.json({ error: `selfie upload: ${upErr.message}` }, { status: 500 });
        }
        face_path = key;
      } catch (e: any) {
        console.error("[upload-resubmit] selfie exception:", e?.message || e);
        return NextResponse.json({ error: `selfie exception: ${String(e?.message ?? e)}` }, { status: 500 });
      }
    }

    // DB 更新（どちらか送られていればそのカラムだけ更新）＋ ステータス resubmitted
    const updates: Record<string, any> = { status: "resubmitted" };
    if (typeof id_photo_path !== "undefined") updates.id_photo_path = id_photo_path;
    if (typeof face_path !== "undefined") updates.face_path = face_path;

    const { data: updated, error: updErr } = await supabaseAdmin
      .from("verifications")
      .update(updates)
      .eq("id", verifId)
      .select()
      .single();

    if (updErr) {
      console.error("[upload-resubmit] update verifications error:", updErr.message);
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    // 新しい署名URL（失敗しても致命ではない）
    let signedFront: string | null = null;
    let signedSelfie: string | null = null;

    if (updated?.id_photo_path) {
      const { data: f1, error: sErr1 } = await supabaseAdmin.storage
        .from("id-photos")
        .createSignedUrl(updated.id_photo_path, 60);
      if (sErr1) console.warn("[upload-resubmit] createSignedUrl front warn:", sErr1.message);
      signedFront = f1?.signedUrl ?? null;
    }
    if (updated?.face_path) {
      const { data: f2, error: sErr2 } = await supabaseAdmin.storage
        .from("face-captures")
        .createSignedUrl(updated.face_path, 60);
      if (sErr2) console.warn("[upload-resubmit] createSignedUrl selfie warn:", sErr2.message);
      signedSelfie = f2?.signedUrl ?? null;
    }

    return NextResponse.json({ data: updated, signedFront, signedSelfie }, { status: 200 });
  } catch (e: any) {
    console.error("[upload-resubmit] fatal:", e?.message || e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
