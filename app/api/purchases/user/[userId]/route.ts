// app/api/purchases/user/[userId]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type Params = { userId: string };

// ── purchase_method 正規化 ───────────────────────────────────────────
function normalizeMethod(val: unknown): "shipping" | "instore" | null {
  if (typeof val === "string") {
    const v = val.toLowerCase();
    if (v === "shipping") return "shipping";
    if (v === "instore" || v === "in_store" || v === "store") return "instore";
    if (/(mail|post|postal|delivery|shipment|courier|yuso|postage)/.test(v)) return "shipping";
    if (/(instore|in_store|store|walkin|walk_in|counter|shop|tentou|tenpo|来店|店頭)/.test(v)) return "instore";
  }
  if (typeof val === "number") {
    if (val === 1) return "shipping";
    if (val === 2) return "instore";
  }
  return null;
}

function inferMethodFromRecord(r: Record<string, any>): "shipping" | "instore" | null {
  const directKeys = [
    "purchase_method", "fulfillment_type", "method", "type", "channel", "mode", "order_type", "orderType",
  ];
  for (const k of directKeys) {
    if (k in r) {
      const n = normalizeMethod(r[k]);
      if (n) return n;
    }
  }
  if (typeof r.instore === "boolean" && r.instore) return "instore";
  if (typeof r.shipping === "boolean" && r.shipping) return "shipping";

  const hasAnyKey = (obj: any, keys: string[]) => !!obj && keys.some((k) => k in obj);

  const shippingHints = [
    "shipping_address","shippingAddress","recipient","recipient_name","postal_code","zip","address","address1","address2",
    "prefecture","city","label_url","tracking_number","shipment","delivery","is_postal","courier","pickup_requested","pickup_date",
  ];
  const storeHints = [
    "store_id","storeId","store_code","storeName","branch","counter","visit_date","dropoff_slot","dropoffTime","in_store","instore","walk_in",
  ];
  if (hasAnyKey(r, shippingHints)) return "shipping";
  if (hasAnyKey(r, storeHints)) return "instore";

  for (const k of ["meta", "metadata", "extra", "context", "detail"]) {
    const o = r[k];
    if (o && typeof o === "object") {
      for (const dk of directKeys) {
        if (dk in o) {
          const n = normalizeMethod(o[dk]);
          if (n) return n;
        }
      }
      if (hasAnyKey(o, shippingHints)) return "shipping";
      if (hasAnyKey(o, storeHints)) return "instore";
    }
  }
  return null;
}

// ── items の安全パース & variant_id 取得 ─────────────────────────────
function readItems(maybe: unknown): any[] {
  if (Array.isArray(maybe)) return maybe;
  if (typeof maybe === "string") {
    try {
      const arr = JSON.parse(maybe);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }
  return [];
}

function getVariantId(item: any): string | null {
  const raw = item?.variant_id ?? item?.variant?.id ?? null;
  if (raw == null) return null;
  return String(raw); // 文字列に統一（UUID/text 対応）
}

// ── Route ───────────────────────────────────────────────────────────
export async function GET(
  _request: Request,
  context: { params: Promise<Params> }
) {
  const { userId } = await context.params;
  const { authOptions } = (await import("@/lib/auth")) as any;
  const session = (await getServerSession(authOptions)) as any;

  if (!session?.user || session.user.id !== userId) {
    return NextResponse.json({ success: false, error: "権限エラー" }, { status: 403 });
  }

  // 1) リクエスト本体
  const { data: reqsData, error: reqErr } = await supabaseAdmin
    .from("buyback_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (reqErr) {
    console.error("buyback_requests取得エラー:", reqErr);
    return NextResponse.json({ success: false, error: reqErr.message }, { status: 500 });
  }

  const reqs: any[] = reqsData ?? [];

  // 2) 全 variant_id を抽出
  const allVariantIds = Array.from(
    new Set(
      reqs.flatMap((r) => readItems(r.items).map(getVariantId)).filter((v): v is string => !!v)
    )
  );

  // 3) バリアント取得（product_id まで）
  let variants: any[] = [];
  if (allVariantIds.length > 0) {
    const { data: variantData, error: variantErr } = await supabaseAdmin
      .from("product_variants")
      .select("id, color, capacity, product_id")
      .in("id", allVariantIds);

    if (variantErr) {
      console.error("product_variants取得エラー:", variantErr);
      return NextResponse.json({ success: false, error: variantErr.message }, { status: 500 });
    }
    variants = variantData ?? [];
  }

  // 4) プロダクト取得（名前・画像は product 側）
  let products: any[] = [];
  if (variants.length > 0) {
    const allProductIds = Array.from(new Set(variants.map((v) => v.product_id).filter(Boolean)));
    if (allProductIds.length > 0) {
      const { data: productData, error: productErr } = await supabaseAdmin
        .from("products")
        .select("id, name, image_url")
        .in("id", allProductIds as string[]);

      if (productErr) {
        console.error("products取得エラー:", productErr);
        return NextResponse.json({ success: false, error: productErr.message }, { status: 500 });
      }
      products = productData ?? [];
    }
  }

  // 5) マップ化（キーは文字列統一）
  const variantMap = new Map(variants.map((v) => [String(v.id), v]));
  const productMap = new Map(products.map((p) => [String(p.id), p]));

  // 6) レスポンス整形（★ snapshot_name を追加）
  const purchases = reqs.map((r) => {
    const methodNormalized =
      normalizeMethod(r.purchase_method) ??
      normalizeMethod(r.fulfillment_type) ??
      normalizeMethod(r.method) ??
      normalizeMethod(r.type) ??
      normalizeMethod(r.channel) ??
      (typeof r.instore === "boolean" && r.instore ? "instore" : null) ??
      (typeof r.shipping === "boolean" && r.shipping ? "shipping" : null) ??
      inferMethodFromRecord(r);

    const rawItems = readItems(r.items);

    const items = rawItems.map((item: any) => {
      const vId = getVariantId(item);
      const v = vId ? variantMap.get(String(vId)) ?? null : null;
      const p = v ? productMap.get(String(v.product_id)) ?? null : null;

      return {
        variant: v
          ? {
              id: v.id,
              color: v.color,
              capacity: v.capacity,
              product: p ? { id: p.id, name: p.name, image_url: p.image_url ?? null } : null,
            }
          : null,

        // ★ 注文時スナップショット名を返す（存在する最有力候補を順に）
        snapshot_name:
          item.product_name ??
          item.productTitle ??
          item.title ??
          item.name ??
          null,

        price: Number(item.price ?? 0),
        quantity: Number(item.quantity ?? 0),
      };
    });

    // 合計金額フォールバック
    const amountRaw = r.total_price ?? r.amount;
    const amount =
      typeof amountRaw === "number"
        ? amountRaw
        : items.reduce((sum: number, it: any) => sum + (it.price || 0) * (it.quantity || 0), 0);

    return {
      id: r.id,
      reservation_number: r.reservation_number ?? r.reservationNumber ?? r.id,
      items,
      amount,
      status: r.status,
      created_at: r.created_at,
      final_price: r.final_price ?? null,
      deduction_reason: r.deduction_reason ?? null,
      is_assessed: r.is_assessed ?? null,
      purchase_method: methodNormalized, // "shipping" | "instore" | null
    };
  });

  return NextResponse.json({ success: true, purchases }, { status: 200 });
}
