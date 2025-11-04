// @ts-nocheck
// app/api/cart/[id]/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = { id: string };

/**
 * カートアイテム数量更新 (ログイン必須)
 * 変更点:
 *  - updated_at を一切使わない（DBに存在しないため500を回避）
 *  - Next.js 15: params が Promise のため await を追加
 *  - 更新前に RPC `validate_cart_session(p_user_id uuid)` を呼んで 30分セッション検証
 *  - 期限切れは 409 を返却
 *  - レスポンスに Cache-Control: no-store を付与
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<Params> }
) {
  try {
    // params は Promise。必ず await する
    const { id } = await context.params;

    // 1) セッション取得
    const session = (await getServerSession(authOptions)) as any;
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "ログインが必要です" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }
    const userId = session.user.id as string;

    // 2) リクエストボディ
    let body: any = {};
    try {
      body = await request.json();
    } catch {}
    const quantity = Number(body?.quantity);

    if (!Number.isFinite(quantity) || quantity < 1) {
      return NextResponse.json(
        { error: "quantity は 1 以上の数値を指定してください" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 3) セッション有効性検証（30分ルール）
    const { data: validRes, error: validErr } = await supabaseAdmin.rpc(
      "validate_cart_session",
      { p_user_id: userId }
    );
    if (validErr) {
      console.error("[api/cart/[id]] validate_cart_session error:", validErr);
      return NextResponse.json(
        { error: "カートの検証に失敗しました" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }
    const isValid =
      Array.isArray(validRes) ? validRes[0]?.valid : (validRes as any)?.valid;
    if (!isValid) {
      return NextResponse.json(
        { error: "カートの有効期限が切れました。再度商品を追加してください。" },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 4) 数量更新（updated_at は指定しない）
    const { data: updatedItem, error } = await supabaseAdmin
      .from("cart_items")
      .update({ quantity })
      .eq("id", id)
      .eq("user_id", userId)
      .select("id, variant_id, color, capacity, quantity, created_at")
      .maybeSingle();

    if (error) {
      console.error("[api/cart/[id]] PATCH error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 見つからない（0件）場合
    if (!updatedItem) {
      return NextResponse.json(
        { error: "対象のカートアイテムが見つかりません" },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { success: true, item: updatedItem },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    console.error("[api/cart/[id]] PATCH unexpected error:", err);
    return NextResponse.json(
      { error: err?.message ?? "サーバー内部エラー" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

/**
 * カートアイテム削除 (ログイン必須)
 * 変更点:
 *  - Next.js 15: params が Promise のため await を追加
 *  - レスポンスに Cache-Control: no-store を付与
 *  - updated_at 非依存
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<Params> }
) {
  try {
    // params は Promise。必ず await する
    const { id } = await context.params;

    // 1) セッション取得
    const session = (await getServerSession(authOptions)) as any;
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "ログインが必要です" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }
    const userId = session.user.id as string;

    // 2) 削除
    const { error } = await supabaseAdmin
      .from("cart_items")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("[api/cart/[id]] DELETE error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    console.error("[api/cart/[id]] DELETE unexpected error:", err);
    return NextResponse.json(
      { error: err?.message ?? "サーバー内部エラー" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
