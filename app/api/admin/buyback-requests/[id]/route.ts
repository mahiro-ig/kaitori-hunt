// app/api/admin/buyback-requests/[id]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { SupabaseClient } from "@supabase/supabase-js";

/* ================================
   画像URL 正規化（環境変数に依存しない）
   ================================ */
function parseStoragePublicPath(raw: string) {
  // /storage/v1/object/public/<bucket>/<path> → { bucket, path }
  const m = raw.match(/^\/?storage\/v1\/object\/public\/([^/]+)\/(.+)$/i);
  if (m) return { bucket: m[1], path: m[2] };
  return null;
}

async function resolveImageUrl(
  supabase: SupabaseClient,
  urlOrPath: unknown,
  opts?: { preferSigned?: boolean; signedTTLSeconds?: number; diag?: boolean }
): Promise<{ url: string | null; diag?: Record<string, any> }> {
  const preferSigned = opts?.preferSigned ?? false;
  const signedTTL = opts?.signedTTLSeconds ?? 60 * 60 * 24 * 7; // 7日
  const wantDiag = !!opts?.diag;

  const diag: Record<string, any> = { input: urlOrPath };

  if (typeof urlOrPath !== "string" || urlOrPath.trim() === "") {
    return { url: null, diag: wantDiag ? { ...diag, reason: "empty" } : undefined };
  }
  const raw = urlOrPath.trim();

  // http(s) のフルURL
  if (/^https?:\/\//i.test(raw)) {
    return { url: raw, diag: wantDiag ? { ...diag, kind: "absolute" } : undefined };
  }

  // /storage/v1/object/public/<bucket>/<path>
  const pubParsed = parseStoragePublicPath(raw);
  if (pubParsed) {
    const from = supabase.storage.from(pubParsed.bucket);
    const { data: pub } = from.getPublicUrl(pubParsed.path);
    if (pub?.publicUrl) {
      return {
        url: pub.publicUrl,
        diag: wantDiag ? { ...diag, kind: "public-prefix", bucket: pubParsed.bucket, path: pubParsed.path } : undefined,
      };
    }
    if (preferSigned) {
      const { data: s } = await from.createSignedUrl(pubParsed.path, signedTTL);
      return {
        url: s?.signedUrl ?? null,
        diag: wantImgDiag ? { ...diag, kind: "public-prefix->signed", bucket: pubParsed.bucket, path: pubParsed.path } : undefined,
      };
    }
    return {
      url: null,
      diag: wantDiag ? { ...diag, kind: "public-prefix", bucket: pubParsed.bucket, path: pubParsed.path, error: "no public url" } : undefined,
    };
  }

  // /storage/v1/object/sign/... は相対だと扱わない
  if (/^\/?storage\/v1\/object\/sign\//i.test(raw)) {
    return { url: raw.startsWith("http") ? raw : null, diag: wantDiag ? { ...diag, kind: "signed-prefix" } : undefined };
  }

  // "bucket/path/to.jpg"
  const slash = raw.indexOf("/");
  if (slash > 0) {
    const bucket = raw.slice(0, slash);
    const path = raw.slice(slash + 1);
    const from = supabase.storage.from(bucket);

    if (preferSigned) {
      const { data } = await from.createSignedUrl(path, signedTTL);
      if (data?.signedUrl)
        return {
          url: data.signedUrl,
          diag: wantDiag ? { ...diag, kind: "bucket-path->signed", bucket, path } : undefined,
        };
    }
    const { data } = from.getPublicUrl(path);
    return { url: data?.publicUrl ?? null, diag: wantDiag ? { ...diag, kind: "bucket-path", bucket, path } : undefined };
  }

  // public/bucket/path
  const m = raw.match(/^public\/([^/]+)\/(.+)$/i);
  if (m) {
    const [, bucket, path] = m;
    const from = supabase.storage.from(bucket);
    const { data } = from.getPublicUrl(path);
    return { url: data?.publicUrl ?? null, diag: wantDiag ? { ...diag, kind: "public-bucket-path", bucket, path } : undefined };
  }

  return { url: null, diag: wantDiag ? { ...diag, reason: "unrecognized-format" } : undefined };
}

