// app/api/buyback/request/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendBuybackSubmittedEmail } from "@/lib/send-buyback-submitted-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CartItemPayload = {
  variant: { id: string; buyback_price: number };
  quantity: number;
};

type PurchaseMethod = "shipping" | "instore";

type BodyPayload = {
  cartItems: CartItemPayload[];
  totalPrice: number; // 受け取るが保存値はサーバー再計算
  purchaseMethod?: PurchaseMethod | string;
};

// ── 営業時間（JST）──────────────────────────────────────────────
const BUSINESS_HOURS_BY_WEEKDAY: Record<
  number,
  | {
      openHour: number;
      openMinute?: number;
      closeHour: number;
      closeMinute?: number;
    }
  | null
> = {
  0: null, // Sun
  1: { openHour: 10, closeHour: 18 },
  2: { openHour: 10, closeHour: 18 },
  3: { openHour: 10, closeHour: 18 },
  4: { openHour: 10, closeHour: 18 },
  5: { openHour: 10, closeHour: 18 },
  6: { openHour: 10, closeHour: 17 }, // Sat
};

function formatRange(h: { openHour: number; openMinute?: number; closeHour: number; closeMinute?: number }) {
  const om = h.openMinute ?? 0;
  const cm = h.closeMinute ?? 0;
  const z2 = (n: number) => String(n).padStart(2, "0");
  return `${z2(h.openHour)}:${z2(om)}–${z2(h.closeHour)}:${z2(cm)}`;
}

function isWithinBusinessHoursNowInTokyo(): { ok: boolean; todayHoursLabel: string | null } {
  const nowUtc = new Date();
  const tokyoMs = nowUtc.getTime() + 9 * 60 * 60 * 1000;
  const nowTokyo = new Date(tokyoMs);
  const weekday = nowTokyo.getUTCDay();
  const hours = BUSINESS_HOURS_BY_WEEKDAY[weekday];
  if (!hours) return { ok: false, todayHoursLabel: null };
  const y = nowTokyo.getUTCFullYear();
  const m = nowTokyo.getUTCMonth();
  const d = nowTokyo.getUTCDate();
  const open = new Date(Date.UTC(y, m, d, hours.openHour, hours.openMinute ?? 0, 0));
  const close = new Date(Date.UTC(y, m, d, hours.closeHour, hours.closeMinute ?? 0, 0));
  const ok = nowTokyo >= open && nowTokyo <= close;
  return { ok, todayHoursLabel: formatRange(hours) };
}

