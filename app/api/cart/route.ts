// app/api/cart/route.ts
// @ts-nocheck

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 共通: キャッシュ完全無効 & Cookie 単位で分岐 */
function noStore(json: any, init?: ResponseInit) {
  const baseHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    Pragma: "no-cache",
    Expires: "0",
    Vary: "Cookie",
  };
  const headers = { ...baseHeaders, ...(init?.headers ?? {}) };
  return NextResponse.json(json, { ...init, headers });
}

/**
 * カート取得 (ログイン必須)
 * - セッション未確定時は 401 を返す（空配列で 200 を返さない）
 * - キャッシュ完全無効 / Vary: Cookie
 */
export async function GET(_request: Request) {
  try {
    const session = (await getServerSession(authOptions)) as any;

    if (!session?.user?.id) {
      // 401で返すことで「未確定時の空配列キャッシュ」を防止
      return noStore(
        { error: "Unauthorized", items: [] },
        { status: 401, headers: { "Retry-After": "0" } }
      );
    }
    const userId = session.user.id;

    const { data: rows, error } = await supabaseAdmin
      .from("cart_items")
      .select(`
        id,
        quantity,
        created_at,
        variant:product_variants (
          id,
          color,
          capacity,
          buyback_price,
          product:products (
            id,
            name,
            description,
            max_buyback_price,
            category,
            image_url
          )
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[api/cart] GET supabase error:", error);
      return noStore({ items: [] }, { status: 500 });
    }

    const items = (rows || []).map((row) => {
      const pv = row.variant!;
      const prod = pv.product!;
      return {
        id: row.id,
        quantity: row.quantity,
        variant: {
          id: pv.id,
          color: pv.color,
          capacity: pv.capacity,
          buyback_price: pv.buyback_price,
        },
        product: {
          id: prod.id,
          name: prod.name,
          description: prod.description,
          max_buyback_price: prod.max_buyback_price,
          category: prod.category,
        },
        imageUrl: prod.image_url || "",
      };
    });

    return noStore({ items }, { status: 200 });
  } catch (err: any) {
    console.error("[api/cart] GET unexpected error:", err);
    return noStore({ items: [] }, { status: 500 });
  }
}

/**
 * カート追加／数量マージ (ログイン必須)
 * - 30分セッション作成/再利用: rpc('create_or_get_cart_session')
 * - 在庫ホールド＋数量加算: rpc('add_item_with_hold')
 * - variantId を bigint に明示対応 / capacity=null の厳密比較
 */
export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions)) as any;
    if (!session?.user?.id) {
      return noStore({ error: "ログインが必要です" }, { status: 401, headers: { "Retry-After": "0" } });
    }
    const userId = session.user.id;
    const userName = session.user.name ?? "";
    const userEmail = session.user.email ?? "";

    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    const {
      variantId,
      color,
      capacity,
      quantity = 1,
      phone,
      postal_code,
      address,
      bank_name,
      branch_name,
      account_type,
      account_number,
      account_name,
    }: {
      variantId: string | number;
      color: string;
      capacity: string | null;
      quantity?: number;
      phone?: string;
      postal_code?: string;
      address?: string;
      bank_name?: string;
      branch_name?: string;
      account_type?: string;
      account_number?: string;
      account_name?: string;
    } = body ?? {};

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 1) {
      return noStore({ error: "quantity は 1 以上の数値を指定してください" }, { status: 400 });
    }
    if (!color) {
      return noStore({ error: "color を指定してください" }, { status: 400 });
    }
    const variantIdNum = Number(variantId);
    if (!Number.isFinite(variantIdNum)) {
      return noStore({ error: "variantId が不正です" }, { status: 400 });
    }

    // users upsert（失敗しても継続）
    try {
      await supabaseAdmin
        .from("users")
        .upsert(
          {
            id: userId,
            name: userName,
            email: userEmail,
            phone,
            postal_code,
            address,
            bank_name,
            branch_name,
            account_type,
            account_number,
            account_name,
          },
          { onConflict: "id" }
        );
    } catch (err) {
      console.warn("[api/cart] POST users upsert warn:", err);
    }

    // 30分セッションの取得/作成
    const { error: sessErr } = await supabaseAdmin.rpc(
      "create_or_get_cart_session",
      { p_user_id: userId }
    );
    if (sessErr) {
      console.error("[api/cart] POST create_or_get_cart_session error:", sessErr);
      return noStore({ error: "カートの初期化に失敗しました" }, { status: 500 });
    }

    // 在庫ホールド付きでカート追加（延長なし）
    const { error: addErr } = await supabaseAdmin.rpc("add_item_with_hold", {
      p_user_id: userId,
      p_variant_id: variantIdNum,
      p_color: color,
      p_capacity: capacity ?? "", // RPC仕様に合わせて空文字→NULL等
      p_qty: qty,
    });

    if (addErr) {
      const msg = addErr.message || "追加に失敗しました";
      const isExpired = msg.includes("cart expired");
      const isHeld =
        msg.includes("duplicate key") || msg.includes("violates unique constraint");
      console.error("[api/cart] POST add_item_with_hold error:", addErr);

      return noStore(
        {
          error: isExpired
            ? "カートの有効期限が切れました。再度追加してください。"
            : isHeld
            ? "他のユーザーにより在庫が一時確保されています。"
            : msg,
        },
        { status: 409 }
      );
    }

    // 直後の最新1行を返す（capacity=null の厳密比較）
    let query = supabaseAdmin
      .from("cart_items")
      .select("id, quantity, variant_id, color, capacity, created_at")
      .eq("user_id", userId)
      .eq("variant_id", variantIdNum)
      .eq("color", color);

    if (capacity == null) {
      query = query.is("capacity", null);
    } else {
      query = query.eq("capacity", capacity);
    }

    const { data: newItem, error: fetchErr } = await query
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchErr) {
      console.warn("[api/cart] POST fetch inserted item warn:", fetchErr);
      return noStore({ success: true }, { status: 200 });
    }

    return noStore({ success: true, item: newItem }, { status: 200 });
  } catch (err: any) {
    console.error("[api/cart] POST unexpected error:", err);
    return noStore({ error: err?.message ?? "サーバー内部エラー" }, { status: 500 });
  }
}

/**
 * カート全削除 (ログイン必須)
 * - セッション＋ホールド＋cart_items を一括解放: rpc('release_cart_session')
 */
export async function DELETE() {
  try {
    const session = (await getServerSession(authOptions)) as any;
    if (!session?.user?.id) {
      return noStore({ error: "ログインが必要です" }, { status: 401, headers: { "Retry-After": "0" } });
    }
    const userId = session.user.id;

    const { error } = await supabaseAdmin.rpc("release_cart_session", {
      p_user_id: userId,
    });

    if (error) {
      console.error("[api/cart] DELETE release_cart_session error:", error);
      return noStore({ error: error.message }, { status: 500 });
    }

    return noStore({ success: true, message: "カートを空にしました" }, { status: 200 });
  } catch (err: any) {
    console.error("[api/cart] DELETE unexpected error:", err);
    return noStore({ error: err?.message ?? "サーバー内部エラー" }, { status: 500 });
  }
}