/* ================================
   認可ユーティリティ
   ================================ */
async function extractUidAndRole(req: Request): Promise<{ uid: string | null; role: string | null }> {
  try {
    const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET });
    const uidFromToken = (token?.sub as string) || (token as any)?.id || null;
    const roleFromToken = (token as any)?.role ?? null;
    if (uidFromToken || roleFromToken) return { uid: uidFromToken, role: roleFromToken };
  } catch (e) {
    console.warn("[assertIsAdmin] getToken failed:", (e as Error)?.message);
  }
  const session = await getServerSession(authOptions);
  const uidFromSession = (session?.user as any)?.id ?? null;
  const roleFromSession = (session?.user as any)?.role ?? null;
  return { uid: uidFromSession, role: roleFromSession };
}

async function assertIsAdmin(
  req: Request,
  supabase: SupabaseClient
): Promise<{ ok: boolean; userId?: string; reason?: string }> {
  const { uid, role } = await extractUidAndRole(req);
  if (!uid) return { ok: false, reason: "no-session" };
  if (role === "admin") return { ok: true, userId: uid };

  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id,id")
    .or(`user_id.eq.${uid},id.eq.${uid}`)
    .maybeSingle();

  if (error) {
    console.error("[assertIsAdmin] supabase error:", error);
    return { ok: false, userId: uid, reason: "db-error" };
  }
  if (!data) return { ok: false, userId: uid, reason: "not-admin" };
  return { ok: true, userId: uid };
}

/* ================================
   型・補助
   ================================ */
type RawItem =
  | {
      variant_id?: number | string | null;
      quantity?: number | string | null;
      price?: number | string | null;
      product_name?: string | null;
      jan_code?: string | null;
      image_url?: string | null;
      [key: string]: any;
    }
  | Record<string, any>;

type SafeItem = {
  variant_id: number | null;
  product_name: string | null;
  jan_code: string | null;
  color: string | null;
  capacity: string | null;
  buyback_price: number | null;
  image_url: string | null; // Storage の絶対URL
  quantity: number;
  price: number | null;
  _imgdiag?: Record<string, any>; // 診断モード用
};

function toNumberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
function toPositiveIntOrDefault(v: unknown, def = 1): number {
  const n = toNumberOrNull(v);
  if (n === null) return def;
  const i = Math.floor(n);
  return i > 0 ? i : def;
}
function safeParseItems(src: unknown): RawItem[] {
  try {
    if (src == null) return [];
    if (typeof src === "string") {
      const parsed = JSON.parse(src);
      return Array.isArray(parsed) ? parsed : [];
    }
    if (Array.isArray(src)) return src as RawItem[];
    return [];
  } catch {
    return [];
  }
}
function pickOrderUnitPrice(it: Record<string, any>): number | null {
  const keys = ["price", "order_price", "buy_price", "unit_price_at_order", "base_price_at_order", "agreed_unit_price"];
  for (const k of keys) {
    const v = it?.[k];
    if (v === null || typeof v === "undefined" || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/* ================================
   GET
   ================================ */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const u = new URL(req.url);

    // 診断モード
    if (u.searchParams.get("diag") === "1") {
      const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET });
      const session = await getServerSession(authOptions);
      let head: any = null, err: any = null;
      try {
        const { data, error } = await supabase.from("admin_users").select("user_id,id").limit(10);
        head = data; err = error?.message ?? null;
      } catch (e: any) { err = e?.message ?? String(e); }
      return NextResponse.json(
        {
          note: "diag mode",
          token_sub: token?.sub ?? null,
          token_role: (token as any)?.role ?? null,
          session_user_id: (session?.user as any)?.id ?? null,
          session_role: (session?.user as any)?.role ?? null,
          admin_users_head: head,
          admin_users_error: err,
          env_nextauth_secret_present: !!process.env.NEXTAUTH_SECRET,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // 認可
    const admin = await assertIsAdmin(req, supabase);
    if (!admin.ok) {
      return NextResponse.json(
        { error: admin.reason === "not-admin" ? "Forbidden" : "Unauthorized", detail: admin.reason ?? null },
        { status: admin.reason === "not-admin" ? 403 : 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { id } = params;

    // 申込本体 + ユーザー
    const { data: reqData, error: reqErr } = await supabase
      .from("buyback_requests")
      .select(`
        id,
        reservation_number,
        items,
        total_price,
        status,
        user_id,
        created_at,
        updated_at,
        purchase_method,
        user:user_id (
          id,
          name,
          email,
          phone,
          address,
          postal_code,
          bank_name,
          branch_name,
          account_type,
          account_number,
          account_name
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (reqErr) {
      return NextResponse.json({ error: reqErr.message }, { status: 500, headers: { "Cache-Control": "no-store" } });
    }
    if (!reqData) {
      return NextResponse.json({ error: "Record not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    const {
      id: reqId,
      reservation_number,
      items: itemsSrc,
      total_price,
      status: statusRow,
      user_id,
      created_at,
      updated_at,
      purchase_method,
      user,
    } = reqData as any;

    // Items 正規化（item.image_urlは見ない：要件どおり products.image_url を使う）
    const rawItems = safeParseItems(itemsSrc);
    const normalizedRawItems = rawItems.map((it) => {
      const r = it as Record<string, any>;
      const variant_id = toNumberOrNull(r.variant_id);
      const quantity = toPositiveIntOrDefault(r.quantity, 1);
      const price = pickOrderUnitPrice(r);
      const product_name = typeof r.product_name === "string" ? r.product_name : null;
      const jan_code = typeof r.jan_code === "string" ? r.jan_code : null;
      return { variant_id, quantity, price, product_name, jan_code };
    });

    const variantIds: number[] = Array.from(
      new Set(normalizedRawItems.map((it) => it.variant_id).filter((v): v is number => v !== null))
    );

    // variants → product(image_url) 取得
    let variants:
      | Array<{
          id: number;
          product_id: string | null;
          jan_code: string | null;
          color: string | null;
          capacity: string | null;
          buyback_price: number | null;
          product: { id: string; name: string | null; image_url: string | null } | null;
        }>
      | [] = [];

    if (variantIds.length > 0) {
      const { data: vData, error: vErr } = await supabase
        .from("product_variants")
        .select(
          `
          id,
          product_id,
          jan_code,
          color,
          capacity,
          buyback_price,
          product:products (
            id,
            name,
            image_url
          )
        `
        )
        .in("id", variantIds);

      if (vErr) console.warn("[buyback-requests/:id] variants fetch warning:", vErr.message);
      variants = (vData ?? []) as typeof variants;
    }

    const variantMap = new Map<number, (typeof variants)[number]>(variants.map((v) => [Number(v.id), v]));

    // 診断ONなら ?imgdiag=1
    const wantImgDiag = u.searchParams.get("imgdiag") === "1";

    // items ← product.image_url を Storage 公開URLに正規化
    const items: SafeItem[] = await Promise.all(
      normalizedRawItems.map(async (it) => {
        const v = it.variant_id != null ? variantMap.get(Number(it.variant_id)) ?? null : null;
        const p = v?.product ?? null;

        const product_name = it.product_name ?? (p?.name ?? null);
        const rawProductImage = p?.image_url ?? null;

        const { url: resolvedImage, diag } = await resolveImageUrl(supabase, rawProductImage, { diag: wantImgDiag });

        const jan_code = it.jan_code ?? (v?.jan_code ?? null);

        const base: SafeItem = {
          variant_id: it.variant_id ?? null,
          product_name,
          jan_code,
          color: v?.color ?? null,
          capacity: v?.capacity ?? null,
          buyback_price: typeof v?.buyback_price === "number" ? v!.buyback_price : null,
          image_url: resolvedImage,
          quantity: it.quantity,
          price: it.price,
        };

        if (wantImgDiag) {
          base._imgdiag = { rawProductImage, resolvedImage, ...diag };
        }
        return base;
      })
    );

    // 本人確認
    let verification_status: string | null = null;
    if (user_id != null) {
      const { data: verifData, error: verErr } = await supabase
        .from("verifications")
        .select("status")
        .eq("user_id", user_id as any)
        .maybeSingle();
      if (verErr) console.warn("[buyback-requests/:id] verifications fetch warning:", verErr.message);
      verification_status = (verifData as any)?.status ?? null;
    }

    // 履歴（新旧カラム両対応：エラー時のみフォールバック）
    let histories:
      | Array<{
          id: string | number;
          previous_status: string | null;
          new_status: string | null;
          changed_at: string;
        }>
      | [] = [];

    const { data: hist1, error: histErr1 } = await supabase
      .from("purchase_status_history")
      .select("id, previous_status, new_status, changed_at")
      .eq("buyback_request_id", id)
      .order("changed_at", { ascending: true });

    if (histErr1) {
      const { data: hist2, error: histErr2 } = await supabase
        .from("purchase_status_history")
        .select("id, previous_status, new_status, changed_at")
        .eq("request_id", id)
        .order("changed_at", { ascending: true });

      if (histErr2) console.warn("[buyback-requests/:id] history fetch warning:", histErr2.message);
      histories = (hist2 ?? []) as typeof histories;
    } else {
      histories = (hist1 ?? []) as typeof histories;
    }

    return NextResponse.json(
      {
        request: {
          id: reqId,
          reservation_number,
          items,
          total_price,
          status: statusRow,
          user_id,
          created_at,
          updated_at,
          purchase_method,
          user,
          verification_status,
        },
        histories,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    const status = e?.statusCode ?? 500;
    const msg = e?.message ?? "Unknown error";
    return NextResponse.json({ error: msg }, { status, headers: { "Cache-Control": "no-store" } });
  }
}

const ALLOWED_STATUSES = new Set([
  "申込受付",
  "査定開始",
  "査定中",
  "査定完了",
  "入金処理",
  "入金完了",
  "キャンセル済み",
]);

/* ================================
   PATCH
   ================================ */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();

    const admin = await assertIsAdmin(req, supabase);
    if (!admin.ok) {
      return NextResponse.json(
        { message: admin.reason === "not-admin" ? "Forbidden" : "Unauthorized" },
        { status: admin.reason === "not-admin" ? 403 : 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { id } = params;

    const body = await req.json().catch(() => ({} as any));
    const status = typeof body?.status === "string" ? (body.status as string) : undefined;
    const note = typeof body?.note === "string" ? (body.note as string) : undefined;

    if (typeof status === "undefined" && (typeof note === "undefined" || note.trim() === "")) {
      return NextResponse.json({ success: true, noop: true }, { headers: { "Cache-Control": "no-store" } });
    }

    const { data: prevRow, error: prevErr } = await supabase
      .from("buyback_requests")
      .select("status")
      .eq("id", id)
      .maybeSingle();

    if (prevErr || !prevRow) {
      return NextResponse.json(
        { message: "Failed to fetch previous status", detail: prevErr?.message ?? null },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (typeof status !== "undefined" && !ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ message: `Invalid status: ${status}` }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    if (typeof status !== "undefined" && status !== prevRow.status) {
      const { error: updErr } = await supabase
        .from("buyback_requests")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (updErr) {
        return NextResponse.json({ message: "更新に失敗しました", detail: updErr.message }, { status: 500, headers: { "Cache-Control": "no-store" } });
      }
    }

    if ((typeof status !== "undefined" && status !== prevRow.status) || (note && note.trim() !== "")) {
      const nowIso = new Date().toISOString();
      const basePayload = {
        previous_status: prevRow.status,
        new_status: typeof status !== "undefined" ? status : prevRow.status,
        changed_at: nowIso,
      };

      const tryInsert = async (col: "buyback_request_id" | "request_id") => {
        const { error } = await supabase.from("purchase_status_history").insert([{ [col]: id, ...basePayload } as any]);
        return error;
      };

      let err = await tryInsert("buyback_request_id");
      if (err) {
        err = await tryInsert("request_id");
        if (err) console.warn("purchase_status_history insert failed (ignored):", err.message);
      }
    }

    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    const status = e?.statusCode ?? 500;
    const msg = e?.message ?? "Internal Server Error";
    console.error("PATCH /admin/buyback-requests/[id] fatal:", e);
    return NextResponse.json({ message: msg, detail: e?.detail ?? null }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