export async function POST(request: Request) {
  // 1) 認証
  const session = (await getServerSession(authOptions)) as Session | null;
  const userId = (session as any)?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { error: "認証が必要です" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  // 2) 入力
  let body: BodyPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "不正なリクエスト" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { cartItems, totalPrice } = body ?? {};
  if (!Array.isArray(cartItems)) {
    return NextResponse.json(
      { error: "cartItems が不正です" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
  if (cartItems.length === 0) {
    return NextResponse.json(
      { error: "カートが空です" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  // 3) 買取方法
  const methodRaw = (body.purchaseMethod ?? "shipping").toString().trim().toLowerCase();
  const purchaseMethod: PurchaseMethod = methodRaw === "instore" ? "instore" : "shipping";

  // 4) 店頭は営業時間チェック
  if (purchaseMethod === "instore") {
    const { ok, todayHoursLabel } = isWithinBusinessHoursNowInTokyo();
    if (!ok) {
      const message = todayHoursLabel
        ? `店頭買取の申込は本日の営業時間内（${todayHoursLabel}）のみ受付可能です。営業時間内に再度お試しください。`
        : "本日は店頭買取の受付を行っていません。営業日にお申し込みください。";
      return NextResponse.json(
        { error: message },
        { status: 422, headers: { "Cache-Control": "no-store" } }
      );
    }
  }

  // 5) items 整形 & バリデーション（DB保存用）
  const items = cartItems.map((item) => ({
    variant_id: String(item?.variant?.id ?? ""),
    quantity: Number(item?.quantity),
    price: Number(item?.variant?.buyback_price),
  }));

  const invalid = items.some(
    (i) =>
      !i.variant_id ||
      !Number.isFinite(i.price) ||
      !Number.isInteger(i.quantity) ||
      i.quantity <= 0 ||
      i.price < 0
  );
  if (invalid) {
    return NextResponse.json(
      { error: "明細が不正です" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  // 6) 合計はサーバーで再計算
  const serverTotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
  if (!Number.isFinite(serverTotal)) {
    return NextResponse.json(
      { error: "合計計算に失敗しました" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
  // クライアント送信値との差分はログに出さない（サーバー値を採用）

  // 7) INSERT → reservation_number を RETURNING
  try {
    const { data, error } = await supabaseAdmin
      .from("buyback_requests")
      .insert([
        {
          user_id: userId,
          items, // JSONとして保存
          total_price: serverTotal, // サーバー再計算値
          status: "pending",
          purchase_method: purchaseMethod,
        },
      ])
      .select("id, reservation_number")
      .single();

    if (error) {
      // エラー内容はログ出力しない（内部監視に任せる）
      return NextResponse.json(
        { error: "サーバーエラー", stage: "insert_buyback_requests" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 8) メール用の表示名構築（失敗してもPIIをログ出力しない）
    let itemsForMail: Array<{ name: string; qty: number }> = [];
    try {
      const variantIds = Array.from(new Set(items.map((i) => i.variant_id)));

      const { data: variants } = await supabaseAdmin
        .from("product_variants")
        .select("id, product_id, color, capacity")
        .in("id", variantIds);

      const productIdSet = new Set<string>();
      for (const v of variants ?? []) {
        if (v?.product_id) productIdSet.add(String(v.product_id));
      }
      const productIds = Array.from(productIdSet);

      const productNameMap = new Map<string, string>();
      if (productIds.length > 0) {
        const { data: products } = await supabaseAdmin
          .from("products")
          .select("id, name")
          .in("id", productIds);

        for (const p of products ?? []) {
          if (p?.id) productNameMap.set(String(p.id), String(p.name ?? ""));
        }
      }

      itemsForMail = items.map((it) => {
        const v = (variants ?? []).find((x) => String(x.id) === String(it.variant_id));
        const baseName = v?.product_id ? productNameMap.get(String(v.product_id)) : undefined;

        const parts: string[] = [];
        if (baseName && baseName.trim()) parts.push(baseName.trim());
        if ((v as any)?.color) parts.push(String((v as any).color));
        if ((v as any)?.capacity) parts.push(String((v as any).capacity));

        const displayName = parts.length > 0 ? parts.join(" / ") : `商品ID ${it.variant_id}`;

        return { name: displayName, qty: it.quantity };
      });
    } catch {
      // 失敗時フォールバック（ログしない）
      itemsForMail = items.map((it) => ({
        name: `商品ID ${it.variant_id}`,
        qty: it.quantity,
      }));
    }

    // 9) 申込確認メール送信（ログに宛先や番号を出さない）
    try {
      const reservationNumber: string =
        (data as any)?.reservation_number ?? `RSV-${Date.now()}`;

      await sendBuybackSubmittedEmail({
        to: (session as any)?.user?.email!,
        requestNumber: reservationNumber,
        method: purchaseMethod,
        customerName: (session as any)?.user?.name ?? null,
        items: itemsForMail,
      });
    } catch {
      // メール失敗でも申込は成立させる（ログしない）
    }

    // 10) 応答（ログ出力しない）
    const reservationNumber: string =
      (data as any)?.reservation_number ?? `RSV-${Date.now()}`;

    const payload = {
      success: true,
      request: {
        id: (data as any)?.id ?? null,
        reservation_number: reservationNumber,
      },
    };

    return NextResponse.json(payload, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    // 例外詳細は出さない
    return NextResponse.json(
      { error: "サーバーエラー", stage: "unhandled_exception" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
